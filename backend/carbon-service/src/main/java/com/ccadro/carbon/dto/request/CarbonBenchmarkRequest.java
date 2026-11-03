package com.ccadro.carbon.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CarbonBenchmarkRequest {
    @NotBlank(message = "corridorCode must not be blank")
    String corridorCode;
    String corridorName;
    Double benchmarkIntensityGPerTonKm;
    Double targetReductionPercentage;
}

