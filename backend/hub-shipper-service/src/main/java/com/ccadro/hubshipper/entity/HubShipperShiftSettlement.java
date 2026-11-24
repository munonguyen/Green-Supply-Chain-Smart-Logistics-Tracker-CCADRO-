package com.ccadro.hubshipper.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "hub_shipper_shift_settlement")
public class HubShipperShiftSettlement {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "settlement_code", nullable = false, unique = true, length = 50)
    String settlementCode;

    @Column(name = "hub_code", nullable = false, length = 40)
    String hubCode;

    @Column(name = "shipper_code", nullable = false, length = 40)
    String shipperCode;

    @Column(name = "shipper_name", nullable = false, length = 150)
    String shipperName;

    @Column(name = "shift_date", nullable = false, length = 20)
    String shiftDate;

    @Column(name = "delivered_pod_count", nullable = false)
    @Builder.Default
    Integer deliveredPodCount = 0;

    @Column(name = "total_stops_count", nullable = false)
    @Builder.Default
    Integer totalStopsCount = 0;

    @Column(name = "base_fee_vnd", nullable = false)
    @Builder.Default
    Long baseFeeVnd = 0L;

    @Column(name = "weight_surcharge_vnd", nullable = false)
    @Builder.Default
    Long weightSurchargeVnd = 0L;

    @Column(name = "cold_chain_bonus_vnd", nullable = false)
    @Builder.Default
    Long coldChainBonusVnd = 0L;

    @Column(name = "sla_gem_bonus_vnd", nullable = false)
    @Builder.Default
    Long slaGemBonusVnd = 0L;

    @Column(name = "total_earned_vnd", nullable = false)
    @Builder.Default
    Long totalEarnedVnd = 0L;

    @Column(name = "settlement_status", nullable = false, length = 30)
    @Builder.Default
    String settlementStatus = "SETTLED";

    @Column(name = "settled_by", length = 80)
    String settledBy;

    @Column(name = "note", length = 400)
    String note;

    @Column(name = "settled_at", nullable = false)
    @Builder.Default
    Instant settledAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();
}

