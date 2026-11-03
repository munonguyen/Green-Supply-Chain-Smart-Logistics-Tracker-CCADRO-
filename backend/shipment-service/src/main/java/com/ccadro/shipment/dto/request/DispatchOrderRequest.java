package com.ccadro.shipment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DispatchOrderRequest {

    @NotBlank(message = "dispatchCode must not be blank")
    String dispatchCode;

    @NotNull(message = "shipmentId must not be null")
    UUID shipmentId;

    @NotNull(message = "vehicleId must not be null")
    UUID vehicleId;

    @NotNull(message = "driverId must not be null")
    UUID driverId;

    UUID containerId;
    UUID assignedRouteVersionId;
    String notes;
}

