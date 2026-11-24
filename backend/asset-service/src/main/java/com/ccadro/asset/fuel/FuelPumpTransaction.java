package com.ccadro.asset.fuel;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fuel_pump_transaction")
@Getter
@Setter
public class FuelPumpTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "transaction_ref", nullable = false, unique = true, length = 80)
    private String transactionRef;

    @Column(name = "station_id")
    private UUID stationId;

    @Column(name = "nozzle_id")
    private UUID nozzleId;

    @Column(name = "station_code", nullable = false, length = 50)
    private String stationCode;

    @Column(name = "nozzle_code", nullable = false, length = 30)
    private String nozzleCode;

    @Column(name = "asset_kind", nullable = false, length = 30)
    private String assetKind;

    @Column(name = "vehicle_id")
    private UUID vehicleId;

    @Column(name = "container_id")
    private UUID containerId;

    @Column(name = "asset_code", nullable = false, length = 60)
    private String assetCode;

    @Column(name = "fuel_code", nullable = false, length = 40)
    private String fuelCode;

    @Column(name = "liters", nullable = false, precision = 10, scale = 3)
    private BigDecimal liters;

    @Column(name = "unit_price_vnd", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceVnd;

    @Column(name = "total_cost_vnd", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCostVnd;

    @Column(name = "odometer_km", precision = 12, scale = 2)
    private BigDecimal odometerKm;

    @Column(name = "engine_hours", precision = 10, scale = 2)
    private BigDecimal engineHours;

    @Column(name = "computed_rate", precision = 9, scale = 3)
    private BigDecimal computedRate;

    @Column(name = "physical_co2_kg", nullable = false, precision = 12, scale = 3)
    private BigDecimal physicalCo2Kg = BigDecimal.ZERO;

    @Column(name = "fossil_co2_kg", nullable = false, precision = 12, scale = 3)
    private BigDecimal fossilCo2Kg = BigDecimal.ZERO;

    @Column(name = "biogenic_co2_kg", nullable = false, precision = 12, scale = 3)
    private BigDecimal biogenicCo2Kg = BigDecimal.ZERO;

    @Column(name = "validation_status", nullable = false, length = 30)
    private String validationStatus;

    @Column(name = "validation_reason", length = 500)
    private String validationReason;

    @Column(name = "source_type", nullable = false, length = 30)
    private String sourceType;

    @Column(name = "invoice_ref", length = 80)
    private String invoiceRef;

    @Column(name = "pumped_at", nullable = false)
    private Instant pumpedAt = Instant.now();

    @Column(name = "created_by", nullable = false, length = 120)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}

