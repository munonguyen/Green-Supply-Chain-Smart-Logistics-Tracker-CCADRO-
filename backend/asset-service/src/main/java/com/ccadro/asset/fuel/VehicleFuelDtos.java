package com.ccadro.asset.fuel;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class VehicleFuelDtos {
    private VehicleFuelDtos() {}
    public record SaveProfile(
        @NotBlank String selectedFuelCode,
        @NotNull @DecimalMin("0.1") @DecimalMax("200") BigDecimal consumptionPer100Km,
        @DecimalMin("0") @DecimalMax("1000000") BigDecimal annualKm,
        @Min(80) @Max(110) Integer minRon,
        @Min(0) @Max(100) Integer maxEthanolPct,
        @Min(0) @Max(500) Integer maxSulfurPpm,
        @Min(2) @Max(5) int minQualityLevel,
        @NotBlank @Size(min=5,max=1000) String compatibilityEvidence,
        @NotBlank @Size(min=5,max=1000) String consumptionEvidence,
        @NotNull @Min(-1) Long expectedRevision) {}
    public record Scenario(
        @NotNull @DecimalMin("0.1") @DecimalMax("100000") BigDecimal distanceKm,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal extraIdleHours,
        @NotNull @DecimalMin("0") @DecimalMax("50") BigDecimal idleLitersPerHour,
        @Min(1) @Max(2) int priceRegion,
        @Min(0) @Max(100) int carbonWeightPct,
        @NotNull @Pattern(regexp="PHYSICAL_CO2|FOSSIL_CO2") String carbonMetric,
        @NotNull @Size(max=10) List<@NotBlank String> availableFuelCodes,
        @NotNull @Size(max=10) Map<String, @NotNull @DecimalMin("1") @DecimalMax("1000000") BigDecimal> priceOverrides,
        @NotNull @Size(max=10) Map<String, @NotNull @DecimalMin("0.1") @DecimalMax("200") BigDecimal> consumptionOverrides,
        @DecimalMin("0") @DecimalMax("1000") BigDecimal maxPremiumPct) {}
    public record VehicleSummary(UUID id, String vehicleCode, String plateNumber, String fuelType,
        String euroStandard, String status, VehicleFuelProfile profile, BigDecimal annualPhysicalCo2Kg,
        BigDecimal annualFossilCo2Kg, BigDecimal annualBiogenicCo2Kg) {}
    public record Catalog(String version, Instant priceEffectiveAt, Instant reviewedAt, String priceSource,
        String factorSource, String compatibilitySource, String marketSource, String energySource,
        List<VietnamFuelCatalog.Fuel> fuels, List<VehicleSummary> vehicles, int coveredVehicles,
        int configuredVehicles, BigDecimal annualPhysicalCo2Kg, BigDecimal annualFossilCo2Kg, BigDecimal annualBiogenicCo2Kg,
        String scope, List<String> assumptions) {}
    public record Candidate(String fuelCode, String name, boolean compatible, boolean available,
        boolean eligible, List<String> reasons, BigDecimal consumptionPer100Km, String consumptionBasis,
        BigDecimal liters, BigDecimal unitPriceVnd, String priceBasis, BigDecimal costVnd,
        BigDecimal physicalCo2Kg, BigDecimal fossilCo2Kg, BigDecimal biogenicCo2Kg,
        BigDecimal score, boolean pareto, BigDecimal costDeltaVnd, BigDecimal physicalCo2DeltaKg) {}
    public record Assessment(UUID vehicleId, String catalogVersion, Instant calculatedAt,
        String selectedFuelCode, String recommendedFuelCode, String carbonMetric, int carbonWeightPct,
        String explanation, List<Candidate> candidates, String scope, List<String> assumptions) {}
}
