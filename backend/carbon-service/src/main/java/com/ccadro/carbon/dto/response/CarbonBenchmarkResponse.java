package com.ccadro.carbon.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CarbonBenchmarkResponse {
    UUID id;
    String benchmarkName;
    String originZone;
    String destinationZone;
    BigDecimal averageCo2ePerTonneKm;
    BigDecimal bestInClassCo2ePerTonneKm;
    String periodMonth;
    String corridorCode;
    String corridorName;
    BigDecimal benchmarkIntensityGPerTonKm;
    BigDecimal targetReductionPercentage;
}
