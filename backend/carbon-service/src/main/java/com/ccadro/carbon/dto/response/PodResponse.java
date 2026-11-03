package com.ccadro.carbon.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PodResponse {
    UUID id;
    UUID tripId;
    UUID shipmentId;
    String recipientName;
    Instant deliveryTime;
    String signatureUrl;
    String photoEvidenceUrl;
    BigDecimal actualDistanceKm;
}

