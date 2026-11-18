package com.ccadro.notification.service;

import com.ccadro.notification.dto.request.PaymentEvidenceRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentEvidenceInbox {
    private final JdbcTemplate jdbc;

    @Transactional
    public Map<String, Object> accept(UUID id, PaymentEvidenceRequest r) {
        if (!digest(r.snapshotJson()).equals(r.snapshotSha256()) || !digest(r.htmlContent()).equals(r.htmlSha256())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Evidence checksum mismatch");
        }
        verifyOptionalPdf(r.contractPdfBase64(), r.contractPdfSha256(), "Contract PDF checksum mismatch");
        verifyOptionalPdf(r.receiptPdfBase64(), r.receiptPdfSha256(), "Receipt PDF checksum mismatch");

        jdbc.update(
                """
                INSERT INTO payment_email_inbox(
                    event_id, recipient_email, subject, snapshot_json, snapshot_sha256, html_content, html_sha256,
                    contract_number, transaction_code, contract_pdf_base64, contract_pdf_sha256,
                    receipt_pdf_base64, receipt_pdf_sha256
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_id) DO NOTHING
                """,
                id,
                r.recipientEmail(),
                r.subject(),
                r.snapshotJson(),
                r.snapshotSha256(),
                r.htmlContent(),
                r.htmlSha256(),
                r.contractNumber(),
                r.transactionCode(),
                r.contractPdfBase64(),
                r.contractPdfSha256(),
                r.receiptPdfBase64(),
                r.receiptPdfSha256()
        );
        var row = jdbc.queryForMap("SELECT * FROM payment_email_inbox WHERE event_id=?", id);
        if (!Objects.equals(row.get("snapshot_sha256"), r.snapshotSha256())
                || !Objects.equals(row.get("html_sha256"), r.htmlSha256())
                || !Objects.equals(row.get("recipient_email"), r.recipientEmail())
                || !Objects.equals(row.get("subject"), r.subject())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Event ID already used for different evidence");
        }
        return status(id);
    }

    public Map<String, Object> status(UUID id) {
        var rows = jdbc.queryForList(
                "SELECT event_id,status,attempts,provider_message_id,accepted_at,last_error FROM payment_email_inbox WHERE event_id=?",
                id
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return rows.get(0);
    }

    @Transactional
    public void retry(UUID id) {
        int changed = jdbc.update(
                "UPDATE payment_email_inbox SET status='PENDING',attempts=0,next_attempt_at=NOW(),last_error=NULL WHERE event_id=? AND status='FAILED'",
                id
        );
        if (changed == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only failed deliveries may be retried; reconcile ambiguous outcomes separately");
        }
    }

    private static void verifyOptionalPdf(String base64, String expectedSha256, String errorMessage) {
        if (base64 == null || base64.isBlank() || expectedSha256 == null || expectedSha256.isBlank()) {
            return;
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, errorMessage);
        }
        if (!digestBytes(decoded).equals(expectedSha256)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, errorMessage);
        }
    }

    public static String digest(String data) {
        return digestBytes(data.getBytes(StandardCharsets.UTF_8));
    }

    public static String digestBytes(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
