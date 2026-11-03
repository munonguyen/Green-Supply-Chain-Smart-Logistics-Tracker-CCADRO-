package com.ccadro.carbon.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FuelCostCalculationResponse {

    String fuelType;
    String displayName;
    String unit;
    BigDecimal effectiveUnitPriceVnd;
    BigDecimal calculatedFuelLiters;
    BigDecimal estimatedFuelLiters;
    BigDecimal variancePct;
    Boolean fuelAnomalyWarning;
    String calculationMethod; // TIER_1_PRIMARY (Hóa đơn thực), TIER_2_MODELED (Định mức GPS)
    BigDecimal ttwCo2eKg;
    BigDecimal wttCo2eKg;
    BigDecimal wtwCo2eKg;
}

