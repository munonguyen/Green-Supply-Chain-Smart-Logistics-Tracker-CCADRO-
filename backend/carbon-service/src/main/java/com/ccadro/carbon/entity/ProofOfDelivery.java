package com.ccadro.carbon.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "proof_of_delivery")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProofOfDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "trip_id", nullable = false)
    UUID tripId;

    @Column(name = "shipment_id", nullable = false)
    UUID shipmentId;

    @Column(name = "recipient_name", nullable = false, length = 100)
    String recipientName;

    @Column(name = "recipient_phone", length = 20)
    String recipientPhone;

    @Column(name = "delivery_time", nullable = false)
    Instant deliveryTime = Instant.now();

    @Column(name = "signature_url", columnDefinition = "text")
    String signatureUrl;

    @Column(name = "photo_evidence_url", columnDefinition = "text")
    String photoEvidenceUrl;

    @Column(name = "actual_distance_km", nullable = false, precision = 10, scale = 3)
    BigDecimal actualDistanceKm;

    @Column(name = "distance_source", nullable = false, length = 30)
    String distanceSource = "GPS_ACTUAL";

    @Column(name = "is_quality_approved", nullable = false)
    Boolean isQualityApproved = true;

    @Column(name = "notes", columnDefinition = "text")
    String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();
}
