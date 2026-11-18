package com.ccadro.payment.service;

import com.ccadro.payment.configuration.PaymentProperties;
import com.ccadro.payment.dto.request.ConfirmPaymentRequest;
import com.ccadro.payment.dto.request.CreatePaymentRequest;
import com.ccadro.payment.dto.request.PaymentWebhookCallbackRequest;
import com.ccadro.payment.dto.request.RefundPaymentRequest;
import com.ccadro.payment.dto.response.PaymentAuditLogResponse;
import com.ccadro.payment.dto.response.PaymentSummaryResponse;
import com.ccadro.payment.dto.response.PaymentTransactionResponse;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.PaymentAuditLog;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.exception.AppException;
import com.ccadro.payment.exception.ErrorCode;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.PaymentAuditLogRepository;
import com.ccadro.payment.repository.PaymentTransactionRepository;
import com.ccadro.payment.validate.FinancialGovernanceValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneId;
import java.time.Year;
import java.util.Objects;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

@Service
@Slf4j
public class PaymentService {
    private final com.ccadro.payment.mapper.PaymentMapper paymentMapper;

    private static final Map<String, String> GATEWAY_PROVIDER_MAP = Map.of(
            "VIETQR_NAPAS", "NAPAS_VIETQR_247",
            "VNPAY_QR", "VNPAY_GATEWAY",
            "MOMO_WALLET", "MOMO_BUSINESS_WALLET",
            "CORPORATE_CARD", "ONEPAY_VISA_MC",
            "GREEN_CREDIT_NET30", "CCADRO_GREEN_CREDIT");

    private final PaymentTransactionRepository transactionRepository;
    private final PaymentAuditLogRepository auditLogRepository;
    private final B2bContractRepository contractRepository;
    private final PaymentProperties paymentProperties;
    private final PaymentEvidenceService evidenceService;
    private final FinancialGovernanceValidator financialValidator;

    public PaymentService(
            com.ccadro.payment.mapper.PaymentMapper paymentMapper,
            PaymentTransactionRepository transactionRepository,
            PaymentAuditLogRepository auditLogRepository,
            B2bContractRepository contractRepository,
            PaymentProperties paymentProperties,
            PaymentEvidenceService evidenceService) {
        this(paymentMapper, transactionRepository, auditLogRepository, contractRepository,
                paymentProperties, evidenceService, new FinancialGovernanceValidator());
    }

    @Autowired
    public PaymentService(
            com.ccadro.payment.mapper.PaymentMapper paymentMapper,
            PaymentTransactionRepository transactionRepository,
            PaymentAuditLogRepository auditLogRepository,
            B2bContractRepository contractRepository,
            PaymentProperties paymentProperties,
            PaymentEvidenceService evidenceService,
            FinancialGovernanceValidator financialValidator) {
        this.paymentMapper = paymentMapper;
        this.transactionRepository = transactionRepository;
        this.auditLogRepository = auditLogRepository;
        this.contractRepository = contractRepository;
        this.paymentProperties = paymentProperties;
        this.evidenceService = evidenceService;
        this.financialValidator = financialValidator;
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getPayments(String customerId, String status, String shipmentCode) {
        return getPayments(customerId, status, shipmentCode, null, false);
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getPayments(
            String customerId,
            String status,
            String shipmentCode,
            String q,
            boolean includeDeleted) {
        List<PaymentTransaction> list;
        if (shipmentCode != null && !shipmentCode.isBlank()) {
            list = transactionRepository.findTopByShipmentCodeOrderByCreatedAtDesc(shipmentCode.trim())
                    .map(List::of)
                    .orElse(List.of());
        } else if (customerId != null && !customerId.isBlank() && status != null && !status.isBlank()) {
            list = transactionRepository.findByCustomerIdAndPaymentStatusOrderByCreatedAtDesc(
                    customerId.trim(), status.trim().toUpperCase());
        } else if (customerId != null && !customerId.isBlank()) {
            list = transactionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId.trim());
        } else if (status != null && !status.isBlank()) {
            list = transactionRepository.findByPaymentStatusOrderByCreatedAtDesc(status.trim().toUpperCase());
        } else {
            list = transactionRepository.findAllByOrderByCreatedAtDesc();
        }

        List<PaymentTransaction> active = list.stream()
                .filter(tx -> includeDeleted || !Boolean.TRUE.equals(tx.getIsDeleted()))
                .toList();

        List<PaymentTransaction> ranked = ElasticSearchSupport.filterAndRank(
                active,
                q,
                tx -> List.of(
                        new ElasticSearchSupport.WeightedField(tx.getTransactionCode(), 5.0),
                        new ElasticSearchSupport.WeightedField(tx.getInvoiceNumber(), 4.5),
                        new ElasticSearchSupport.WeightedField(tx.getShipmentCode(), 4.5),
                        new ElasticSearchSupport.WeightedField(tx.getCustomerName(), 4.0),
                        new ElasticSearchSupport.WeightedField(tx.getCustomerId(), 3.5),
                        new ElasticSearchSupport.WeightedField(tx.getPaymentMethod(), 2.5),
                        new ElasticSearchSupport.WeightedField(tx.getOriginName(), 2.5),
                        new ElasticSearchSupport.WeightedField(tx.getDestinationName(), 2.5),
                        new ElasticSearchSupport.WeightedField(tx.getPaymentStatus(), 1.5)));
        return ranked.stream().map(this::toResponse).toList();
    }

    @Transactional
    public PaymentTransactionResponse softDeletePayment(String transactionCode, String deletedBy) {
        PaymentTransaction tx = findOrThrow(transactionCode);
        if ("NET30_CREDIT".equals(tx.getPaymentStatus()) && !Boolean.TRUE.equals(tx.getIsDeleted())) {
            releaseMsaCreditIfPresent(tx.getCustomerId(), tx.getTotalAmountVnd());
        }
        tx.setIsDeleted(true);
        tx.setDeletedAt(Instant.now());
        tx.setDeletedBy(deletedBy != null && !deletedBy.isBlank() ? deletedBy : "ADMIN");
        return toResponse(transactionRepository.save(tx));
    }

    @Transactional
    public PaymentTransactionResponse restorePayment(String transactionCode) {
        PaymentTransaction tx = findOrThrow(transactionCode);
        tx.setIsDeleted(false);
        tx.setDeletedAt(null);
        tx.setDeletedBy(null);
        return toResponse(transactionRepository.save(tx));
    }

    @Transactional
    public PaymentTransactionResponse getByTransactionCode(String transactionCode) {
        PaymentTransaction tx = findOrThrow(transactionCode);
        return toResponse(tx);
    }

    @Transactional
    public List<PaymentAuditLogResponse> getAuditLogs(String transactionCode) {
        findOrThrow(transactionCode);
        return auditLogRepository.findByTransactionCodeOrderByCreatedAtDesc(transactionCode)
                .stream()
                .map(paymentMapper::audit)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentSummaryResponse getSummary(String customerId) {
        List<PaymentTransaction> rawList = (customerId != null && !customerId.isBlank())
                ? transactionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId.trim())
                : transactionRepository.findAllByOrderByCreatedAtDesc();
        List<PaymentTransaction> list = rawList.stream()
                .filter(t -> !Boolean.TRUE.equals(t.getIsDeleted()))
                .toList();

        long paidCount = list.stream().filter(t -> "PAID".equals(t.getPaymentStatus())).count();
        long pendingCount = list.stream().filter(t -> "PENDING".equals(t.getPaymentStatus())).count();
        long net30Count = list.stream().filter(t -> "NET30_CREDIT".equals(t.getPaymentStatus())).count();
        long refundedCount = list.stream().filter(t -> "REFUNDED".equals(t.getPaymentStatus())).count();

        long totalPaidVnd = list.stream()
                .filter(t -> "PAID".equals(t.getPaymentStatus()))
                .mapToLong(PaymentTransaction::getTotalAmountVnd)
                .sum();
        long totalPendingVnd = list.stream()
                .filter(t -> "PENDING".equals(t.getPaymentStatus()))
                .mapToLong(PaymentTransaction::getTotalAmountVnd)
                .sum();
        long totalNet30Vnd = list.stream()
                .filter(t -> "NET30_CREDIT".equals(t.getPaymentStatus()))
                .mapToLong(PaymentTransaction::getTotalAmountVnd)
                .sum();
        long totalGreenDiscountVnd = list.stream()
                .filter(t -> !"REFUNDED".equals(t.getPaymentStatus()))
                .mapToLong(PaymentTransaction::getGreenEsgDiscountVnd)
                .sum();
        double totalCo2SavedKg = list.stream()
                .filter(t -> !"REFUNDED".equals(t.getPaymentStatus()))
                .mapToDouble(t -> t.getCo2SavedKg() != null ? t.getCo2SavedKg() : 0.0)
                .sum();

        return PaymentSummaryResponse.builder()
                .customerId(customerId != null && !customerId.isBlank() ? customerId : "ALL")
                .totalTransactions(list.size())
                .paidCount(paidCount)
                .pendingCount(pendingCount)
                .net30Count(net30Count)
                .refundedCount(refundedCount)
                .totalPaidVnd(totalPaidVnd)
                .totalPendingVnd(totalPendingVnd)
                .totalNet30Vnd(totalNet30Vnd)
                .totalGreenDiscountVnd(totalGreenDiscountVnd)
                .totalCo2SavedKg(Math.round(totalCo2SavedKg * 10.0) / 10.0)
                .build();
    }

    @Transactional
    public PaymentTransactionResponse createPayment(CreatePaymentRequest request) {
        String method = financialValidator.normalizeAndValidatePaymentMethod(request.getPaymentMethod());
        String powertrain = financialValidator.normalizePowertrain(request.getPowertrainType());

        long baseFreight = request.getBaseFreightVnd();
        double discountRate = resolveDiscountRate(powertrain);
        long greenDiscount = Math.round(baseFreight * discountRate);
        long taxableAmount = Math.max(0L, baseFreight - greenDiscount);
        long vatAmount = Math.round(taxableAmount * paymentProperties.getVatRate());
        long totalAmount = taxableAmount + vatAmount;

        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String year = String.valueOf(Year.now().getValue());
        String transactionCode = "PAY-" + year + "-" + suffix;
        String invoiceNumber = "INV-CCADRO-" + year + "-" + suffix;

        String gatewayProvider = GATEWAY_PROVIDER_MAP.get(method);
        boolean isNet30 = "GREEN_CREDIT_NET30".equals(method);
        boolean instantPaid = Boolean.TRUE.equals(request.getInstantConfirm()) && !isNet30;
        financialValidator.validateInstantConfirmAllowed(instantPaid, paymentProperties.isAllowInstantConfirm());

        String initialStatus = instantPaid
                ? "PAID"
                : isNet30
                        ? "NET30_CREDIT"
                        : "PENDING";

        if (isNet30) {
            reserveMsaCreditIfPresent(request.getCustomerId().trim(), totalAmount);
        }

        Instant now = Instant.now();
        int dueDays = isNet30 ? paymentProperties.getNet30Days() : paymentProperties.getDefaultDueDays();
        String qrPayload = buildQrPayload(transactionCode, request.getShipmentCode(), totalAmount, method);

        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionCode(transactionCode)
                .invoiceNumber(invoiceNumber)
                .shipmentCode(request.getShipmentCode().trim())
                .customerId(request.getCustomerId().trim())
                .customerName(request.getCustomerName())
                .receiptEmail(request.getReceiptEmail())
                .createdByUsername(request.getCreatedByUsername())
                .originName(request.getOriginName())
                .destinationName(request.getDestinationName())
                .containerCode(request.getContainerCode())
                .vehicleType(request.getVehicleType())
                .powertrainType(powertrain)
                .paymentMethod(method)
                .currency("VND")
                .baseFreightVnd(baseFreight)
                .greenEsgDiscountVnd(greenDiscount)
                .vatAmountVnd(vatAmount)
                .totalAmountVnd(totalAmount)
                .co2SavedKg(request.getCo2SavedKg() != null ? request.getCo2SavedKg() : 0.0)
                .paymentStatus(initialStatus)
                .gatewayProvider(gatewayProvider)
                .gatewayReference("GW-" + suffix)
                .qrPayload(qrPayload)
                .bankCode(paymentProperties.getMerchantBankCode())
                .bankAccountNo(paymentProperties.getMerchantAccountNo())
                .cardLast4(request.getCardLast4())
                .payerName(request.getPayerName() != null ? request.getPayerName() : request.getCustomerName())
                .notes(request.getNotes())
                .confirmationSource(instantPaid ? "DEMO_INSTANT_CONFIRM" : null)
                .paidAt(instantPaid ? now : null)
                .dueAt(now.plus(dueDays, ChronoUnit.DAYS))
                .build();

        PaymentTransaction saved = transactionRepository.save(tx);
        transactionRepository.flush();
        if ("PAID".equals(saved.getPaymentStatus()))
            evidenceService.capture(saved);
        recordAudit(
                saved.getTransactionCode(),
                instantPaid ? "INSTANT_PAID" : isNet30 ? "NET30_APPROVED" : "CREATED",
                null,
                saved.getPaymentStatus(),
                saved.getCreatedByUsername() != null ? saved.getCreatedByUsername() : saved.getCustomerId(),
                "Khởi tạo hóa đơn " + saved.getInvoiceNumber() + " cho vận đơn " + saved.getShipmentCode()
                        + " (" + saved.getTotalAmountVnd() + " VND)");

        log.info("Created payment {} for shipment {} status={}", saved.getTransactionCode(), saved.getShipmentCode(),
                saved.getPaymentStatus());
        return toResponse(saved);
    }

    @Transactional
    public PaymentTransactionResponse confirmPayment(String transactionCode, ConfirmPaymentRequest request) {
        PaymentTransaction tx = findOrThrow(transactionCode);
        financialValidator.requireConfirmablePayment(tx);

        String previousStatus = tx.getPaymentStatus();
        String method = (request != null && request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank())
                ? financialValidator.normalizeAndValidatePaymentMethod(request.getPaymentMethod())
                : tx.getPaymentMethod();

        tx.setPaymentMethod(method);
        tx.setGatewayProvider(GATEWAY_PROVIDER_MAP.get(method));
        tx.setPaymentStatus("PAID");
        tx.setConfirmationSource("MANUAL_RECONCILIATION");
        tx.setPaidAt(Instant.now());

        if (request != null) {
            if (request.getGatewayReference() != null && !request.getGatewayReference().isBlank()) {
                tx.setGatewayReference(request.getGatewayReference().trim());
            } else {
                tx.setGatewayReference("FT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            }
            if (request.getPayerName() != null && !request.getPayerName().isBlank()) {
                tx.setPayerName(request.getPayerName().trim());
            }
            if (request.getCardLast4() != null && !request.getCardLast4().isBlank()) {
                tx.setCardLast4(request.getCardLast4().trim());
            }
            if (request.getNotes() != null && !request.getNotes().isBlank()) {
                tx.setNotes(request.getNotes().trim());
            }
        }

        PaymentTransaction saved = transactionRepository.save(tx);
        transactionRepository.flush();
        if ("PAID".equals(saved.getPaymentStatus()))
            evidenceService.capture(saved);
        if ("NET30_CREDIT".equals(previousStatus)) {
            releaseMsaCreditIfPresent(saved.getCustomerId(), saved.getTotalAmountVnd());
        }
        recordAudit(
                saved.getTransactionCode(),
                "CONFIRMED_PAID",
                previousStatus,
                "PAID",
                saved.getGatewayProvider(),
                "Xác nhận thanh toán thành công qua " + saved.getPaymentMethod() + " (Ref: "
                        + saved.getGatewayReference() + ")");

        log.info("Confirmed payment {} -> PAID", saved.getTransactionCode());
        return toResponse(saved);
    }

    @Transactional
    public PaymentTransactionResponse processWebhookCallback(
            String provider,
            PaymentWebhookCallbackRequest request) {
        PaymentTransaction tx = findOrThrow(request.getTransactionCode());
        if (Boolean.TRUE.equals(tx.getIsDeleted())) {
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND);
        }
        if (!verifyWebhookSignature(request, tx)) {
            throw new AppException(ErrorCode.WEBHOOK_SIGNATURE_INVALID);
        }
        if (request.getPaidAmountVnd() != null && !Objects.equals(request.getPaidAmountVnd(), tx.getTotalAmountVnd())) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_STATE,
                    "Số tiền thanh toán thực tế (" + request.getPaidAmountVnd() + " ₫) không khớp giá trị hóa đơn ("
                            + tx.getTotalAmountVnd() + " ₫)");
        }
        if ("PAID".equals(tx.getPaymentStatus())) {
            return toResponse(tx);
        }
        if ("REFUNDED".equals(tx.getPaymentStatus())) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_STATE, "Giao dịch đã hoàn tiền trước khi nhận webhook");
        }

        String previousStatus = tx.getPaymentStatus();
        tx.setPaymentStatus("PAID");
        tx.setConfirmationSource("VERIFIED_WEBHOOK");
        tx.setPaidAt(Instant.now());
        tx.setGatewayProvider(
                provider != null && !provider.isBlank() ? provider.toUpperCase() : tx.getGatewayProvider());
        tx.setGatewayReference(
                request.getGatewayReference() != null && !request.getGatewayReference().isBlank()
                        ? request.getGatewayReference().trim()
                        : "WH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        if (request.getPayerName() != null && !request.getPayerName().isBlank()) {
            tx.setPayerName(request.getPayerName().trim());
        }
        tx.setNotes("Xác nhận tự động qua Webhook " + tx.getGatewayProvider() + " (" + tx.getGatewayReference() + ")");

        PaymentTransaction saved = transactionRepository.save(tx);
        transactionRepository.flush();
        if ("PAID".equals(saved.getPaymentStatus()))
            evidenceService.capture(saved);
        if ("NET30_CREDIT".equals(previousStatus)) {
            releaseMsaCreditIfPresent(saved.getCustomerId(), saved.getTotalAmountVnd());
        }
        recordAudit(
                saved.getTransactionCode(),
                "WEBHOOK_CONFIRMED",
                previousStatus,
                "PAID",
                tx.getGatewayProvider(),
                "Webhook đối soát tự động thành công: " + saved.getGatewayReference());
        return toResponse(saved);
    }

    @Transactional
    public PaymentTransactionResponse refundPayment(String transactionCode, RefundPaymentRequest request) {
        PaymentTransaction tx = findOrThrow(transactionCode);

        if ("REFUNDED".equals(tx.getPaymentStatus())) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_STATE, "Giao dịch đã được hoàn tiền trước đó");
        }

        String previousStatus = tx.getPaymentStatus();
        tx.setPaymentStatus("REFUNDED");
        String reason = (request != null && request.getReason() != null && !request.getReason().isBlank())
                ? request.getReason().trim()
                : "Khách hàng yêu cầu hoàn tiền / hủy hóa đơn trước khi xuất bến";
        tx.setNotes(reason);

        PaymentTransaction saved = transactionRepository.save(tx);
        transactionRepository.flush();
        if ("PAID".equals(saved.getPaymentStatus()))
            evidenceService.capture(saved);
        if ("NET30_CREDIT".equals(previousStatus)) {
            releaseMsaCreditIfPresent(saved.getCustomerId(), saved.getTotalAmountVnd());
        }
        recordAudit(
                saved.getTransactionCode(),
                "REFUNDED",
                previousStatus,
                "REFUNDED",
                (request != null && request.getActor() != null && !request.getActor().isBlank()) ? request.getActor()
                        : tx.getCustomerId(),
                reason);

        log.info("Refunded payment {} from {}", saved.getTransactionCode(), previousStatus);
        return toResponse(saved);
    }

    private void reserveMsaCreditIfPresent(String customerId, long amountVnd) {
        B2bContract msa = contractRepository.findTopByCustomerIdAndContractTypeAndContractStatusOrderByCreatedAtDesc(
                customerId, "MASTER_MSA", "SIGNED_ACTIVE")
                .orElseThrow(() -> new AppException(ErrorCode.CONTRACT_INVALID_STATE,
                        "Doanh nghiệp chưa có Hợp đồng khung Master MSA đang hiệu lực để ghi công nợ Net-30"));
        financialValidator.validateMsaCreditCapacity(msa, amountVnd);
        long used = msa.getUsedCreditVnd() != null ? msa.getUsedCreditVnd() : 0L;
        msa.setUsedCreditVnd(used + amountVnd);
        contractRepository.save(msa);
    }

    private void releaseMsaCreditIfPresent(String customerId, long amountVnd) {
        contractRepository.findTopByCustomerIdAndContractTypeAndContractStatusOrderByCreatedAtDesc(
                customerId, "MASTER_MSA", "SIGNED_ACTIVE")
                .ifPresent(msa -> {
                    long used = msa.getUsedCreditVnd() != null ? msa.getUsedCreditVnd() : 0L;
                    msa.setUsedCreditVnd(Math.max(0L, used - amountVnd));
                    contractRepository.save(msa);
                });
    }

    private PaymentTransaction findOrThrow(String transactionCode) {
        return transactionRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
    }

    private double resolveDiscountRate(String powertrain) {
        if (powertrain.contains("EV") || powertrain.contains("ELECTRIC") || powertrain.contains("BEV")) {
            return paymentProperties.getEvGreenDiscountRate();
        }
        if (powertrain.contains("LNG") || powertrain.contains("HYBRID")) {
            return paymentProperties.getLngGreenDiscountRate();
        }
        return 0.0;
    }

    private String buildQrPayload(String transactionCode, String shipmentCode, long amountVnd, String method) {
        return String.format(
                "VIETQR|BANK=%s|ACC=%s|NAME=%s|AMT=%d|CUR=VND|ADDINFO=CCADRO %s %s|METHOD=%s",
                paymentProperties.getMerchantBankCode(),
                paymentProperties.getMerchantAccountNo(),
                paymentProperties.getMerchantAccountName(),
                amountVnd,
                shipmentCode,
                transactionCode,
                method);
    }

    private void recordAudit(
            String transactionCode,
            String eventType,
            String previousStatus,
            String newStatus,
            String actor,
            String detail) {
        auditLogRepository.save(PaymentAuditLog.builder()
                .transactionCode(transactionCode)
                .eventType(eventType)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .actor(actor != null ? actor : "SYSTEM")
                .detail(detail)
                .build());
    }

    private PaymentTransactionResponse toResponse(PaymentTransaction tx) {
        return paymentMapper.toResponse(tx);
    }

    public Map<String, Object> getGatewayStatus() {
        boolean vnpayLive = isNotBlank(paymentProperties.getVnpayTmnCode())
                && isNotBlank(paymentProperties.getVnpayHashSecret());
        boolean payosLive = isNotBlank(paymentProperties.getPayosClientId())
                && isNotBlank(paymentProperties.getPayosApiKey())
                && isNotBlank(paymentProperties.getPayosChecksumKey());
        boolean anyLive = vnpayLive || payosLive;
        return Map.of(
                "mode", anyLive ? "LIVE_3RD_PARTY" : "SANDBOX_LEDGER",
                "vnpayConfigured", vnpayLive,
                "payosConfigured", payosLive,
                "thirdPartyRequiredForRealCharge", true,
                "note", anyLive
                        ? "Đã cấu hình cổng thanh toán bên thứ 3 (VNPay/PayOS)."
                        : "Đang chạy sổ cái Sandbox nội bộ & VietQR tĩnh. Để tự động trừ tiền/nhận biến động số dư thật, cần cấu hình VNPay (CCADRO_VNPAY_TMN_CODE + CCADRO_VNPAY_HASH_SECRET) hoặc PayOS/SePay.");
    }

    @Transactional
    public Map<String, Object> createCheckoutSession(String transactionCode, String provider) {
        PaymentTransaction tx = findOrThrow(transactionCode);
        String resolvedProvider = isNotBlank(provider) ? provider.trim().toUpperCase() : "VNPAY";

        if ("VNPAY".equals(resolvedProvider)
                && isNotBlank(paymentProperties.getVnpayTmnCode())
                && isNotBlank(paymentProperties.getVnpayHashSecret())) {
            String checkoutUrl = buildSignedVnpayUrl(tx);
            return Map.of(
                    "provider", "VNPAY",
                    "mode", "LIVE_SIGNED_URL",
                    "transactionCode", tx.getTransactionCode(),
                    "amountVnd", tx.getTotalAmountVnd(),
                    "checkoutUrl", checkoutUrl);
        }

        return Map.of(
                "provider", resolvedProvider,
                "mode", "SANDBOX",
                "transactionCode", tx.getTransactionCode(),
                "amountVnd", tx.getTotalAmountVnd(),
                "qrPayload", tx.getQrPayload() != null ? tx.getQrPayload() : "",
                "note", "Chưa cấu hình Merchant Key bên thứ 3; sử dụng VietQR tĩnh & xác nhận Sandbox.");
    }

    private boolean verifyWebhookSignature(PaymentWebhookCallbackRequest request, PaymentTransaction tx) {
        String provided = request.getSignature();
        String secret = paymentProperties.getWebhookSecret();
        if (!isNotBlank(provided) || !isNotBlank(secret)) {
            return false;
        }
        // Strict cryptographic HMAC-SHA256 verification:
        // HmacSHA256(transactionCode|amount, webhookSecret)
        long amount = request.getPaidAmountVnd() != null ? request.getPaidAmountVnd() : tx.getTotalAmountVnd();
        String data = tx.getTransactionCode() + "|" + amount;
        String expectedHmac = hmacHex("HmacSHA256", secret, data);
        return MessageDigest.isEqual(
                provided.trim().toLowerCase().getBytes(StandardCharsets.UTF_8),
                expectedHmac.getBytes(StandardCharsets.UTF_8));
    }

    private String buildSignedVnpayUrl(PaymentTransaction tx) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
        String now = fmt.format(Instant.now());
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", paymentProperties.getVnpayTmnCode().trim());
        params.put("vnp_Amount", String.valueOf(tx.getTotalAmountVnd() * 100L));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", tx.getTransactionCode());
        params.put("vnp_OrderInfo", "Thanh toan CCADRO " + tx.getTransactionCode());
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", paymentProperties.getVnpayReturnUrl());
        params.put("vnp_IpAddr", "127.0.0.1");
        params.put("vnp_CreateDate", now);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String encodedKey = URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII);
            String encodedVal = URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII);
            if (hashData.length() > 0) {
                hashData.append('&');
                query.append('&');
            }
            hashData.append(entry.getKey()).append('=').append(encodedVal);
            query.append(encodedKey).append('=').append(encodedVal);
        }
        String secureHash = hmacHex("HmacSHA512", paymentProperties.getVnpayHashSecret().trim(), hashData.toString());
        return paymentProperties.getVnpayPayUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    static String hmacHex(String algorithm, String secret, String data) {
        try {
            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), algorithm));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC calculation failed", e);
        }
    }

    private boolean isNotBlank(String s) {
        return s != null && !s.isBlank();
    }

}

    }

    private boolean isNotBlank(String s) {
        return s != null && !s.isBlank();
    }
}
