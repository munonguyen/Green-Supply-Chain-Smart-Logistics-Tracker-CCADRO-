package com.ccadro.tracking.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class IngestTelemetryRequest {

    @NotNull(message = "Trip ID is required")
    private UUID tripId;

    private UUID vehicleId;

    @NotNull(message = "Timestamp is required")
    private Instant timestamp;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    private BigDecimal speedKmh;
    private BigDecimal headingDegrees;
    private String rawPayload;

    public UUID getTripId() { return tripId; }
    public void setTripId(UUID tripId) { this.tripId = tripId; }
    public UUID getVehicleId() { return vehicleId; }
    public void setVehicleId(UUID vehicleId) { this.vehicleId = vehicleId; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public BigDecimal getSpeedKmh() { return speedKmh; }
    public void setSpeedKmh(BigDecimal speedKmh) { this.speedKmh = speedKmh; }
    public BigDecimal getHeadingDegrees() { return headingDegrees; }
    public void setHeadingDegrees(BigDecimal headingDegrees) { this.headingDegrees = headingDegrees; }
    public String getRawPayload() { return rawPayload; }
    public void setRawPayload(String rawPayload) { this.rawPayload = rawPayload; }
}
