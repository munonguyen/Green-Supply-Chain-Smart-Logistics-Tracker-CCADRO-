package com.ccadro.payment.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class B2bContractResponse {
    private UUID id;
    private String contractNumber;
    private String contractType;
    private String parentContractNumber;
    private String shipmentCode;
    private String customerId;
    private String customerName;
    private String signedByCustomerUser;
    private String customerSignatureHash;
    private String providerName;
    private String corridorScope;
    private String containerCode;
    private String eSealNumber;
    private String vehicleType;
    private String licensePlate;
    private Double slaOnTimeRatePct;
    private Double slaMaxTempDeviationC;
    private Double slaPenaltyPctPerBreach;
    private Double minCo2ReductionKg;
    private Long creditLimitVnd;
    private Long usedCreditVnd;
    private Long availableCreditVnd;
    private Long contractValueVnd;
    private Long slaPenaltyDeductionVnd;
    private Long finalSettlementVnd;
    private String paymentTerms;
    private String contractStatus;
    private Instant effectiveFrom;
    private Instant effectiveTo;
    private Instant signedAt;
    private Instant settledAt;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
}

