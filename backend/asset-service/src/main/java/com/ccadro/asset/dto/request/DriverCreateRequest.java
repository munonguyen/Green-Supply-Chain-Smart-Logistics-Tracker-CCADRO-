package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverCreateRequest {

    @NotBlank(message = "driverCode must not be blank")
    String driverCode;

    @NotBlank(message = "fullName must not be blank")
    String fullName;

    String phone;

    String licenseNumber;
}

