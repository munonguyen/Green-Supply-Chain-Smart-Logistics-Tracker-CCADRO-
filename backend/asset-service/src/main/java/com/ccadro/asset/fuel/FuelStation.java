package com.ccadro.asset.fuel;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fuel_station")
@Getter
@Setter
public class FuelStation {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "station_code", nullable = false, unique = true, length = 50)
    private String stationCode;

    @Column(name = "name", nullable = false, length = 160)
    private String name;

    @Column(name = "station_type", nullable = false, length = 30)
    private String stationType;

    @Column(name = "price_region", nullable = false)
    private int priceRegion = 1;

    @Column(name = "corridor_tag", length = 80)
    private String corridorTag;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

