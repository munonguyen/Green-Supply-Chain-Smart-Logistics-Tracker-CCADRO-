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
public class DriverReviewResponse {
    UUID id;
    UUID driverId;
    String authorName;
    String shipmentCode;
    Integer rating;
    String comment;
    Instant createdAt;
}

