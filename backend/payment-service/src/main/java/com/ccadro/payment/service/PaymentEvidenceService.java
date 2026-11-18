package com.ccadro.payment.service;

import com.ccadro.payment.configuration.EvidenceProperties;
import com.ccadro.payment.entity.ContractSlaEvent;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.ContractSlaEventRepository;
import com.ccadro.payment.service.LegalContractDocumentRenderer.BuyerLegalProfile;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
public class PaymentEvidenceService {
 private final JdbcTemplate jdbc;
 private final ObjectMapper json;
 private final B2bContractRepository contracts;
 private final ContractSlaEventRepository sla;
 private final EvidenceProperties properties;
 private final PaymentOutboxService outboxService;

 public PaymentEvidenceService(
   JdbcTemplate jdbc,
   ObjectMapper json,
   B2bContractRepository contracts,
   ContractSlaEventRepository sla,
   EvidenceProperties properties) {
  this(jdbc, json, contracts, sla, properties, null);
 }

 @Autowired
 public PaymentEvidenceService(
   JdbcTemplate jdbc,
   ObjectMapper json,
   B2bContractRepository contracts,
   ContractSlaEventRepository sla,
   EvidenceProperties properties,
   @Nullable PaymentOutboxService outboxService) {
  this.jdbc = jdbc;
  this.json = json;
  this.contracts = contracts;
  this.sla = sla;
  this.properties = properties;
  this.outboxService = outboxService;
 }

 @Transactional
 public void capture(PaymentTransaction tx) {
  if (!"PAID".equals(tx.getPaymentStatus())) return;
  var id = UUID.nameUUIDFromBytes(("payment-evidence-v1:" + tx.getTransactionCode()).getBytes(StandardCharsets.UTF_8));
  var contract = contracts.findTopByShipmentCodeOrderByCreatedAtDesc(tx.getShipmentCode())
    .filter(c -> Objects.equals(c.getCustomerId(),tx.getCustomerId()) && !Boolean.TRUE.equals(c.getIsDeleted()));
  var linkedContract = contract.orElse(null);
  List<ContractSlaEvent> slaEvents = contract.map(c -> sla.findByContractNumberOrderByCreatedAtDesc(c.getContractNumber())).orElse(List.of());
  BuyerLegalProfile buyer = outboxService != null
    ? outboxService.resolveBuyerProfile(tx, linkedContract)
    : BuyerLegalProfile.fallback(tx, linkedContract);
  String effectiveRecipient = (tx.getReceiptEmail() != null && !tx.getReceiptEmail().isBlank())
    ? tx.getReceiptEmail()
    : buyer.email();

  var snapshot = new LinkedHashMap<String,Object>();
  snapshot.put("schemaVersion", "ccadro.payment-evidence.v1");
  snapshot.put("evidenceId", id.toString());
  snapshot.put("issuer", Map.of(
    "legalName", properties.getLegalName(),
    "taxCode", properties.getTaxCode(),
    "businessLicense", properties.getBusinessLicense(),
    "address", properties.getAddress(),
    "representativeName", properties.getRepresentativeName(),
    "representativeTitle", properties.getRepresentativeTitle(),
    "supportEmail", properties.getSupportEmail(),
    "responseTime", properties.getResponseTime()));
  snapshot.put("buyer", Map.of(
    "legalName", buyer.legalName(),
    "taxCode", buyer.taxCode(),
    "businessLicense", buyer.businessLicense(),
    "representativeName", buyer.representativeName(),
    "representativeTitle", buyer.representativeTitle(),
    "address", buyer.address(),
    "kycStatus", buyer.kycStatus()));
  var payment = new LinkedHashMap<String,Object>();
  payment.put("transactionCode",tx.getTransactionCode()); payment.put("invoiceReference",tx.getInvoiceNumber());
  payment.put("shipmentCode",tx.getShipmentCode()); payment.put("customerId",tx.getCustomerId());
  payment.put("customerName",tx.getCustomerName()); payment.put("ownerUsername",tx.getCreatedByUsername());
  payment.put("recipientEmail",effectiveRecipient); payment.put("payerName",tx.getPayerName());
  payment.put("confirmationSource",tx.getConfirmationSource());
  payment.put("status",tx.getPaymentStatus()); payment.put("paidAt",tx.getPaidAt());
  payment.put("currency",tx.getCurrency()); payment.put("baseFreightVnd",tx.getBaseFreightVnd());
  payment.put("discountVnd",tx.getGreenEsgDiscountVnd()); payment.put("vatVnd",tx.getVatAmountVnd());
  payment.put("totalAmountVnd",tx.getTotalAmountVnd()); payment.put("method",tx.getPaymentMethod());
  payment.put("gatewayProvider",tx.getGatewayProvider()); payment.put("gatewayReference",tx.getGatewayReference());
  snapshot.put("payment",payment);
  // Match both customer and shipment. A payment never signs or settles a contract implicitly.
  snapshot.put("contract",contract.map(json::valueToTree).orElse(null));
  snapshot.put("contractStatus",contract.map(c -> c.getContractStatus()).orElse("NOT_LINKED"));
  snapshot.put("slaAndAcceptanceEvents",slaEvents);
  snapshot.put("notice", "Bản ghi xác nhận thanh toán và bản chụp hợp đồng tại thời điểm thanh toán. SHA-256 dùng để đối chiếu tính toàn vẹn, không phải chữ ký số có chứng thư. Không thay thế hóa đơn điện tử thuế, hợp đồng được ký hợp lệ hoặc biên bản ePOD gốc. Thanh toán không đồng nghĩa nghiệm thu hàng hóa, miễn trừ trách nhiệm hay từ bỏ quyền khiếu nại. Bảo quản email gốc cùng tệp đính kèm và cung cấp mã giao dịch khi yêu cầu đối soát.");
  try {
   String data = json.writerWithDefaultPrettyPrinter().writeValueAsString(snapshot);
   String hash = sha256(data);
   String html = PaymentEvidenceHtml.render(id, tx, linkedContract, properties, data, hash, snapshot.get("notice").toString());
   String htmlHash = sha256(html);

   String contractNumber = linkedContract != null && linkedContract.getContractNumber() != null && !linkedContract.getContractNumber().isBlank()
     ? linkedContract.getContractNumber()
     : "HD-SPOT-" + tx.getTransactionCode();
   byte[] contractPdfBytes = LegalContractDocumentRenderer.renderPdfBytes(
     LegalContractDocumentRenderer.renderFullLegalContractHtml(id, tx, linkedContract, slaEvents, properties, buyer, hash));
   byte[] receiptPdfBytes = LegalContractDocumentRenderer.renderPdfBytes(
     LegalContractDocumentRenderer.renderPaymentReceiptHtml(id, tx, properties, buyer, hash));
   String contractPdfBase64 = Base64.getEncoder().encodeToString(contractPdfBytes);
   String contractPdfSha256 = sha256Bytes(contractPdfBytes);
   String receiptPdfBase64 = Base64.getEncoder().encodeToString(receiptPdfBytes);
   String receiptPdfSha256 = sha256Bytes(receiptPdfBytes);

   String state = effectiveRecipient==null || effectiveRecipient.isBlank() ? "BLOCKED_NO_RECIPIENT" : "PENDING";
   int inserted = jdbc.update(
     "INSERT INTO payment_evidence(id,transaction_code,owner_username,recipient_email,snapshot_json,snapshot_sha256,html_content,html_sha256,delivery_status,"
     + "contract_number,contract_pdf_base64,contract_pdf_sha256,receipt_pdf_base64,receipt_pdf_sha256,"
     + "buyer_legal_name,buyer_tax_code,buyer_business_license,buyer_representative,buyer_address,kafka_topic) "
     + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(transaction_code) DO NOTHING",
     id, tx.getTransactionCode(), tx.getCreatedByUsername(), effectiveRecipient, data, hash, html, htmlHash, state,
     contractNumber, contractPdfBase64, contractPdfSha256, receiptPdfBase64, receiptPdfSha256,
     buyer.legalName(), buyer.taxCode(), buyer.businessLicense(), buyer.representativeName(), buyer.address(), properties.getKafkaTopic());

   if (outboxService != null && "PENDING".equals(state) && inserted > 0) {
    outboxService.enqueuePaymentEvidence(
      id, tx, linkedContract, effectiveRecipient, data, hash, html, htmlHash,
      contractPdfBase64, contractPdfSha256, receiptPdfBase64, receiptPdfSha256);
   }
  } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException("Cannot archive payment evidence",e); }
 }
 @Transactional(readOnly=true)
 public Map<String,Object> get(String transactionCode,String username,String scope) {
  var rows=jdbc.queryForList("SELECT * FROM payment_evidence WHERE transaction_code=?",transactionCode);
  if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Chưa có hồ sơ thanh toán");
  var row=rows.get(0);
  var roles=scope==null?Set.<String>of():new HashSet<>(Arrays.asList(scope.split("\\s+")));
  if(username==null || username.isBlank() || (!Objects.equals(username,row.get("owner_username")) && !roles.contains("ROLE_ADMIN")))
   throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Không có quyền đọc hồ sơ này");
  var result=new LinkedHashMap<String,Object>(row);
  if(("QUEUED".equals(row.get("delivery_status")) || "KAFKA_PUBLISHED".equals(row.get("delivery_status")))
     && !properties.getInternalToken().isBlank()) {
   try {
    var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(2000);factory.setReadTimeout(3000);
    var state=org.springframework.web.client.RestClient.builder().baseUrl(properties.getNotificationUrl()).requestFactory(factory).build()
      .get().uri("/internal/payment-evidence/{id}",row.get("id")).header("X-Internal-Token",properties.getInternalToken())
      .retrieve().body(Map.class);
    result.put("emailDelivery",state);
   }catch(Exception e){result.put("emailDelivery", synthesizeEmailDelivery(row));}
  } else if (row.get("email_provider_status") != null || row.get("kafka_published_at") != null) {
   result.put("emailDelivery", synthesizeEmailDelivery(row));
  }
  return result;
 }
 @Transactional
 public void retry(String transactionCode,String username,String scope) {
  var row=get(transactionCode,username,scope);
  if(scope==null || !Arrays.asList(scope.split("\\s+")).contains("ROLE_ADMIN"))
   throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  if("FAILED".equals(row.get("delivery_status"))) {
   jdbc.update("UPDATE payment_evidence SET delivery_status='PENDING',attempts=0,next_attempt_at=NOW() WHERE id=?",row.get("id"));
   if (outboxService != null && properties.isKafkaEnabled()) {
    jdbc.update("UPDATE outbox_event SET status='PENDING',retry_count=0 WHERE aggregate_type=? AND aggregate_id=?",
      PaymentOutboxService.AGGREGATE_TYPE_PAYMENT_EVIDENCE, row.get("id"));
   }
  } else if("QUEUED".equals(row.get("delivery_status")) || "KAFKA_PUBLISHED".equals(row.get("delivery_status"))) {
   var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(2000);factory.setReadTimeout(3000);
   org.springframework.web.client.RestClient.builder().baseUrl(properties.getNotificationUrl()).requestFactory(factory).build().post()
    .uri("/internal/payment-evidence/{id}/retry",row.get("id")).header("X-Internal-Token",properties.getInternalToken()).retrieve().toBodilessEntity();
  } else throw new ResponseStatusException(HttpStatus.CONFLICT,"Hồ sơ chưa ở trạng thái gửi lỗi");
 }

 private static Map<String, Object> synthesizeEmailDelivery(Map<String, Object> row) {
  Map<String, Object> state = new LinkedHashMap<>();
  state.put("status", row.get("email_provider_status") != null ? row.get("email_provider_status") : row.get("delivery_status"));
  state.put("kafkaTopic", row.get("kafka_topic"));
  state.put("kafkaPublishedAt", row.get("kafka_published_at"));
  state.put("providerMessageId", row.get("email_provider_message_id"));
  state.put("sentAt", row.get("email_delivered_at"));
  state.put("lastError", row.get("last_error"));
  return state;
 }

 public static String sha256(String value) {
  return sha256Bytes(value.getBytes(StandardCharsets.UTF_8));
 }

 public static String sha256Bytes(byte[] bytes) {
  try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
  catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
 }
}
