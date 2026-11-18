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
@Table(name = "hub_shipper_policy")
public class HubShipperPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "hub_code", nullable = false, unique = true, length = 40)
    String hubCode;

    @Column(name = "policy_code", nullable = false, unique = true, length = 60)
    String policyCode;

    @Column(name = "policy_title", nullable = false, length = 200)
    String policyTitle;

    @Column(name = "data_isolation_rule", nullable = false, length = 300)
    String dataIsolationRule;

    @Column(name = "photo_pod_rule", nullable = false, length = 300)
    String photoPodRule;

    @Column(name = "temperature_sla_rule", nullable = false, length = 300)
    String temperatureSlaRule;

    @Column(name = "cod_and_pricing_rule", nullable = false, length = 300)
    String codAndPricingRule;

    @Column(name = "max_daily_radius_km", nullable = false)
    @Builder.Default
    Double maxDailyRadiusKm = 3.0;

    @Column(name = "sla_delivery_minutes", nullable = false)
    @Builder.Default
    Integer slaDeliveryMinutes = 120;

    @Column(name = "require_photo_pod", nullable = false)
    @Builder.Default
    Boolean requirePhotoPod = true;

    @Column(name = "require_recipient_signature", nullable = false)
    @Builder.Default
    Boolean requireRecipientSignature = true;

    @Column(name = "hide_b2b_contract_value", nullable = false)
    @Builder.Default
    Boolean hideB2bContractValue = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

