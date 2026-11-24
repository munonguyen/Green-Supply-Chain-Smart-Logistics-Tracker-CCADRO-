package com.ccadro.asset.fuel;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "vehicle_fuel_profile")
@Getter @Setter @NoArgsConstructor
public class VehicleFuelProfile {
    @Id private UUID vehicleId;
    @Column(nullable=false) private String selectedFuelCode;
    @Column(name="consumption_per100km",nullable=false, precision=9, scale=3) private BigDecimal consumptionPer100Km;
    @Column(precision=12, scale=2) private BigDecimal annualKm;
    private Integer minRon;
    private Integer maxEthanolPct;
    private Integer maxSulfurPpm;
    @Column(nullable=false) private int minQualityLevel;
    @Column(nullable=false,length=1000) private String compatibilityEvidence;
    @Column(nullable=false,length=1000) private String consumptionEvidence;
    @Column(nullable=false) private String updatedBy;
    @Column(nullable=false) private Instant updatedAt;
    @Version private long revision;
}
