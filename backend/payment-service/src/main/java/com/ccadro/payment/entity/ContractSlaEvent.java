package com.ccadro.payment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "contract_sla_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractSlaEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "contract_number", nullable = false, length = 48)
    private String contractNumber;

    @Column(name = "shipment_code", length = 64)
    private String shipmentCode;

    @Column(name = "event_type", nullable = false, length = 48)
    private String eventType;

    @Column(name = "severity", nullable = false, length = 20)
    @Builder.Default
    private String severity = "INFO";

    @Column(name = "penalty_amount_vnd", nullable = false)
    @Builder.Default
    private Long penaltyAmountVnd = 0L;

    @Column(name = "recorded_by", nullable = false, length = 120)
    private String recordedBy;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}

