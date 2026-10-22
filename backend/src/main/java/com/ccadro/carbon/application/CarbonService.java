package com.ccadro.carbon.application;

import com.ccadro.carbon.domain.CarbonBenchmark;
import com.ccadro.carbon.domain.EmissionCalculation;
import com.ccadro.carbon.domain.EmissionFactor;
import com.ccadro.carbon.infrastructure.CarbonBenchmarkRepository;
import com.ccadro.carbon.infrastructure.EmissionCalculationRepository;
import com.ccadro.carbon.infrastructure.EmissionFactorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CarbonService {

    private final EmissionFactorRepository emissionFactorRepository;
    private final EmissionCalculationRepository emissionCalculationRepository;
    private final CarbonBenchmarkRepository carbonBenchmarkRepository;

    public CarbonService(EmissionFactorRepository emissionFactorRepository,
                         EmissionCalculationRepository emissionCalculationRepository,
                         CarbonBenchmarkRepository carbonBenchmarkRepository) {
        this.emissionFactorRepository = emissionFactorRepository;
        this.emissionCalculationRepository = emissionCalculationRepository;
        this.carbonBenchmarkRepository = carbonBenchmarkRepository;
    }

    public List<EmissionFactor> getAllFactors() {
        return emissionFactorRepository.findAll();
    }

    public Optional<EmissionFactor> getFactorByCode(String code) {
        return emissionFactorRepository.findByFactorCode(code);
    }

    public List<CarbonBenchmark> getAllBenchmarks() {
        return carbonBenchmarkRepository.findAll();
    }

    public List<EmissionCalculation> getTripCalculations(UUID tripId) {
        return emissionCalculationRepository.findByTripId(tripId);
    }

    @Transactional
    public EmissionCalculation calculatePlanningCarbon(UUID tripId, BigDecimal payloadTons, BigDecimal distanceKm, String factorCode) {
        EmissionFactor factor = emissionFactorRepository.findByFactorCode(factorCode)
                .orElseGet(() -> emissionFactorRepository.findAll().stream().findFirst().orElse(null));

        BigDecimal tonneKmFactor = factor != null ? factor.getDefaultTonneKmFactor() : BigDecimal.valueOf(0.08);

        // GLEC calculation: tonne-km * factor
        BigDecimal tonneKm = payloadTons.multiply(distanceKm);
        BigDecimal totalCo2eKg = tonneKm.multiply(tonneKmFactor).setScale(4, RoundingMode.HALF_UP);

        EmissionCalculation calculation = new EmissionCalculation();
        calculation.setTripId(tripId);
        calculation.setCalculationType("PLANNING");
        calculation.setCalculationMethod("GLEC_V3");
        calculation.setCargoPayloadTons(payloadTons);
        calculation.setTotalDistanceKm(distanceKm);
        calculation.setTotalCo2eKg(totalCo2eKg);

        return emissionCalculationRepository.save(calculation);
    }
}
