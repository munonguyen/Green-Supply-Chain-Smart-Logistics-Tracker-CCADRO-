package com.ccadro.asset.fuel;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class FuelAutomationDtos {
    private FuelAutomationDtos() {}

    public record NozzleSummary(
        UUID id,
        String nozzleCode,
        String fuelCode,
        String fuelName,
        BigDecimal tankCapacityLiters,
        BigDecimal currentStockLiters,
        BigDecimal stockPct,
        BigDecimal unitPriceVnd,
        boolean active
    ) {}

    public record StationSummary(
        UUID id,
        String stationCode,
        String name,
        String stationType,
        int priceRegion,
        String corridorTag,
        String address,
        boolean active,
        List<NozzleSummary> nozzles
    ) {}

    public record CreateNozzleInput(
        @NotBlank @Size(max = 30) String nozzleCode,
        @NotBlank @Size(max = 40) String fuelCode,
        @NotNull @DecimalMin("100") @DecimalMax("500000") BigDecimal tankCapacityLiters,
        @NotNull @DecimalMin("0") @DecimalMax("500000") BigDecimal currentStockLiters,
        @NotNull @DecimalMin("1000") @DecimalMax("1000000") BigDecimal unitPriceVnd
    ) {}

    public record CreateStationRequest(
        @NotBlank @Size(max = 50) String stationCode,
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Pattern(regexp = "INTERNAL_DEPOT|PARTNER_PETROLIMEX|PARTNER_OTHER") String stationType,
        @Min(1) @Max(2) int priceRegion,
        @Size(max = 80) String corridorTag,
        @Size(max = 255) String address,
        @NotEmpty @Size(max = 12) List<@Valid CreateNozzleInput> nozzles
    ) {}

    public record AuthorizePumpRequest(
        @NotBlank @Size(max = 30) String nozzleCode,
        @NotBlank @Pattern(regexp = "VEHICLE|CONTAINER_GENSET") String assetKind,
        @NotBlank @Size(max = 60) String assetCode,
        @DecimalMin("1") @DecimalMax("2000") BigDecimal requestedLiters
    ) {}

    public record AuthorizePumpDecision(
        boolean allowed,
        String decisionStatus,
        String stationCode,
        String nozzleCode,
        String fuelCode,
        String fuelName,
        String assetKind,
        String assetCode,
        String assetLabel,
        BigDecimal maxAuthorizedLiters,
        BigDecimal unitPriceVnd,
        List<String> reasons
    ) {}

    public record IngestTransactionRequest(
        @Size(max = 80) String transactionRef,
        @NotBlank @Size(max = 30) String nozzleCode,
        @NotBlank @Pattern(regexp = "VEHICLE|CONTAINER_GENSET") String assetKind,
        @NotBlank @Size(max = 60) String assetCode,
        @NotNull @DecimalMin("0.1") @DecimalMax("5000") BigDecimal liters,
        @DecimalMin("1") @DecimalMax("1000000") BigDecimal unitPriceVnd,
        @DecimalMin("0") BigDecimal odometerKm,
        @DecimalMin("0") BigDecimal engineHours,
        @NotBlank @Pattern(regexp = "DEPOT_RFID|FLEET_CARD|E_INVOICE_SYNC|MANUAL_IMPORT") String sourceType,
        @Size(max = 80) String invoiceRef,
        Instant pumpedAt,
        @DecimalMin("0") @DecimalMax("100") BigDecimal tankLevelBeforePct,
        @DecimalMin("0") @DecimalMax("100") BigDecimal tankLevelAfterPct
    ) {
        public IngestTransactionRequest(
            String transactionRef, String nozzleCode, String assetKind, String assetCode,
            BigDecimal liters, BigDecimal unitPriceVnd, BigDecimal odometerKm, BigDecimal engineHours,
            String sourceType, String invoiceRef, Instant pumpedAt
        ) {
            this(transactionRef, nozzleCode, assetKind, assetCode, liters, unitPriceVnd, odometerKm, engineHours,
                sourceType, invoiceRef, pumpedAt, null, null);
        }
    }

    public record TransactionRecord(
        UUID id,
        String transactionRef,
        String stationCode,
        String nozzleCode,
        String assetKind,
        String assetCode,
        String fuelCode,
        String fuelName,
        BigDecimal liters,
        BigDecimal unitPriceVnd,
        BigDecimal totalCostVnd,
        BigDecimal odometerKm,
        BigDecimal engineHours,
        BigDecimal computedRate,
        BigDecimal physicalCo2Kg,
        BigDecimal fossilCo2Kg,
        BigDecimal biogenicCo2Kg,
        String validationStatus,
        String validationReason,
        String sourceType,
        String invoiceRef,
        Instant pumpedAt
    ) {}

    public record ContainerFuelSummary(
        UUID containerId,
        String containerCode,
        String containerType,
        String status,
        String gensetCode,
        String rfidTag,
        String preferredFuelCode,
        String preferredFuelName,
        BigDecimal tankCapacityLiters,
        BigDecimal currentFuelPct,
        BigDecimal ratedLitersPerHour,
        int minQualityLevel,
        int maxSulfurPpm,
        boolean lowFuelAlert
    ) {}

    public record BatchOptimizeRequest(
        @NotNull @DecimalMin("1") @DecimalMax("100000") BigDecimal distanceKm,
        @NotNull @DecimalMin("0") @DecimalMax("200") BigDecimal reeferHours,
        @Min(0) @Max(100) int carbonWeightPct,
        @NotNull @Pattern(regexp = "PHYSICAL_CO2|FOSSIL_CO2") String carbonMetric,
        @Size(max = 80) String corridorTag,
        @DecimalMin("0") @DecimalMax("1000") BigDecimal maxPremiumPct
    ) {}

    public record BatchOptimizationRow(
        String assetKind,
        UUID assetId,
        String assetCode,
        String assetLabel,
        String powertrainSpec,
        String currentFuelCode,
        String recommendedFuelCode,
        String recommendedFuelName,
        String recommendedStationCode,
        String recommendedStationName,
        BigDecimal expectedCostVnd,
        BigDecimal costDeltaVnd,
        BigDecimal expectedCo2Kg,
        BigDecimal co2DeltaKg,
        boolean paretoOptimal,
        String statusNote
    ) {}

    public record BatchOptimizeResponse(
        int totalAssetsEvaluated,
        int optimizedAssetsCount,
        int switchSuggestedCount,
        BigDecimal projectedCostDeltaVnd,
        BigDecimal projectedCo2DeltaKg,
        List<String> stationCodesUsed,
        List<BatchOptimizationRow> rows
    ) {}
}

