#!/usr/bin/env python3
"""End-to-end evidence check using a disposable migrated DB and local mock mail server.
Run after package: python3 scripts/test-payment-evidence.py
Requires container ccadro-evidence-review, database ccadro_review, V001..V027 applied.
Never contacts a real email provider or modifies the application database.
"""
import base64
import hashlib
import hmac
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
import zipfile
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent.parent
ADMIN = {"X-Auth-Username": "review_customer", "X-Auth-Email": "review@example.com", "X-Auth-Scope": "ROLE_ADMIN"}
processes = []
handles = []
messages = []
provider_attempts = {}


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class Provider(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        assert self.path == "/v3/smtp/email"
        if self.headers.get("Transfer-Encoding", "").lower() == "chunked":
            chunks = []
            while True:
                size = int(self.rfile.readline().split(b";", 1)[0], 16)
                if not size:
                    while self.rfile.readline() != b"\r\n":
                        pass
                    break
                chunks.append(self.rfile.read(size))
                self.rfile.read(2)
            body = b"".join(chunks)
        else:
            body = self.rfile.read(int(self.headers["Content-Length"]))
        payload = json.loads(body)
        messages.append(payload)
        key = payload["headers"]["idempotencyKey"]
        provider_attempts[key] = provider_attempts.get(key, 0) + 1
        # Exercise durable retry after a provider refusal (not an ambiguous timeout).
        self.send_response(503 if provider_attempts[key] == 1 else 201)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"messageId": "<review-local-provider>"}).encode())


def request(port, path, data=None, headers=None, method=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", data=body,
                                 headers={"Content-Type": "application/json", **(headers or {})}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as ex:
        return ex.code, json.load(ex)


def await_health(port):
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        try:
            if request(port, "/actuator/health")[0] == 200:
                return
        except (OSError, ValueError):
            pass
        if any(proc.poll() is not None for proc in processes):
            raise RuntimeError("Review service exited; inspect /tmp/ccadro-*-review.log")
        time.sleep(0.5)
    raise TimeoutError("Review service startup timed out")


def launch(service, port, env, *args):
    log = open(f"/tmp/ccadro-{service}-review.log", "w")
    handles.append(log)
    jar_root = Path(os.environ.get("CCADRO_REVIEW_JAR_ROOT", str(ROOT / "backend")))
    jar = jar_root / service / "target" / f"{service}-0.1.0-SNAPSHOT.jar"
    processes.append(subprocess.Popen(["java", "-Xmx256m", "-jar", str(jar), f"--server.port={port}", *args],
                                      env=env, stdout=log, stderr=subprocess.STDOUT))
    await_health(port)


def main():
    db_port = subprocess.check_output(["docker", "port", "ccadro-evidence-review", "5432/tcp"], text=True).strip().split(":")[-1]
    provider = ThreadingHTTPServer(("127.0.0.1", 0), Provider)
    threading.Thread(target=provider.serve_forever, daemon=True).start()
    payment_port, email_port = free_port(), free_port()
    fixture = "REVIEW_" + uuid.uuid4().hex[:10]
    env = {**os.environ, "DB_HOST": "127.0.0.1", "DB_PORT": db_port, "DB_NAME": "ccadro_review",
           "DB_USER": "ccadro", "DB_PASSWORD": "evidence-review-only", "CCADRO_INTERNAL_TOKEN": "isolated-review-token",
           "CCADRO_EMAIL_MODE": "LIVE", "CCADRO_BREVO_API_KEY": "local-test-key",
           "CCADRO_BREVO_URL": f"http://127.0.0.1:{provider.server_port}",
           "NOTIFICATION_SERVICE_URL": f"http://127.0.0.1:{email_port}",
           "CCADRO_PAYMENT_WEBHOOK_SECRET": "local-payment-review-secret", "CCADRO_EVIDENCE_RETRY_SECONDS": "1",
           "CCADRO_LEGAL_NAME": "CCADRO TEST ONLY", "CCADRO_LEGAL_TAX_CODE": "TEST-NOT-A-TAX-ID",
           "CCADRO_LEGAL_ADDRESS": "Disposable integration environment", "CCADRO_LEGAL_SUPPORT_EMAIL": "review@example.com"}
    # Keep test infrastructure independent of the developer's Spring overrides.
    for key in list(env):
        if key.startswith("SPRING_DATASOURCE_"):
            del env[key]
    try:
        launch("notification-service", email_port, env, "--spring.kafka.listener.auto-startup=false", "--ccadro.payment-email.poll-ms=200")
        launch("payment-service", payment_port, env, "--ccadro.evidence.poll-ms=200")
        status, contract = request(payment_port, "/api/v1/contracts", {
            "customerId": fixture, "customerName": "Review customer", "shipmentCode": fixture,
            "contractType": "SPOT_TRIP", "contractValueVnd": 100000, "autoSign": True,
            "signedByCustomerUser": "review_customer"}, ADMIN)
        assert status in (200, 201), (status, contract)
        status, payment = request(payment_port, "/api/v1/payments", {
            "shipmentCode": fixture, "customerId": fixture, "customerName": "Review customer",
            "baseFreightVnd": 100000, "powertrainType": "DIESEL", "paymentMethod": "VNPAY_QR",
            "receiptEmail": "spoofed@example.com", "createdByUsername": "spoofed", "instantConfirm": False}, ADMIN)
        assert status == 201, (status, payment)
        tx = payment["result"]
        code = tx["transactionCode"]
        assert tx["paymentStatus"] == "PENDING"
        status, _ = request(payment_port, f"/api/v1/payments/{code}/confirm", {}, {**ADMIN, "X-Auth-Scope": "ROLE_CUSTOMER"})
        assert status == 403
        callback = {"transactionCode": code, "paidAmountVnd": tx["totalAmountVnd"], "gatewayReference": "LOCAL-PROVIDER-REVIEW"}
        callback["signature"] = hmac.new(b"local-payment-review-secret", f"{code}|{tx['totalAmountVnd']}".encode(), hashlib.sha256).hexdigest()
        status, result = request(payment_port, "/api/v1/payments/webhook/VNPAY", callback)
        assert status == 200 and result["result"]["paymentStatus"] == "PAID", (status, result)
        assert request(payment_port, "/api/v1/payments/webhook/VNPAY", callback)[0] == 200
        status, _ = request(payment_port, f"/api/v1/payments/{code}/evidence", headers={**ADMIN, "X-Auth-Username": "another_user", "X-Auth-Scope": "ROLE_CUSTOMER"})
        assert status == 403
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            status, result = request(payment_port, f"/api/v1/payments/{code}/evidence", headers=ADMIN)
            assert status == 200, (status, result)
            evidence = result["result"]
            if evidence.get("emailDelivery", {}).get("status") == "PROVIDER_ACCEPTED":
                break
            time.sleep(0.4)
        else:
            raise AssertionError(f"Email never accepted: {result}")
        sent = [message for message in messages if code in message["subject"]]
        assert len(sent) == 2, "Provider refusal must be retried once; duplicate callback must not send again"
        assert sent[0]["headers"]["idempotencyKey"] == sent[1]["headers"]["idempotencyKey"]
        assert sent[-1]["to"][0]["email"] == "review@example.com"
        archive = zipfile.ZipFile(io.BytesIO(base64.b64decode(sent[-1]["attachment"][0]["content"])))
        snapshot = archive.read("evidence.json")
        html = archive.read("confirmation.html")
        assert hashlib.sha256(snapshot).hexdigest() == evidence["snapshot_sha256"]
        assert hashlib.sha256(html).hexdigest() == evidence["html_sha256"]
        assert snapshot.decode() == evidence["snapshot_json"]
        data = json.loads(snapshot)
        assert data["payment"]["ownerUsername"] == "review_customer"
        assert data["contract"]["contractNumber"] == contract["result"]["contractNumber"]
        assert data["payment"]["confirmationSource"] == "VERIFIED_WEBHOOK"
        sql = f"UPDATE payment_evidence SET snapshot_json='tampered' WHERE transaction_code='{code}'"
        mutation = subprocess.run(["docker", "exec", "ccadro-evidence-review", "psql", "-U", "ccadro", "-d", "ccadro_review", "-v", "ON_ERROR_STOP=1", "-c", sql], capture_output=True)
        assert mutation.returncode != 0 and b"immutable" in mutation.stderr
        assert request(payment_port, f"/api/v1/payments/{code}/evidence", headers=ADMIN)[1]["result"]["snapshot_sha256"] == evidence["snapshot_sha256"]
        print("PASS: paid webhook, duplicate callback, recipient binding, permission checks, durable retry, provider acceptance, ZIP checksums and immutable PostgreSQL evidence")
    finally:
        for proc in reversed(processes):
            proc.terminate()
        for proc in processes:
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
        provider.shutdown()
        for handle in handles:
            handle.close()


if __name__ == "__main__":
    main()
