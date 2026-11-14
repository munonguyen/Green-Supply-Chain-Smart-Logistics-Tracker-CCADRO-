package com.ccadro.payment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "b2b_contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class B2bContract extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "contract_number", nullable = false, unique = true, length = 48)
    private String contractNumber;

    @Column(name = "contract_type", nullable = false, length = 32)
    @Builder.Default
    private String contractType = "SPOT_TRIP";

    @Column(name = "parent_contract_number", length = 48)
    private String parentContractNumber;

    @Column(name = "shipment_code", length = 64)
    private String shipmentCode;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;

    @Column(name = "signed_by_customer_user", length = 120)
    private String signedByCustomerUser;

    @Column(name = "customer_signature_hash", length = 128)
    private String customerSignatureHash;

    @Column(name = "provider_name", nullable = false, length = 200)
    @Builder.Default
    private String providerName = "CCADRO GREEN LOGISTICS ALLIANCE";

    @Column(name = "corridor_scope", length = 220)
    private String corridorScope;

    @Column(name = "container_code", length = 40)
    private String containerCode;

    @Column(name = "e_seal_number", length = 60)
    private String eSealNumber;

    @Column(name = "vehicle_type", length = 140)
    private String vehicleType;

    @Column(name = "license_plate", length = 40)
    private String licensePlate;

    @Column(name = "sla_on_time_rate_pct", nullable = false)
    @Builder.Default
    private Double slaOnTimeRatePct = 98.5;

    @Column(name = "sla_max_temp_deviation_c", nullable = false)
    @Builder.Default
    private Double slaMaxTempDeviationC = 2.0;

    @Column(name = "sla_penalty_pct_per_breach", nullable = false)
    @Builder.Default
    private Double slaPenaltyPctPerBreach = 5.0;

    @Column(name = "min_co2_reduction_kg", nullable = false)
    @Builder.Default
    private Double minCo2ReductionKg = 0.0;

    @Column(name = "credit_limit_vnd", nullable = false)
    @Builder.Default
    private Long creditLimitVnd = 500_000_000L;

    @Column(name = "used_credit_vnd", nullable = false)
    @Builder.Default
    private Long usedCreditVnd = 0L;

    @Column(name = "contract_value_vnd", nullable = false)
    @Builder.Default
    private Long contractValueVnd = 0L;

    @Column(name = "sla_penalty_deduction_vnd", nullable = false)
    @Builder.Default
    private Long slaPenaltyDeductionVnd = 0L;

    @Column(name = "final_settlement_vnd", nullable = false)
    @Builder.Default
    private Long finalSettlementVnd = 0L;

    @Column(name = "payment_terms", nullable = false, length = 32)
    @Builder.Default
    private String paymentTerms = "NET30";

    @Column(name = "contract_status", nullable = false, length = 32)
    @Builder.Default
    private String contractStatus = "DRAFT";

    @Column(name = "effective_from")
    private Instant effectiveFrom;

    @Column(name = "effective_to")
    private Instant effectiveTo;

    @Column(name = "signed_at")
    private Instant signedAt;

    @Column(name = "settled_at")
    private Instant settledAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}

