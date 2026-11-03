package com.ccadro.carbon.mapper;

import com.ccadro.carbon.dto.request.CarbonBenchmarkRequest;
import com.ccadro.carbon.dto.request.EmissionCalculationRequest;
import com.ccadro.carbon.dto.response.CarbonBenchmarkResponse;
import com.ccadro.carbon.dto.response.EmissionCalculationResponse;
import com.ccadro.carbon.entity.CarbonBenchmark;
import com.ccadro.carbon.entity.EmissionCalculation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CarbonMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "detailsJson", ignore = true)
    @Mapping(target = "calculatedAt", expression = "java(java.time.Instant.now())")
    EmissionCalculation toEntity(EmissionCalculationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tripId", source = "tripId")
    @Mapping(target = "calculationType", constant = "PLANNING")
    @Mapping(target = "calculationMethod", constant = "GLEC_V3")
    @Mapping(target = "cargoPayloadTons", source = "payloadTons")
    @Mapping(target = "totalDistanceKm", source = "distanceKm")
    @Mapping(target = "totalCo2eKg", source = "totalCo2eKg")
    @Mapping(target = "emptyRunningDistanceKm", expression = "java(java.math.BigDecimal.ZERO)")
    @Mapping(target = "detailsJson", ignore = true)
    @Mapping(target = "ttwCo2eKg", ignore = true)
    @Mapping(target = "wttCo2eKg", ignore = true)
    @Mapping(target = "wtwCo2eKg", ignore = true)
    @Mapping(target = "dataQualityTier", constant = "TIER_2_MODELED")
    @Mapping(target = "factorVersion", constant = "GLEC_v3.0")
    @Mapping(target = "calculationStatus", constant = "CALCULATED")
    @Mapping(target = "blockedReason", ignore = true)
    @Mapping(target = "isDafApplied", constant = "false")
    @Mapping(target = "versionNumber", constant = "1")
    @Mapping(target = "calculatedAt", expression = "java(java.time.Instant.now())")
    EmissionCalculation toPlanningEntity(
            java.util.UUID tripId,
            java.math.BigDecimal payloadTons,
            java.math.BigDecimal distanceKm,
            java.math.BigDecimal totalCo2eKg);

    @Mapping(target = "createdAt", source = "calculatedAt")
    EmissionCalculationResponse toResponse(EmissionCalculation entity);

    List<EmissionCalculationResponse> toResponseList(List<EmissionCalculation> entities);

    CarbonBenchmark toBenchmarkEntity(CarbonBenchmarkRequest request);

    @Mapping(target = "corridorName", source = "benchmarkName")
    @Mapping(target = "corridorCode", expression = "java(entity.getOriginZone() + \"_\" + entity.getDestinationZone())")
    @Mapping(target = "benchmarkIntensityGPerTonKm", source = "averageCo2ePerTonneKm")
    @Mapping(target = "targetReductionPercentage", expression = "java(java.math.BigDecimal.valueOf(17.07))")
    CarbonBenchmarkResponse toBenchmarkResponse(CarbonBenchmark entity);
}
