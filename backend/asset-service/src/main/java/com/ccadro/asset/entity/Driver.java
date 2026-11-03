package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.DriverStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name="driver")
public class Driver extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "driver_code", nullable = false, unique = true, length = 50)
    String driverCode;

    @Column(name = "full_name", nullable = false, length = 100)
    String fullName;

    @Column(name = "phone", length = 20)
    String phone;

    @Column(name = "license_number", length = 50)
    String licenseNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    DriverStatus status = DriverStatus.AVAILABLE;
}
