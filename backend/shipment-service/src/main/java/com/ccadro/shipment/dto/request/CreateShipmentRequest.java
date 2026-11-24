package com.ccadro.shipment.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateShipmentRequest {

    @NotBlank(message = "Shipment code cannot be blank")
    private String shipmentCode;

    @NotBlank(message = "Customer ID cannot be blank")
    private String customerId;

    @NotBlank(message = "Origin name cannot be blank")
    private String originName;
    private String originAddress;

    @NotNull(message = "Origin longitude is required")
    private Double originLongitude;

    @NotNull(message = "Origin latitude is required")
    private Double originLatitude;

    @NotBlank(message = "Destination name cannot be blank")
    private String destinationName;
    private String destinationAddress;

    @NotNull(message = "Destination longitude is required")
    private Double destinationLongitude;

    @NotNull(message = "Destination latitude is required")
    private Double destinationLatitude;

    @NotNull(message = "Cargo weight is required")
    @DecimalMin(value = "0.01", message = "Cargo weight must be > 0")
    private BigDecimal cargoWeightTons;

    private BigDecimal cargoVolumeM3;
}
