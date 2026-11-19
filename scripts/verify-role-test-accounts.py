#!/usr/bin/env python3
"""Read-only access checks plus login/logout against a loopback development gateway."""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

base = os.environ.get('CCADRO_TEST_GATEWAY', 'http://127.0.0.1:8888').rstrip('/')
parsed = urllib.parse.urlparse(base)
if parsed.hostname not in ('127.0.0.1', 'localhost', '::1') or parsed.username or parsed.password:
    raise SystemExit('Only loopback development/test gateways are supported.')
roles = ('ADMIN', 'DISPATCHER', 'DRIVER', 'SAFETY_MANAGER', 'ESG_AUDITOR',
         'CUSTOMER', 'SHIPPER', 'HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR')


def request(path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(base + path, headers=headers,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, {}


failures = []
for role in roles:
    username = role.lower()
    status, response = request('/api/v1/auth/token', {'username': username, 'password': '123'})
    auth = response.get('result', {})
    token = auth.get('token')
    valid = status == 200 and auth.get('role') == role and bool(token)
    if token:
        me_status, _ = request('/api/v1/users/me', token=token)
        valid = valid and me_status == 200
        request('/api/v1/auth/logout', {'token': token}, token=token)
        revoked_status, _ = request('/api/v1/users/me', token=token)
        valid = valid and revoked_status == 401
    print(f'{username:16} login/role/self/logout: {"PASS" if valid else "FAIL"} (HTTP {status})')
    if not valid:
        failures.append(username)
raise SystemExit(1 if failures else 0)
