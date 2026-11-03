package com.ccadro.asset.dto.response;

import com.ccadro.asset.entity.enums.DriverStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverResponse {

    UUID id;
    String driverCode;
    String fullName;
    String phone;
    String licenseNumber;
    DriverStatus status;
    Instant createdAt;
    Instant updatedAt;
}

