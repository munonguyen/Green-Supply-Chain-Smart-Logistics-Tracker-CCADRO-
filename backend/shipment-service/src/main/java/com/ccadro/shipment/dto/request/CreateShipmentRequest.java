package com.ccadro.shipment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

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

    public String getShipmentCode() { return shipmentCode; }
    public void setShipmentCode(String shipmentCode) { this.shipmentCode = shipmentCode; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getOriginName() { return originName; }
    public void setOriginName(String originName) { this.originName = originName; }
    public String getOriginAddress() { return originAddress; }
    public void setOriginAddress(String originAddress) { this.originAddress = originAddress; }
    public Double getOriginLongitude() { return originLongitude; }
    public void setOriginLongitude(Double originLongitude) { this.originLongitude = originLongitude; }
    public Double getOriginLatitude() { return originLatitude; }
    public void setOriginLatitude(Double originLatitude) { this.originLatitude = originLatitude; }
    public String getDestinationName() { return destinationName; }
    public void setDestinationName(String destinationName) { this.destinationName = destinationName; }
    public String getDestinationAddress() { return destinationAddress; }
    public void setDestinationAddress(String destinationAddress) { this.destinationAddress = destinationAddress; }
    public Double getDestinationLongitude() { return destinationLongitude; }
    public void setDestinationLongitude(Double destinationLongitude) { this.destinationLongitude = destinationLongitude; }
    public Double getDestinationLatitude() { return destinationLatitude; }
    public void setDestinationLatitude(Double destinationLatitude) { this.destinationLatitude = destinationLatitude; }
    public BigDecimal getCargoWeightTons() { return cargoWeightTons; }
    public void setCargoWeightTons(BigDecimal cargoWeightTons) { this.cargoWeightTons = cargoWeightTons; }
    public BigDecimal getCargoVolumeM3() { return cargoVolumeM3; }
    public void setCargoVolumeM3(BigDecimal cargoVolumeM3) { this.cargoVolumeM3 = cargoVolumeM3; }
}
