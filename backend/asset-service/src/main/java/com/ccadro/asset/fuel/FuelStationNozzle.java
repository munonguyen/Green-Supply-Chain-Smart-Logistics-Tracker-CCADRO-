package com.ccadro.asset.fuel;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "fuel_station_nozzle")
@Getter
@Setter
public class FuelStationNozzle {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "station_id", nullable = false)
    private UUID stationId;

    @Column(name = "nozzle_code", nullable = false, length = 30)
    private String nozzleCode;

    @Column(name = "fuel_code", nullable = false, length = 40)
    private String fuelCode;

    @Column(name = "tank_capacity_liters", nullable = false, precision = 12, scale = 2)
    private BigDecimal tankCapacityLiters;

    @Column(name = "current_stock_liters", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentStockLiters;

    @Column(name = "unit_price_vnd", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceVnd;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}

