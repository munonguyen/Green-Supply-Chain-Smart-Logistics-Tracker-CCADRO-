package com.ccadro.asset.entity;

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
@Table(name = "driver_dispatch_message")
public class DriverDispatchMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "driver_id", nullable = false)
    UUID driverId;

    @Column(name = "sender_name", nullable = false, length = 150)
    @Builder.Default
    String senderName = "Điều phối B2B";

    @Column(name = "sender_role", nullable = false, length = 30)
    @Builder.Default
    String senderRole = "CUSTOMER";

    @Column(name = "sender_username", length = 80)
    String senderUsername;

    @Column(name = "container_code", length = 40)
    String containerCode;

    @Column(name = "shipment_code", length = 50)
    String shipmentCode;

    @Column(name = "message_text", nullable = false, columnDefinition = "text")
    String messageText;

    @Column(name = "message_type", nullable = false, length = 30)
    @Builder.Default
    String messageType = "TEXT";

    @Column(name = "channel", nullable = false, length = 30)
    @Builder.Default
    String channel = "GRAB_CHAT";

    @Column(name = "delivery_status", nullable = false, length = 40)
    @Builder.Default
    String deliveryStatus = "SENT";

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();
}

