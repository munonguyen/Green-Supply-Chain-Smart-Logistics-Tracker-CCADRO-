package com.ccadro.carbon.service;

import com.ccadro.carbon.dto.request.FuelCostCalculationRequest;
import com.ccadro.carbon.dto.response.FuelCostCalculationResponse;
import com.ccadro.carbon.entity.FuelPriceCatalog;
import com.ccadro.carbon.exception.AppException;
import com.ccadro.carbon.exception.ErrorCode;
import com.ccadro.carbon.repository.FuelPriceCatalogRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Quản trị danh mục 7 loại nhiên liệu và mô hình chi phí - phát thải GLEC v3 (TASK-18):
 * - Đơn giá nhiên liệu và hệ số TTW/WTT/WTW.
 * - Quy đổi tiền xăng VNĐ -> Số lít -> Lượng kg CO2e.
 * - Phát hiện bất thường gian lận rút trộm dầu (> 25% độ lệch tiêu hao).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FuelCostService {

    FuelPriceCatalogRepository fuelPriceCatalogRepository;

    public List<FuelPriceCatalog> getAllActiveFuels() {
        return fuelPriceCatalogRepository.findAllByIsActiveTrue();
    }

    public FuelCostCalculationResponse calculateFromFuelCostAndTelemetry(FuelCostCalculationRequest request) {
        String fuelTypeCode = request.getFuelType() != null && !request.getFuelType().isBlank()
                ? request.getFuelType().trim().toUpperCase()
                : "DIESEL_DO_005S";

        FuelPriceCatalog catalog = fuelPriceCatalogRepository.findByFuelType(fuelTypeCode)
                .orElseGet(() -> fuelPriceCatalogRepository.findByFuelType("DIESEL_DO_005S")
                        .orElseThrow(() -> new AppException(ErrorCode.EMISSION_FACTOR_NOT_FOUND,
                                "Không tìm thấy danh mục đơn giá và hệ số cho nhiên liệu: " + fuelTypeCode)));

        BigDecimal effectiveUnitPrice = request.getUnitPriceVnd() != null && request.getUnitPriceVnd().compareTo(BigDecimal.ZERO) > 0
                ? request.getUnitPriceVnd()
                : catalog.getUnitPriceVnd();

        // 1. Định mức tiêu hao theo GPS và tải trọng hàng hóa (TIER_2_MODELED)
        BigDecimal baseRate = catalog.getEmptyConsumptionPer100km()
                .add(catalog.getLoadedPenaltyPerTon100km().multiply(request.getCargoWeightTons()));
        BigDecimal estimatedLiters = request.getDistanceKm()
                .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP)
                .multiply(baseRate)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal actualLiters;
        String calculationMethod;
        BigDecimal variancePct = BigDecimal.ZERO;
        boolean anomalyWarning = false;

        // 2. Nếu có hóa đơn tiền xăng thực tế (TIER_1_PRIMARY)
        if (request.getActualFuelCostVnd() != null && request.getActualFuelCostVnd().compareTo(BigDecimal.ZERO) > 0) {
            actualLiters = request.getActualFuelCostVnd()
                    .divide(effectiveUnitPrice, 2, RoundingMode.HALF_UP);
            calculationMethod = "TIER_1_PRIMARY";

            if (estimatedLiters.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal diff = actualLiters.subtract(estimatedLiters).abs();
                variancePct = diff.divide(estimatedLiters, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(2, RoundingMode.HALF_UP);
                if (variancePct.compareTo(BigDecimal.valueOf(25.0)) > 0) {
                    anomalyWarning = true;
                }
            }
        } else {
            actualLiters = estimatedLiters;
            calculationMethod = "TIER_2_MODELED";
        }

        // 3. Tính toán phát thải GLEC v3: TTW, WTT, WTW
        BigDecimal ttwCo2eKg = actualLiters.multiply(catalog.getTtwKgCo2PerUnit()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal wttCo2eKg = actualLiters.multiply(catalog.getWttKgCo2PerUnit()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal wtwCo2eKg = ttwCo2eKg.add(wttCo2eKg);

        return FuelCostCalculationResponse.builder()
                .fuelType(catalog.getFuelType())
                .displayName(catalog.getDisplayName())
                .unit(catalog.getUnit())
                .effectiveUnitPriceVnd(effectiveUnitPrice)
                .calculatedFuelLiters(actualLiters)
                .estimatedFuelLiters(estimatedLiters)
                .variancePct(variancePct)
                .fuelAnomalyWarning(anomalyWarning)
                .calculationMethod(calculationMethod)
                .ttwCo2eKg(ttwCo2eKg)
                .wttCo2eKg(wttCo2eKg)
                .wtwCo2eKg(wtwCo2eKg)
                .build();
    }
}

