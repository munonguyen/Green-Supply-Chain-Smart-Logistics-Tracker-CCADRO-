package com.ccadro.shipment.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DispatchOrderResponse {
    UUID id;
    String dispatchCode;
    UUID shipmentId;
    UUID vehicleId;
    UUID driverId;
    UUID containerId;
    UUID assignedRouteVersionId;
    Instant dispatchedAt;
    String dispatchedBy;
    String status;
    String notes;
}

