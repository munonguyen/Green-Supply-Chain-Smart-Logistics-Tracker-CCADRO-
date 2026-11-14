package com.ccadro.asset.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverDispatchMessageResponse {
    UUID id;
    UUID driverId;
    String senderName;
    String senderRole;
    String senderUsername;
    String containerCode;
    String shipmentCode;
    String messageText;
    String messageType;
    String channel;
    String deliveryStatus;
    boolean read;
    Instant createdAt;
}

