package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.VehicleStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name ="vehicle")
public class Vehicle extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "vehicle_code", nullable = false, unique = true, length = 50)
    String vehicleCode;

    @Column(name = "plate_number", nullable = false, length = 20)
    String plateNumber;

    @Column(name = "fuel_type", nullable = false, length = 30)
    String fuelType;

    @Column(name = "euro_standard", nullable = false, length = 20)
    String euroStandard;

    @Column(name = "max_payload_tons", nullable = false, precision = 10, scale = 2)
    BigDecimal maxPayloadTons;

    @Column(name = "empty_weight_tons", nullable = false, precision = 10, scale = 2)
    BigDecimal emptyWeightTons;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    VehicleStatus status = VehicleStatus.AVAILABLE;
}
