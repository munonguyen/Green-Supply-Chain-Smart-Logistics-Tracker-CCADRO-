package com.ccadro.carbon.service;

import com.ccadro.carbon.configuration.CcadroProperties;
import com.ccadro.carbon.dto.request.EmissionCalculationRequest;
import com.ccadro.carbon.dto.response.EmissionCalculationResponse;
import com.ccadro.carbon.entity.EmissionCalculation;
import com.ccadro.carbon.entity.EmissionFactor;
import com.ccadro.carbon.mapper.CarbonMapper;
import com.ccadro.carbon.repository.EmissionCalculationRepository;
import com.ccadro.carbon.repository.EmissionFactorRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

/**
 * Kế toán phát thải khí nhà kính chuẩn GLEC v3 / ISO 14083 (UC12):
 * - Tách biệt PLANNING (dự báo) và POST_TRIP_ACCOUNTING (sau chuyến) (BRULE-06).
 * - Quãng đường GPS_ACTUAL không nhân DAF (BRULE-11).
 * - Lưu vết Lineage hệ số phát thải (BRULE-12).
 * - Trạng thái BLOCKED khi thiếu hệ số hợp lệ (BRULE-13).
 * - Bất biến kiểm toán với versionNumber tăng dần và đánh dấu SUPERSEDED (BRULE-14).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EmissionAccountingService {

    private static final BigDecimal TTW_SHARE = new BigDecimal("0.8125");

    EmissionFactorRepository emissionFactorRepository;
    EmissionCalculationRepository emissionCalculationRepository;
    CarbonMapper carbonMapper;
    CcadroProperties ccadroProperties;

    public List<EmissionFactor> getAllFactors() {
        return emissionFactorRepository.findAll();
    }

    public Optional<EmissionFactor> getFactorByCode(String code) {
        return emissionFactorRepository.findByFactorCode(code);
    }

    public List<EmissionCalculation> getTripCalculations(UUID tripId) {
        return emissionCalculationRepository.findByTripId(tripId);
    }

    public List<EmissionCalculationResponse> getTripCalculationResponses(UUID tripId) {
        return carbonMapper.toResponseList(emissionCalculationRepository.findByTripId(tripId));
    }

    @Transactional
    public EmissionCalculationResponse calculateGlecV3Emissions(EmissionCalculationRequest request) {
        String calcType = (request.getCalculationType() != null && !request.getCalculationType().isBlank())
                ? request.getCalculationType().trim().toUpperCase()
                : "POST_TRIP_ACCOUNTING";

        List<EmissionCalculation> existingRecords = emissionCalculationRepository.findByTripId(request.getTripId());
        int nextVersion = existingRecords.stream()
                .mapToInt(r -> r.getVersionNumber() != null ? r.getVersionNumber() : 1)
                .max()
                .orElse(0) + 1;

        for (EmissionCalculation old : existingRecords) {
            if (calcType.equalsIgnoreCase(old.getCalculationType())
                    && "CALCULATED".equalsIgnoreCase(old.getCalculationStatus())) {
                old.setCalculationStatus("SUPERSEDED");
            }
        }
        emissionCalculationRepository.saveAll(existingRecords);

        Optional<EmissionFactor> factorOpt = resolveEmissionFactor(request.getFuelType(), request.getEuroStandard());
        if (factorOpt.isEmpty()) {
            EmissionCalculation blocked = new EmissionCalculation();
            blocked.setTripId(request.getTripId());
            blocked.setCalculationType(calcType);
            blocked.setCalculationMethod("GLEC_V3");
            blocked.setCargoPayloadTons(request.getCargoPayloadTons());
            blocked.setTotalDistanceKm(request.getTotalDistanceKm());
            blocked.setEmptyRunningDistanceKm(
                    request.getEmptyRunningDistanceKm() != null ? request.getEmptyRunningDistanceKm() : BigDecimal.ZERO);
            blocked.setTotalCo2eKg(BigDecimal.ZERO);
            blocked.setTtwCo2eKg(BigDecimal.ZERO);
            blocked.setWttCo2eKg(BigDecimal.ZERO);
            blocked.setWtwCo2eKg(BigDecimal.ZERO);
            blocked.setCalculationStatus("BLOCKED");
            blocked.setBlockedReason("BRULE-13: Không tìm thấy hệ số phát thải hợp lệ cho nhiên liệu "
                    + request.getFuelType() + " / tiêu chuẩn " + request.getEuroStandard());
            blocked.setVersionNumber(nextVersion);
            blocked.setCalculatedAt(Instant.now());
            return carbonMapper.toResponse(emissionCalculationRepository.save(blocked));
        }

        EmissionFactor factor = factorOpt.get();

        boolean applyDaf = "PLANNING".equalsIgnoreCase(calcType)
                || ccadroProperties.getCarbon().isApplyDafOnActualGps();
        BigDecimal dafMultiplier = applyDaf
                ? BigDecimal.valueOf(ccadroProperties.getCarbon().getDistanceAdjustmentFactor())
                : BigDecimal.ONE;

        BigDecimal effectiveDistanceKm = request.getTotalDistanceKm().multiply(dafMultiplier)
                .setScale(3, RoundingMode.HALF_UP);
        BigDecimal tonneKm = request.getCargoPayloadTons().multiply(effectiveDistanceKm);
        BigDecimal loadedCo2Kg = tonneKm.multiply(factor.getDefaultTonneKmFactor());

        BigDecimal emptyKm = request.getEmptyRunningDistanceKm() != null
                ? request.getEmptyRunningDistanceKm()
                : BigDecimal.ZERO;
        BigDecimal emptyFactor = factor.getEmptyFactorKgPerKm() != null
                ? factor.getEmptyFactorKgPerKm()
                : BigDecimal.valueOf(0.55);
        BigDecimal emptyCo2Kg = emptyKm.multiply(emptyFactor);

        BigDecimal totalWtw = loadedCo2Kg.add(emptyCo2Kg).setScale(4, RoundingMode.HALF_UP);
        BigDecimal totalTtw = totalWtw.multiply(TTW_SHARE).setScale(4, RoundingMode.HALF_UP);
        BigDecimal totalWtt = totalWtw.subtract(totalTtw).setScale(4, RoundingMode.HALF_UP);

        EmissionCalculation calculation = new EmissionCalculation();
        calculation.setTripId(request.getTripId());
        calculation.setCalculationType(calcType);
        calculation.setCalculationMethod("GLEC_V3");
        calculation.setCargoPayloadTons(request.getCargoPayloadTons());
        calculation.setTotalDistanceKm(effectiveDistanceKm);
        calculation.setEmptyRunningDistanceKm(emptyKm);
        calculation.setTotalCo2eKg(totalWtw);
        calculation.setTtwCo2eKg(totalTtw);
        calculation.setWttCo2eKg(totalWtt);
        calculation.setWtwCo2eKg(totalWtw);
        calculation.setDataQualityTier("POST_TRIP_ACCOUNTING".equalsIgnoreCase(calcType)
                ? "TIER_1_PRIMARY"
                : "TIER_2_MODELED");
        calculation.setFactorVersion(ccadroProperties.getCarbon().getFactorVersion());
        calculation.setCalculationStatus("CALCULATED");
        calculation.setIsDafApplied(applyDaf);
        calculation.setVersionNumber(nextVersion);
        calculation.setDetailsJson(String.format(Locale.ROOT,
                "{\"factorCode\":\"%s\",\"source\":\"%s\",\"tonneKm\":%.3f,\"emptyKm\":%.3f,\"dafApplied\":%b}",
                factor.getFactorCode(), factor.getSourceReference(), tonneKm, emptyKm, applyDaf));
        calculation.setCalculatedAt(Instant.now());

        return carbonMapper.toResponse(emissionCalculationRepository.save(calculation));
    }

    @Transactional
    public EmissionCalculation calculatePlanningCarbon(
            UUID tripId, BigDecimal payloadTons, BigDecimal distanceKm, String factorCode) {
        EmissionFactor factor = emissionFactorRepository.findByFactorCode(factorCode)
                .orElseGet(() -> emissionFactorRepository.findAll().stream().findFirst().orElse(null));

        BigDecimal tonneKmFactor = factor != null
                ? factor.getDefaultTonneKmFactor()
                : BigDecimal.valueOf(ccadroProperties.getCarbon().getDefaultTonneKmFactor());

        BigDecimal tonneKm = payloadTons.multiply(distanceKm);
        BigDecimal totalWtw = tonneKm.multiply(tonneKmFactor).setScale(4, RoundingMode.HALF_UP);
        BigDecimal totalTtw = totalWtw.multiply(TTW_SHARE).setScale(4, RoundingMode.HALF_UP);
        BigDecimal totalWtt = totalWtw.subtract(totalTtw).setScale(4, RoundingMode.HALF_UP);

        EmissionCalculation calculation = carbonMapper.toPlanningEntity(tripId, payloadTons, distanceKm, totalWtw);
        calculation.setTtwCo2eKg(totalTtw);
        calculation.setWttCo2eKg(totalWtt);
        calculation.setWtwCo2eKg(totalWtw);
        return emissionCalculationRepository.save(calculation);
    }

    public Optional<EmissionFactor> resolveEmissionFactor(String fuelType, String euroStandard) {
        if ("UNKNOWN".equalsIgnoreCase(fuelType) || "BLOCKED".equalsIgnoreCase(fuelType)) {
            return Optional.empty();
        }
        List<EmissionFactor> allFactors = emissionFactorRepository.findAll();
        Optional<EmissionFactor> exactMatch = allFactors.stream()
                .filter(EmissionFactor::isActive)
                .filter(f -> fuelType == null || fuelType.equalsIgnoreCase(f.getFuelType()))
                .filter(f -> euroStandard == null || euroStandard.equalsIgnoreCase(f.getEuroStandard()))
                .findFirst();
        if (exactMatch.isPresent()) {
            return exactMatch;
        }
        return allFactors.stream().filter(EmissionFactor::isActive).findFirst();
    }
}

