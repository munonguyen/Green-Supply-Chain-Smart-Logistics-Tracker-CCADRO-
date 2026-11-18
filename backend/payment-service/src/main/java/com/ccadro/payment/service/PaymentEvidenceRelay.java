package com.ccadro.payment.service;
import com.ccadro.payment.configuration.EvidenceProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import java.util.LinkedHashMap;
import java.util.Map;

@Component @RequiredArgsConstructor
public class PaymentEvidenceRelay {
 private final JdbcTemplate jdbc;
 private final EvidenceProperties properties;
 @Scheduled(fixedDelayString="${ccadro.evidence.poll-ms:15000}")
 @Transactional
 public void relay() {
  if(properties.getInternalToken().isBlank()) return;
  String outboxFilter = properties.isKafkaEnabled()
    ? "AND NOT EXISTS (SELECT 1 FROM outbox_event o WHERE o.aggregate_type = 'PAYMENT_EVIDENCE' AND o.aggregate_id = payment_evidence.id)"
    : "";
  var rows=jdbc.queryForList("SELECT * FROM payment_evidence WHERE delivery_status='PENDING' AND next_attempt_at <= NOW() " + outboxFilter + " ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED");
  var factory=new SimpleClientHttpRequestFactory();factory.setConnectTimeout(3000);factory.setReadTimeout(10000);
  var client=RestClient.builder().baseUrl(properties.getNotificationUrl()).requestFactory(factory).build();
  for(var row:rows){
   try {
    var body = new LinkedHashMap<String, Object>();
    body.put("recipientEmail", row.get("recipient_email"));
    body.put("subject", "[CCADRO Legal] Xác nhận thanh toán & Hợp đồng vận tải " + row.get("transaction_code"));
    body.put("snapshotJson", row.get("snapshot_json"));
    body.put("snapshotSha256", row.get("snapshot_sha256"));
    body.put("htmlContent", row.get("html_content"));
    body.put("htmlSha256", row.get("html_sha256"));
    if (row.get("contract_number") != null) body.put("contractNumber", row.get("contract_number"));
    if (row.get("transaction_code") != null) body.put("transactionCode", row.get("transaction_code"));
    if (row.get("contract_pdf_base64") != null) body.put("contractPdfBase64", row.get("contract_pdf_base64"));
    if (row.get("contract_pdf_sha256") != null) body.put("contractPdfSha256", row.get("contract_pdf_sha256"));
    if (row.get("receipt_pdf_base64") != null) body.put("receiptPdfBase64", row.get("receipt_pdf_base64"));
    if (row.get("receipt_pdf_sha256") != null) body.put("receiptPdfSha256", row.get("receipt_pdf_sha256"));
    client.put().uri("/internal/payment-evidence/{id}",row.get("id"))
     .header("X-Internal-Token",properties.getInternalToken())
     .body(body)
     .retrieve().toBodilessEntity();
    jdbc.update("UPDATE payment_evidence SET delivery_status='QUEUED',last_error=NULL WHERE id=?",row.get("id"));
   } catch(Exception e){
    int attempts=((Number)row.get("attempts")).intValue()+1;
    jdbc.update("UPDATE payment_evidence SET attempts=?,delivery_status=?,next_attempt_at=NOW() + (? * interval '1 second'),last_error=? WHERE id=?",
      attempts,attempts>=properties.getMaxAttempts()?"FAILED":"PENDING",properties.getRetrySeconds(),"Notification service unavailable; retry required",row.get("id"));
   }
  }
 }
}
