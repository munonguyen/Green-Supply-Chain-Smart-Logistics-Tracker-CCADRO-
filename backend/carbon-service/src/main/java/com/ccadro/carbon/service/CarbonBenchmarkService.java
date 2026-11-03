package com.ccadro.carbon.service;

import com.ccadro.carbon.entity.CarbonBenchmark;
import com.ccadro.carbon.entity.CarbonBenchmarkResult;
import com.ccadro.carbon.entity.EmissionCalculation;
import com.ccadro.carbon.exception.AppException;
import com.ccadro.carbon.exception.ErrorCode;
import com.ccadro.carbon.repository.CarbonBenchmarkRepository;
import com.ccadro.carbon.repository.CarbonBenchmarkResultRepository;
import com.ccadro.carbon.repository.EmissionCalculationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Đối chuẩn hiệu quả giảm phát thải trên hành lang logistics (Corridor Benchmarking - UC13):
 * - So sánh phát thải thực tế với cơ sở BAU/Shortest/Fastest.
 * - Giữ nguyên kết quả âm hoặc chưa kết luận để đảm bảo tính liêm chính kiểm toán (BRULE-15).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CarbonBenchmarkService {

    CarbonBenchmarkRepository carbonBenchmarkRepository;
    CarbonBenchmarkResultRepository carbonBenchmarkResultRepository;
    EmissionCalculationRepository emissionCalculationRepository;

    public List<CarbonBenchmark> getAllBenchmarks() {
        return carbonBenchmarkRepository.findAll();
    }

    @Transactional
    public CarbonBenchmarkResult evaluateTripBenchmark(UUID tripId) {
        List<EmissionCalculation> calcs = emissionCalculationRepository.findByTripId(tripId);
        EmissionCalculation activeCalc = calcs.stream()
                .filter(c -> "CALCULATED".equalsIgnoreCase(c.getCalculationStatus()))
                .max(Comparator.comparingInt(c -> c.getVersionNumber() != null ? c.getVersionNumber() : 1))
                .orElseThrow(() -> new AppException(ErrorCode.EMISSION_CALCULATION_FAILED,
                        "Chưa có kết quả kế toán phát thải hợp lệ cho chuyến đi: " + tripId));

        CarbonBenchmark corridor = carbonBenchmarkRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.CORRIDOR_BENCHMARK_NOT_FOUND));

        BigDecimal tonneKm = activeCalc.getCargoPayloadTons().multiply(activeCalc.getTotalDistanceKm());
        BigDecimal baselineCo2Kg = tonneKm.multiply(corridor.getAverageCo2ePerTonneKm())
                .setScale(4, RoundingMode.HALF_UP);
        BigDecimal ccadroCo2Kg = activeCalc.getTotalCo2eKg();

        BigDecimal reductionPercent = BigDecimal.ZERO;
        if (baselineCo2Kg.compareTo(BigDecimal.ZERO) > 0) {
            reductionPercent = baselineCo2Kg.subtract(ccadroCo2Kg)
                    .divide(baselineCo2Kg, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // BRULE-15: Không ẩn giấu kết quả âm hoặc bất lợi
        String comparability = tonneKm.compareTo(BigDecimal.ZERO) > 0 ? "COMPARABLE" : "INCONCLUSIVE";
        String notes = reductionPercent.compareTo(BigDecimal.ZERO) >= 0
                ? "Đạt chuẩn giảm phát thải so với trung bình hành lang (" + corridor.getBenchmarkName() + ")"
                : "BRULE-15: Phát thải cao hơn trung bình hành lang do đi vòng hoặc tải trọng thấp (giữ nguyên kết quả thực tế)";

        CarbonBenchmarkResult result = new CarbonBenchmarkResult();
        result.setTripId(tripId);
        result.setBenchmarkCorridorId(corridor.getId());
        result.setBenchmarkType("EX_POST_MODELLED");
        result.setBaselineRouteType("BAU_CONVENTIONAL");
        result.setBaselineCo2eKg(baselineCo2Kg);
        result.setCcadroCo2eKg(ccadroCo2Kg);
        result.setCarbonReductionPercent(reductionPercent);
        result.setComparabilityStatus(comparability);
        result.setConfidenceScore(new BigDecimal("0.95"));
        result.setLimitationsNotes(notes);
        result.setEvaluatedAt(Instant.now());

        return carbonBenchmarkResultRepository.save(result);
    }

    public List<CarbonBenchmarkResult> getBenchmarkResultsByTrip(UUID tripId) {
        return carbonBenchmarkResultRepository.findByTripId(tripId);
    }
}

