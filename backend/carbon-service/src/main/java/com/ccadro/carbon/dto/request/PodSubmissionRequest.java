package com.ccadro.carbon.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PodSubmissionRequest {
    @NotNull(message = "tripId must not be null")
    UUID tripId;
    @NotNull(message = "shipmentId must not be null")
    UUID shipmentId;
    String recipientName;
    String recipientPhone;
    String signatureUrl;
    String photoEvidenceUrl;
    BigDecimal actualDistanceKm;
}

