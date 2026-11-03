package com.ccadro.carbon.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Danh mục đơn giá bán lẻ tham chiếu (VNĐ), định mức tiêu thụ (L/100km)
 * và hệ số phát thải GLEC v3 (TTW, WTT, WTW) của 7 loại nhiên liệu vận tải (TASK-18).
 */
@Entity
@Table(name = "fuel_price_catalog")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FuelPriceCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "fuel_type", nullable = false, unique = true, length = 30)
    String fuelType;

    @Column(name = "display_name", nullable = false, length = 100)
    String displayName;

    @Column(name = "unit", nullable = false, length = 15)
    String unit; // LITER, KG, KWH

    @Column(name = "unit_price_vnd", nullable = false, precision = 12, scale = 2)
    BigDecimal unitPriceVnd;

    @Column(name = "ttw_kg_co2_per_unit", nullable = false, precision = 10, scale = 4)
    BigDecimal ttwKgCo2PerUnit;

    @Column(name = "wtt_kg_co2_per_unit", nullable = false, precision = 10, scale = 4)
    BigDecimal wttKgCo2PerUnit;

    @Column(name = "wtw_kg_co2_per_unit", nullable = false, precision = 10, scale = 4)
    BigDecimal wtwKgCo2PerUnit;

    @Column(name = "empty_consumption_per_100km", nullable = false, precision = 8, scale = 3)
    BigDecimal emptyConsumptionPer100km;

    @Column(name = "loaded_penalty_per_ton_100km", nullable = false, precision = 8, scale = 3)
    BigDecimal loadedPenaltyPerTon100km;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

