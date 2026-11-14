package com.ccadro.asset.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

/**
 * Lưu trữ nghiệp vụ giao nhận container tại điểm đích cho Shipper (Bên thứ 3 / WMS / 3PL).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "third_party_shipper_handover")
public class ThirdPartyHandover {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "container_code", nullable = false, unique = true, length = 40)
    String containerCode;

    @Column(name = "shipment_code", length = 50)
    String shipmentCode;

    @Column(name = "destination_hub", nullable = false, length = 200)
    String destinationHub;

    @Column(name = "shipper_company", nullable = false, length = 200)
    String shipperCompany;

    @Column(name = "external_system_name", nullable = false, length = 120)
    String externalSystemName;

    @Column(name = "external_tracking_ref", nullable = false, length = 100)
    String externalTrackingRef;

    @Column(name = "webhook_endpoint", nullable = false, length = 255)
    String webhookEndpoint;

    @Column(name = "dock_gate", length = 80)
    String dockGate;

    @Column(name = "handover_status", nullable = false, length = 40)
    @Builder.Default
    String handoverStatus = "AWAITING_ARRIVAL";

    @Column(name = "epod_signed_by", length = 150)
    String epodSignedBy;

    @Column(name = "epod_signature_hash", length = 120)
    String epodSignatureHash;

    @Column(name = "last_sync_status", nullable = false, length = 40)
    @Builder.Default
    String lastSyncStatus = "PENDING";

    @Column(name = "last_sync_payload", columnDefinition = "text")
    String lastSyncPayload;

    @Column(name = "last_synced_at")
    Instant lastSyncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

