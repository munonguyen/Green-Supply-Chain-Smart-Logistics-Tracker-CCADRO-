package com.ccadro.payment.service;

import com.ccadro.payment.configuration.PaymentProperties;
import com.ccadro.payment.dto.request.ConfirmPaymentRequest;
import com.ccadro.payment.dto.request.CreatePaymentRequest;
import com.ccadro.payment.dto.request.PaymentWebhookCallbackRequest;
import com.ccadro.payment.dto.request.RefundPaymentRequest;
import com.ccadro.payment.dto.response.PaymentAuditLogResponse;
import com.ccadro.payment.dto.response.PaymentSummaryResponse;
import com.ccadro.payment.dto.response.PaymentTransactionResponse;
import com.ccadro.payment.entity.PaymentAuditLog;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.exception.AppException;
import com.ccadro.payment.exception.ErrorCode;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.PaymentAuditLogRepository;
import com.ccadro.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private static final Set<String> SUPPORTED_METHODS = Set.of(
            "VIETQR_NAPAS",
            "VNPAY_QR",
            "MOMO_WALLET",
            "CORPORATE_CARD",
            "GREEN_CREDIT_NET30"
    );

    private static final Map<String, String> GATEWAY_PROVIDER_MAP = Map.of(
            "VIETQR_NAPAS", "NAPAS_VIETQR_247",
            "VNPAY_QR", "VNPAY_GATEWAY",
            "MOMO_WALLET", "MOMO_BUSINESS_WALLET",
            "CORPORATE_CARD", "ONEPAY_VISA_MC",
            "GREEN_CREDIT_NET30", "CCADRO_GREEN_CREDIT"
    );

    private final PaymentTransactionRepository transactionRepository;
    private final PaymentAuditLogRepository auditLogRepository;
    private final B2bContractRepository contractRepository;
    private final PaymentProperties paymentProperties;

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getPayments(String customerId, String status, String shipmentCode) {
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
        return list.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PaymentTransactionResponse getByTransactionCode(String transactionCode) {
        PaymentTransaction tx = findOrThrow(transactionCode);
        return toResponse(tx);
    }

    @Transactional(readOnly = true)
    public List<PaymentAuditLogResponse> getAuditLogs(String transactionCode) {
        findOrThrow(transactionCode);
        return auditLogRepository.findByTransactionCodeOrderByCreatedAtDesc(transactionCode)
                .stream()
                .map(entry -> PaymentAuditLogResponse.builder()
                        .id(entry.getId())
                        .transactionCode(entry.getTransactionCode())
                        .eventType(entry.getEventType())
                        .previousStatus(entry.getPreviousStatus())
                        .newStatus(entry.getNewStatus())
                        .actor(entry.getActor())
                        .detail(entry.getDetail())
                        .createdAt(entry.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentSummaryResponse getSummary(String customerId) {
        List<PaymentTransaction> list = (customerId != null && !customerId.isBlank())
                ? transactionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId.trim())
                : transactionRepository.findAllByOrderByCreatedAtDesc();

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
        String method = normalizePaymentMethod(request.getPaymentMethod());
        String powertrain = normalizePowertrain(request.getPowertrainType());

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
                .paidAt(instantPaid ? now : null)
                .dueAt(now.plus(dueDays, ChronoUnit.DAYS))
                .build();

        PaymentTransaction saved = transactionRepository.save(tx);
        recordAudit(
                saved.getTransactionCode(),
                instantPaid ? "INSTANT_PAID" : isNet30 ? "NET30_APPROVED" : "CREATED",
                null,
                saved.getPaymentStatus(),
                saved.getCreatedByUsername() != null ? saved.getCreatedByUsername() : saved.getCustomerId(),
                "Khởi tạo hóa đơn " + saved.getInvoiceNumber() + " cho vận đơn " + saved.getShipmentCode()
                        + " (" + saved.getTotalAmountVnd() + " VND)"
        );

        log.info("Created payment {} for shipment {} status={}", saved.getTransactionCode(), saved.getShipmentCode(), saved.getPaymentStatus());
        return toResponse(saved);
    }

    @Transactional
    public PaymentTransactionResponse confirmPayment(String transactionCode, ConfirmPaymentRequest request) {
        PaymentTransaction tx = findOrThrow(transactionCode);

        if ("PAID".equals(tx.getPaymentStatus())) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_PAID);
        }
        if ("REFUNDED".equals(tx.getPaymentStatus())) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_STATE, "Giao dịch đã hoàn tiền, không thể xác nhận thanh toán");
        }

        String previousStatus = tx.getPaymentStatus();
        String method = (request != null && request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank())
                ? normalizePaymentMethod(request.getPaymentMethod())
                : tx.getPaymentMethod();

        tx.setPaymentMethod(method);
        tx.setGatewayProvider(GATEWAY_PROVIDER_MAP.get(method));
        tx.setPaymentStatus("PAID");
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
        if ("NET30_CREDIT".equals(previousStatus)) {
            releaseMsaCreditIfPresent(saved.getCustomerId(), saved.getTotalAmountVnd());
        }
        recordAudit(
                saved.getTransactionCode(),
                "CONFIRMED_PAID",
                previousStatus,
                "PAID",
                saved.getGatewayProvider(),
                "Xác nhận thanh toán thành công qua " + saved.getPaymentMethod() + " (Ref: " + saved.getGatewayReference() + ")"
        );

        log.info("Confirmed payment {} -> PAID", saved.getTransactionCode());
        return toResponse(saved);
    }

    @Transactional
    public PaymentTransactionResponse processWebhookCallback(
            String provider,
            PaymentWebhookCallbackRequest request
    ) {
        String expectedSecret = paymentProperties.getWebhookSecret();
        if (request.getSignature() == null || !request.getSignature().equals(expectedSecret)) {
            throw new AppException(ErrorCode.WEBHOOK_SIGNATURE_INVALID);
        }

        PaymentTransaction tx = findOrThrow(request.getTransactionCode());
        if ("PAID".equals(tx.getPaymentStatus())) {
            return toResponse(tx);
        }
        if ("REFUNDED".equals(tx.getPaymentStatus())) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_STATE, "Giao dịch đã hoàn tiền trước khi nhận webhook");
        }

        String previousStatus = tx.getPaymentStatus();
        tx.setPaymentStatus("PAID");
        tx.setPaidAt(Instant.now());
        tx.setGatewayProvider(provider != null && !provider.isBlank() ? provider.toUpperCase() : tx.getGatewayProvider());
        tx.setGatewayReference(
                request.getGatewayReference() != null && !request.getGatewayReference().isBlank()
                        ? request.getGatewayReference().trim()
                        : "WH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
        );
        if (request.getPayerName() != null && !request.getPayerName().isBlank()) {
            tx.setPayerName(request.getPayerName().trim());
        }
        tx.setNotes("Xác nhận tự động qua Webhook " + tx.getGatewayProvider() + " (" + tx.getGatewayReference() + ")");

        PaymentTransaction saved = transactionRepository.save(tx);
        if ("NET30_CREDIT".equals(previousStatus)) {
            releaseMsaCreditIfPresent(saved.getCustomerId(), saved.getTotalAmountVnd());
        }
        recordAudit(
                saved.getTransactionCode(),
                "WEBHOOK_CONFIRMED",
                previousStatus,
                "PAID",
                tx.getGatewayProvider(),
                "Webhook đối soát tự động thành công: " + saved.getGatewayReference()
        );
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
        if ("NET30_CREDIT".equals(previousStatus)) {
            releaseMsaCreditIfPresent(saved.getCustomerId(), saved.getTotalAmountVnd());
        }
        recordAudit(
                saved.getTransactionCode(),
                "REFUNDED",
                previousStatus,
                "REFUNDED",
                (request != null && request.getActor() != null && !request.getActor().isBlank()) ? request.getActor() : tx.getCustomerId(),
                reason
        );

        log.info("Refunded payment {} from {}", saved.getTransactionCode(), previousStatus);
        return toResponse(saved);
    }

    private void reserveMsaCreditIfPresent(String customerId, long amountVnd) {
        contractRepository.findTopByCustomerIdAndContractTypeAndContractStatusOrderByCreatedAtDesc(
                        customerId, "MASTER_MSA", "SIGNED_ACTIVE")
                .ifPresent(msa -> {
                    long limit = msa.getCreditLimitVnd() != null ? msa.getCreditLimitVnd() : 0L;
                    long used = msa.getUsedCreditVnd() != null ? msa.getUsedCreditVnd() : 0L;
                    if (limit > 0 && used + amountVnd > limit) {
                        throw new AppException(ErrorCode.CREDIT_LIMIT_EXCEEDED,
                                "Hạn mức Net-30 còn lại (" + (limit - used) + " ₫) không đủ cho hóa đơn " + amountVnd + " ₫");
                    }
                    msa.setUsedCreditVnd(used + amountVnd);
                    contractRepository.save(msa);
                });
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

    private String normalizePaymentMethod(String method) {
        String normalized = method == null ? "" : method.trim().toUpperCase();
        if (!SUPPORTED_METHODS.contains(normalized)) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_METHOD,
                    "Phương thức thanh toán không hợp lệ: " + method);
        }
        return normalized;
    }

    private String normalizePowertrain(String powertrainType) {
        if (powertrainType == null || powertrainType.isBlank()) {
            return "EV";
        }
        return powertrainType.trim().toUpperCase();
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
                method
        );
    }

    private void recordAudit(
            String transactionCode,
            String eventType,
            String previousStatus,
            String newStatus,
            String actor,
            String detail
    ) {
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
        return PaymentTransactionResponse.builder()
                .id(tx.getId())
                .transactionCode(tx.getTransactionCode())
                .invoiceNumber(tx.getInvoiceNumber())
                .shipmentCode(tx.getShipmentCode())
                .customerId(tx.getCustomerId())
                .customerName(tx.getCustomerName())
                .createdByUsername(tx.getCreatedByUsername())
                .originName(tx.getOriginName())
                .destinationName(tx.getDestinationName())
                .containerCode(tx.getContainerCode())
                .vehicleType(tx.getVehicleType())
                .powertrainType(tx.getPowertrainType())
                .paymentMethod(tx.getPaymentMethod())
                .currency(tx.getCurrency())
                .baseFreightVnd(tx.getBaseFreightVnd())
                .greenEsgDiscountVnd(tx.getGreenEsgDiscountVnd())
                .vatAmountVnd(tx.getVatAmountVnd())
                .totalAmountVnd(tx.getTotalAmountVnd())
                .co2SavedKg(tx.getCo2SavedKg())
                .paymentStatus(tx.getPaymentStatus())
                .gatewayProvider(tx.getGatewayProvider())
                .gatewayReference(tx.getGatewayReference())
                .qrPayload(tx.getQrPayload())
                .bankCode(tx.getBankCode())
                .bankAccountNo(tx.getBankAccountNo())
                .cardLast4(tx.getCardLast4())
                .payerName(tx.getPayerName())
                .notes(tx.getNotes())
                .paidAt(tx.getPaidAt())
                .dueAt(tx.getDueAt())
                .createdAt(tx.getCreatedAt())
                .updatedAt(tx.getUpdatedAt())
                .build();
    }
}

