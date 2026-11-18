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
@Table(name = "container_cargo_manifest_item")
public class ContainerCargoManifestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "item_code", nullable = false, unique = true, length = 50)
    String itemCode;

    @Column(name = "sequence_no", nullable = false)
    @Builder.Default
    Integer sequenceNo = 1;

    @Column(name = "container_code", nullable = false, length = 40)
    String containerCode;

    @Column(name = "shipment_code", length = 50)
    String shipmentCode;

    @Column(name = "hub_code", nullable = false, length = 40)
    String hubCode;

    @Column(name = "cargo_name", nullable = false, length = 220)
    String cargoName;

    @Column(name = "cargo_category", nullable = false, length = 60)
    String cargoCategory;

    @Column(name = "sender_name", length = 180)
    String senderName;

    @Column(name = "sender_phone", length = 40)
    String senderPhone;

    @Column(name = "sender_address", length = 255)
    String senderAddress;

    @Column(name = "consignee_name", nullable = false, length = 180)
    String consigneeName;

    @Column(name = "consignee_phone", nullable = false, length = 40)
    String consigneePhone;

    @Column(name = "delivery_address", nullable = false, length = 255)
    String deliveryAddress;

    @Column(name = "delivery_zone_name", nullable = false, length = 160)
    String deliveryZoneName;

    @Column(name = "delivery_lat", nullable = false)
    Double deliveryLat;

    @Column(name = "delivery_lng", nullable = false)
    Double deliveryLng;

    @Column(name = "weight_kg", nullable = false)
    Double weightKg;

    @Column(name = "parcel_count", nullable = false)
    @Builder.Default
    Integer parcelCount = 1;

    @Column(name = "required_temp_c")
    Double requiredTempC;

    @Column(name = "requires_cold_chain", nullable = false)
    @Builder.Default
    Boolean requiresColdChain = false;

    @Column(name = "sla_window", nullable = false, length = 80)
    String slaWindow;

    @Column(name = "dispatch_status", nullable = false, length = 40)
    @Builder.Default
    String dispatchStatus = "IN_CONTAINER";

    @Column(name = "assigned_shipper_code", length = 40)
    String assignedShipperCode;

    @Column(name = "assigned_shipper_name", length = 150)
    String assignedShipperName;

    @Column(name = "proximity_distance_km")
    Double proximityDistanceKm;

    @Column(name = "match_score")
    Double matchScore;

    @Column(name = "dispatch_reason", length = 300)
    String dispatchReason;

    @Column(name = "proof_image_url", columnDefinition = "text")
    String proofImageUrl;

    @Column(name = "proof_image_caption", length = 255)
    String proofImageCaption;

    @Column(name = "proof_uploaded_at")
    Instant proofUploadedAt;

    @Column(name = "tracking_history_json", columnDefinition = "text")
    String trackingHistoryJson;

    @Column(name = "assigned_at")
    Instant assignedAt;

    @Column(name = "delivered_at")
    Instant deliveredAt;

    @Column(name = "recipient_pod_name", length = 150)
    String recipientPodName;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    Boolean isDeleted = false;

    @Column(name = "deleted_at")
    Instant deletedAt;

    @Column(name = "deleted_by", length = 60)
    String deletedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

