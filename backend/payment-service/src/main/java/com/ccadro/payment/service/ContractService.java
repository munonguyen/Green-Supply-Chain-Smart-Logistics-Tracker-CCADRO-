package com.ccadro.payment.service;

import com.ccadro.payment.configuration.PaymentProperties;
import com.ccadro.payment.dto.request.CreateContractRequest;
import com.ccadro.payment.dto.request.RecordSlaEventRequest;
import com.ccadro.payment.dto.request.SettleContractRequest;
import com.ccadro.payment.dto.request.SignContractRequest;
import com.ccadro.payment.dto.response.B2bContractResponse;
import com.ccadro.payment.dto.response.ContractSlaEventResponse;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.ContractSlaEvent;
import com.ccadro.payment.entity.PaymentAuditLog;
import com.ccadro.payment.exception.AppException;
import com.ccadro.payment.exception.ErrorCode;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.ContractSlaEventRepository;
import com.ccadro.payment.repository.PaymentAuditLogRepository;
import com.ccadro.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContractService {

    private final B2bContractRepository contractRepository;
    private final ContractSlaEventRepository slaEventRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentAuditLogRepository paymentAuditLogRepository;
    private final PaymentProperties paymentProperties;

    @Transactional(readOnly = true)
    public List<B2bContractResponse> getContracts(String customerId, String contractType, String status, String shipmentCode) {
        List<B2bContract> list;
        if (shipmentCode != null && !shipmentCode.isBlank()) {
            list = contractRepository.findTopByShipmentCodeOrderByCreatedAtDesc(shipmentCode.trim())
                    .map(List::of)
                    .orElse(List.of());
        } else if (customerId != null && !customerId.isBlank() && status != null && !status.isBlank()) {
            list = contractRepository.findByCustomerIdAndContractStatusOrderByCreatedAtDesc(
                    customerId.trim(), status.trim().toUpperCase());
        } else if (customerId != null && !customerId.isBlank()) {
            list = contractRepository.findByCustomerIdOrderByCreatedAtDesc(customerId.trim());
        } else {
            list = contractRepository.findAllByOrderByCreatedAtDesc();
        }

        if (contractType != null && !contractType.isBlank()) {
            String typeNorm = contractType.trim().toUpperCase();
            list = list.stream().filter(c -> typeNorm.equals(c.getContractType())).toList();
        }

        return list.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public B2bContractResponse getContract(String contractNumber) {
        return toResponse(findOrThrow(contractNumber));
    }

    @Transactional(readOnly = true)
    public List<ContractSlaEventResponse> getContractEvents(String contractNumber) {
        findOrThrow(contractNumber);
        return slaEventRepository.findByContractNumberOrderByCreatedAtDesc(contractNumber)
                .stream()
                .map(ev -> ContractSlaEventResponse.builder()
                        .id(ev.getId())
                        .contractNumber(ev.getContractNumber())
                        .shipmentCode(ev.getShipmentCode())
                        .eventType(ev.getEventType())
                        .severity(ev.getSeverity())
                        .penaltyAmountVnd(ev.getPenaltyAmountVnd())
                        .recordedBy(ev.getRecordedBy())
                        .description(ev.getDescription())
                        .createdAt(ev.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public B2bContractResponse createContract(CreateContractRequest request) {
        String type = request.getContractType() != null && !request.getContractType().isBlank()
                ? request.getContractType().trim().toUpperCase()
                : "SPOT_TRIP";

        String year = String.valueOf(Year.now().getValue());
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String contractNumber = "MASTER_MSA".equals(type)
                ? "HDK-CCADRO-" + year + "-" + suffix
                : (request.getShipmentCode() != null && !request.getShipmentCode().isBlank()
                    ? "HD-" + request.getShipmentCode().trim()
                    : "HD-" + year + "-" + suffix);

        String parentMsa = request.getParentContractNumber();
        if ((parentMsa == null || parentMsa.isBlank()) && !"MASTER_MSA".equals(type)) {
            parentMsa = contractRepository
                    .findTopByCustomerIdAndContractTypeAndContractStatusOrderByCreatedAtDesc(
                            request.getCustomerId().trim(), "MASTER_MSA", "SIGNED_ACTIVE")
                    .map(B2bContract::getContractNumber)
                    .orElse(null);
        }

        long valueVnd = request.getContractValueVnd() != null ? request.getContractValueVnd() : 0L;
        long creditLimit = request.getCreditLimitVnd() != null
                ? request.getCreditLimitVnd()
                : paymentProperties.getDefaultCreditLimitVnd();

        boolean autoSign = Boolean.TRUE.equals(request.getAutoSign());
        Instant now = Instant.now();
        String signer = request.getSignedByCustomerUser() != null && !request.getSignedByCustomerUser().isBlank()
                ? request.getSignedByCustomerUser().trim()
                : request.getCustomerId().trim();

        B2bContract entity = B2bContract.builder()
                .contractNumber(contractNumber)
                .contractType(type)
                .parentContractNumber(parentMsa)
                .shipmentCode(request.getShipmentCode())
                .customerId(request.getCustomerId().trim())
                .customerName(request.getCustomerName().trim())
                .signedByCustomerUser(autoSign ? signer : null)
                .customerSignatureHash(autoSign ? sha256Signature(contractNumber, signer, now) : null)
                .corridorScope(request.getCorridorScope())
                .containerCode(request.getContainerCode())
                .eSealNumber(request.getESealNumber())
                .vehicleType(request.getVehicleType())
                .licensePlate(request.getLicensePlate())
                .slaOnTimeRatePct(request.getSlaOnTimeRatePct() != null
                        ? request.getSlaOnTimeRatePct() : paymentProperties.getDefaultSlaOnTimePct())
                .slaMaxTempDeviationC(request.getSlaMaxTempDeviationC() != null
                        ? request.getSlaMaxTempDeviationC() : paymentProperties.getDefaultMaxTempDeviationC())
                .slaPenaltyPctPerBreach(request.getSlaPenaltyPctPerBreach() != null
                        ? request.getSlaPenaltyPctPerBreach() : paymentProperties.getDefaultSlaPenaltyPct())
                .minCo2ReductionKg(request.getMinCo2ReductionKg() != null ? request.getMinCo2ReductionKg() : 0.0)
                .creditLimitVnd(creditLimit)
                .usedCreditVnd(0L)
                .contractValueVnd(valueVnd)
                .slaPenaltyDeductionVnd(0L)
                .finalSettlementVnd(valueVnd)
                .paymentTerms(request.getPaymentTerms() != null ? request.getPaymentTerms().toUpperCase() : "NET30")
                .contractStatus(autoSign ? "SIGNED_ACTIVE" : "DRAFT")
                .effectiveFrom(now)
                .effectiveTo("MASTER_MSA".equals(type)
                        ? now.plus(365, ChronoUnit.DAYS)
                        : now.plus(30, ChronoUnit.DAYS))
                .signedAt(autoSign ? now : null)
                .notes(request.getNotes())
                .build();

        B2bContract saved = contractRepository.save(entity);
        recordSlaEvent(
                saved.getContractNumber(),
                saved.getShipmentCode(),
                autoSign ? "SIGNED" : "CREATED",
                "INFO",
                0L,
                signer,
                (autoSign ? "Khởi tạo & ký số hợp đồng " : "Khởi tạo dự thảo hợp đồng ") + saved.getContractNumber()
        );
        return toResponse(saved);
    }

    @Transactional
    public B2bContractResponse signContract(String contractNumber, SignContractRequest request) {
        B2bContract contract = findOrThrow(contractNumber);
        if ("CANCELLED".equals(contract.getContractStatus()) || "SETTLED".equals(contract.getContractStatus())) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATE);
        }

        Instant now = Instant.now();
        String signer = (request != null && request.getSignedByUsername() != null && !request.getSignedByUsername().isBlank())
                ? request.getSignedByUsername().trim()
                : contract.getCustomerId();
        String sigHash = sha256Signature(contract.getContractNumber(), signer, now);

        contract.setSignedByCustomerUser(signer);
        contract.setCustomerSignatureHash(sigHash);
        contract.setContractStatus("SIGNED_ACTIVE");
        contract.setSignedAt(now);
        if (request != null && request.getNotes() != null && !request.getNotes().isBlank()) {
            contract.setNotes(request.getNotes().trim());
        }

        B2bContract saved = contractRepository.save(contract);
        recordSlaEvent(
                saved.getContractNumber(),
                saved.getShipmentCode(),
                "SIGNED",
                "INFO",
                0L,
                signer,
                "Ký số xác nhận hợp đồng (" + sigHash.substring(0, 22) + "...)"
        );
        return toResponse(saved);
    }

    @Transactional
    public B2bContractResponse recordSlaEvent(String contractNumber, RecordSlaEventRequest request) {
        B2bContract contract = findOrThrow(contractNumber);
        if ("SETTLED".equals(contract.getContractStatus()) || "CANCELLED".equals(contract.getContractStatus())) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATE, "Hợp đồng đã tất toán hoặc hủy, không thể ghi nhận SLA mới");
        }

        String eventType = request.getEventType().trim().toUpperCase();
        boolean isBreach = eventType.contains("BREACH") || eventType.contains("DEVIATION") || "BREACH".equalsIgnoreCase(request.getSeverity());

        long penalty = 0L;
        if (isBreach) {
            if (request.getPenaltyAmountVnd() != null && request.getPenaltyAmountVnd() > 0) {
                penalty = request.getPenaltyAmountVnd();
            } else {
                long baseValue = contract.getContractValueVnd() != null ? contract.getContractValueVnd() : 0L;
                double pct = contract.getSlaPenaltyPctPerBreach() != null ? contract.getSlaPenaltyPctPerBreach() : 5.0;
                penalty = Math.round(baseValue * (pct / 100.0));
            }
        }

        long currentDeduction = contract.getSlaPenaltyDeductionVnd() != null ? contract.getSlaPenaltyDeductionVnd() : 0L;
        long nextDeduction = Math.min(contract.getContractValueVnd(), currentDeduction + penalty);
        contract.setSlaPenaltyDeductionVnd(nextDeduction);
        contract.setFinalSettlementVnd(Math.max(0L, contract.getContractValueVnd() - nextDeduction));

        B2bContract saved = contractRepository.save(contract);
        recordSlaEvent(
                saved.getContractNumber(),
                saved.getShipmentCode(),
                eventType,
                isBreach ? "BREACH" : (request.getSeverity() != null ? request.getSeverity().toUpperCase() : "INFO"),
                penalty,
                request.getRecordedBy() != null ? request.getRecordedBy() : "TELEMETRY_MONITOR",
                request.getDescription() != null ? request.getDescription()
                        : (isBreach ? "Vi phạm cam kết SLA — tự động giảm trừ " + penalty + " VND" : "Đạt chuẩn SLA hành trình")
        );
        return toResponse(saved);
    }

    @Transactional
    public B2bContractResponse settleContractWithEpod(String contractNumber, SettleContractRequest request) {
        B2bContract contract = findOrThrow(contractNumber);
        if ("CANCELLED".equals(contract.getContractStatus())) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATE);
        }

        String signer = (request != null && request.getEpodSignerName() != null && !request.getEpodSignerName().isBlank())
                ? request.getEpodSignerName().trim()
                : contract.getCustomerName();

        long deduction = contract.getSlaPenaltyDeductionVnd() != null ? contract.getSlaPenaltyDeductionVnd() : 0L;
        long contractVal = contract.getContractValueVnd() != null ? contract.getContractValueVnd() : 0L;
        long settledValue = Math.max(0L, contractVal - deduction);

        contract.setFinalSettlementVnd(settledValue);
        contract.setContractStatus("SETTLED");
        contract.setSettledAt(Instant.now());
        if (request != null && request.getNotes() != null && !request.getNotes().isBlank()) {
            contract.setNotes(request.getNotes().trim());
        }

        B2bContract saved = contractRepository.save(contract);
        recordSlaEvent(
                saved.getContractNumber(),
                saved.getShipmentCode(),
                "SETTLED",
                "INFO",
                0L,
                signer,
                "Nghiệm thu ePOD & chốt đối soát hợp đồng: giá trị quyết toán " + settledValue + " VNĐ (giảm trừ SLA: " + deduction + " VNĐ)"
        );

        // Đồng bộ giảm trừ SLA sang PaymentTransaction đang mở (nếu có)
        if (saved.getShipmentCode() != null && !saved.getShipmentCode().isBlank()) {
            paymentTransactionRepository.findTopByShipmentCodeOrderByCreatedAtDesc(saved.getShipmentCode())
                    .ifPresent(tx -> {
                        if (!"PAID".equals(tx.getPaymentStatus()) && !"REFUNDED".equals(tx.getPaymentStatus())) {
                            long netBase = Math.max(0L, tx.getBaseFreightVnd() - deduction);
                            long esgDiscount = Math.min(tx.getGreenEsgDiscountVnd(), netBase);
                            long taxable = Math.max(0L, netBase - esgDiscount);
                            long vat = Math.round(taxable * paymentProperties.getVatRate());
                            tx.setVatAmountVnd(vat);
                            tx.setTotalAmountVnd(taxable + vat);
                            tx.setNotes("Đã chốt ePOD & đối soát hợp đồng " + saved.getContractNumber()
                                    + (deduction > 0 ? " (giảm trừ SLA " + deduction + " ₫)" : ""));
                            paymentTransactionRepository.save(tx);

                            paymentAuditLogRepository.save(PaymentAuditLog.builder()
                                    .transactionCode(tx.getTransactionCode())
                                    .eventType("SLA_SETTLED")
                                    .previousStatus(tx.getPaymentStatus())
                                    .newStatus(tx.getPaymentStatus())
                                    .actor(signer)
                                    .detail("Đồng bộ nghiệm thu ePOD từ hợp đồng " + saved.getContractNumber()
                                            + " — tổng phải thu sau đối soát: " + tx.getTotalAmountVnd() + " VNĐ")
                                    .build());
                        }
                    });
        }

        return toResponse(saved);
    }

    private B2bContract findOrThrow(String contractNumber) {
        return contractRepository.findByContractNumber(contractNumber)
                .orElseThrow(() -> new AppException(ErrorCode.CONTRACT_NOT_FOUND));
    }

    private void recordSlaEvent(
            String contractNumber,
            String shipmentCode,
            String eventType,
            String severity,
            long penaltyAmountVnd,
            String recordedBy,
            String description
    ) {
        slaEventRepository.save(ContractSlaEvent.builder()
                .contractNumber(contractNumber)
                .shipmentCode(shipmentCode)
                .eventType(eventType)
                .severity(severity)
                .penaltyAmountVnd(penaltyAmountVnd)
                .recordedBy(recordedBy)
                .description(description)
                .build());
    }

    private String sha256Signature(String contractNumber, String signer, Instant timestamp) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((contractNumber + "|" + signer + "|" + timestamp.toEpochMilli())
                    .getBytes(StandardCharsets.UTF_8));
            return "SHA256:" + HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            return "SHA256:" + UUID.randomUUID().toString().replace("-", "");
        }
    }

    private B2bContractResponse toResponse(B2bContract c) {
        long limit = c.getCreditLimitVnd() != null ? c.getCreditLimitVnd() : 0L;
        long used = c.getUsedCreditVnd() != null ? c.getUsedCreditVnd() : 0L;
        return B2bContractResponse.builder()
                .id(c.getId())
                .contractNumber(c.getContractNumber())
                .contractType(c.getContractType())
                .parentContractNumber(c.getParentContractNumber())
                .shipmentCode(c.getShipmentCode())
                .customerId(c.getCustomerId())
                .customerName(c.getCustomerName())
                .signedByCustomerUser(c.getSignedByCustomerUser())
                .customerSignatureHash(c.getCustomerSignatureHash())
                .providerName(c.getProviderName())
                .corridorScope(c.getCorridorScope())
                .containerCode(c.getContainerCode())
                .eSealNumber(c.getESealNumber())
                .vehicleType(c.getVehicleType())
                .licensePlate(c.getLicensePlate())
                .slaOnTimeRatePct(c.getSlaOnTimeRatePct())
                .slaMaxTempDeviationC(c.getSlaMaxTempDeviationC())
                .slaPenaltyPctPerBreach(c.getSlaPenaltyPctPerBreach())
                .minCo2ReductionKg(c.getMinCo2ReductionKg())
                .creditLimitVnd(limit)
                .usedCreditVnd(used)
                .availableCreditVnd(Math.max(0L, limit - used))
                .contractValueVnd(c.getContractValueVnd())
                .slaPenaltyDeductionVnd(c.getSlaPenaltyDeductionVnd())
                .finalSettlementVnd(c.getFinalSettlementVnd())
                .paymentTerms(c.getPaymentTerms())
                .contractStatus(c.getContractStatus())
                .effectiveFrom(c.getEffectiveFrom())
                .effectiveTo(c.getEffectiveTo())
                .signedAt(c.getSignedAt())
                .settledAt(c.getSettledAt())
                .notes(c.getNotes())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}

