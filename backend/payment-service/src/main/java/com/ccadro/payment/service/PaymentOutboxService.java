package com.ccadro.payment.service;

import com.ccadro.payment.configuration.EvidenceProperties;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.service.LegalContractDocumentRenderer.BuyerLegalProfile;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Resolve B2B buyer legal profile from public.companies and write payment-evidence
 * Kafka events atomically to Transactional Outbox (outbox_event).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentOutboxService {

    public static final String AGGREGATE_TYPE_PAYMENT_EVIDENCE = "PAYMENT_EVIDENCE";
    public static final String EVENT_TYPE_PAYMENT_EVIDENCE_READY = "PAYMENT_EVIDENCE_LEGAL_READY";

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final EvidenceProperties properties;

    public BuyerLegalProfile resolveBuyerProfile(PaymentTransaction tx, B2bContract contract) {
        BuyerLegalProfile fallback = BuyerLegalProfile.fallback(tx, contract);
        Map<String, Object> row = findCompanyRow(tx);
        if (row == null || row.isEmpty()) {
            return fallback;
        }
        String legalName = pick(row.get("company_name"), fallback.legalName());
        String taxCode = pick(row.get("tax_code"), fallback.taxCode());
        String bizLicense = pick(row.get("business_license_number"), fallback.businessLicense());
        String repName = pick(row.get("representative_name"), fallback.representativeName());
        String repTitle = pick(row.get("representative_title"), fallback.representativeTitle());
        String address = pick(row.get("headquarters_address"), fallback.address());
        String kycStatus = pick(row.get("kyc_status"), fallback.kycStatus());
        String email = (tx.getReceiptEmail() != null && !tx.getReceiptEmail().isBlank())
                ? tx.getReceiptEmail()
                : pick(row.get("company_email"), fallback.email());
        return new BuyerLegalProfile(legalName, taxCode, bizLicense, repName, repTitle, address, kycStatus, email);
    }

    public UUID enqueuePaymentEvidence(
            UUID evidenceId,
            PaymentTransaction tx,
            B2bContract contract,
            String recipientEmail,
            String snapshotJson,
            String snapshotSha256,
            String htmlContent,
            String htmlSha256,
            String contractPdfBase64,
            String contractPdfSha256,
            String receiptPdfBase64,
            String receiptPdfSha256
    ) {
        if (!properties.isKafkaEnabled()) {
            return null;
        }
        UUID outboxId = UUID.randomUUID();
        String contractNo = contract != null && contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                ? contract.getContractNumber()
                : "HD-SPOT-" + tx.getTransactionCode();
        String subject = String.format(
                "[CCADRO Legal] Xác nhận thanh toán & Hợp đồng vận tải %s (%s)",
                contractNo,
                tx.getTransactionCode()
        );

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventId", outboxId.toString());
        payload.put("eventType", EVENT_TYPE_PAYMENT_EVIDENCE_READY);
        payload.put("occurredAt", Instant.now().toString());
        payload.put("evidenceId", evidenceId.toString());
        payload.put("transactionCode", tx.getTransactionCode());
        payload.put("contractNumber", contractNo);
        payload.put("customerId", tx.getCustomerId());
        payload.put("customerName", tx.getCustomerName());
        payload.put("recipientEmail", recipientEmail);
        payload.put("subject", subject);
        payload.put("snapshotJson", snapshotJson);
        payload.put("snapshotSha256", snapshotSha256);
        payload.put("htmlContent", htmlContent);
        payload.put("htmlSha256", htmlSha256);
        payload.put("contractPdfBase64", contractPdfBase64);
        payload.put("contractPdfSha256", contractPdfSha256);
        payload.put("receiptPdfBase64", receiptPdfBase64);
        payload.put("receiptPdfSha256", receiptPdfSha256);

        try {
            String serialized = json.writeValueAsString(payload);
            jdbc.update(
                    """
                    INSERT INTO outbox_event(
                        id, aggregate_type, aggregate_id, event_type, kafka_topic, payload_json, status, retry_count
                    ) VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), 'PENDING', 0)
                    """,
                    outboxId,
                    AGGREGATE_TYPE_PAYMENT_EVIDENCE,
                    evidenceId,
                    EVENT_TYPE_PAYMENT_EVIDENCE_READY,
                    properties.getKafkaTopic(),
                    serialized
            );
            return outboxId;
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot serialize payment evidence outbox payload", ex);
        }
    }

    private Map<String, Object> findCompanyRow(PaymentTransaction tx) {
        try {
            if (tx.getCustomerId() != null && !tx.getCustomerId().isBlank()) {
                List<Map<String, Object>> byCode = jdbc.queryForList(
                        """
                        SELECT company_name, tax_code, business_license_number,
                               representative_name, representative_title,
                               headquarters_address, kyc_status, company_email
                        FROM public.companies
                        WHERE is_deleted = FALSE AND LOWER(company_code) = LOWER(?)
                        LIMIT 1
                        """,
                        tx.getCustomerId()
                );
                if (!byCode.isEmpty()) {
                    return byCode.get(0);
                }
            }
            if (tx.getCreatedByUsername() != null && !tx.getCreatedByUsername().isBlank()) {
                List<Map<String, Object>> byUser = jdbc.queryForList(
                        """
                        SELECT c.company_name, c.tax_code, c.business_license_number,
                               c.representative_name, c.representative_title,
                               c.headquarters_address, c.kyc_status, c.company_email
                        FROM public.users u
                        JOIN public.companies c ON u.company_id = c.id
                        WHERE LOWER(u.username) = LOWER(?) AND c.is_deleted = FALSE
                        LIMIT 1
                        """,
                        tx.getCreatedByUsername()
                );
                if (!byUser.isEmpty()) {
                    return byUser.get(0);
                }
            }
        } catch (Exception ex) {
            log.debug("Optional buyer company lookup skipped: {}", ex.getMessage());
        }
        return Map.of();
    }

    private static String pick(Object candidate, String fallback) {
        if (candidate == null) {
            return fallback;
        }
        String text = candidate.toString().trim();
        return text.isEmpty() ? fallback : text;
    }
}

