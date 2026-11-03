package com.ccadro.carbon.service;

import com.ccadro.carbon.dto.request.EmissionCalculationRequest;
import com.ccadro.carbon.dto.request.FuelCostCalculationRequest;
import com.ccadro.carbon.dto.request.PodSubmissionRequest;
import com.ccadro.carbon.dto.response.EmissionCalculationResponse;
import com.ccadro.carbon.dto.response.FuelCostCalculationResponse;
import com.ccadro.carbon.dto.response.PodResponse;
import com.ccadro.carbon.entity.*;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Facade Service điều phối tổng thể phân hệ Kế toán phát thải Carbon & Đối chuẩn (Carbon Module - UC11, 12, 13, 14, 18).
 * Phân rã nghiệp vụ chi tiết vào 5 dịch vụ chuyên biệt:
 * 1. FuelCostService: Danh mục 7 loại nhiên liệu và quy đổi chi phí -> CO2e (TASK-18)
 * 2. PodService: Giao hàng điện tử ePOD và ghi nhận cự ly thực tế (UC11)
 * 3. EmissionAccountingService: Kế toán phát thải GLEC v3 (WTW = TTW + WTT) (UC12)
 * 4. CarbonBenchmarkService: Đối chuẩn hành lang vận tải (UC13)
 * 5. CarbonReportService: Kết xuất báo cáo kiểm toán có mã băm SHA-256 (UC14)
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CarbonService {

    FuelCostService fuelCostService;
    PodService podService;
    EmissionAccountingService emissionAccountingService;
    CarbonBenchmarkService carbonBenchmarkService;
    CarbonReportService carbonReportService;

    // --- 1. Fuel Price Catalog & Multi-fuel model (TASK-18) ---
    public List<FuelPriceCatalog> getAllActiveFuels() {
        return fuelCostService.getAllActiveFuels();
    }

    public FuelCostCalculationResponse calculateFromFuelCostAndTelemetry(FuelCostCalculationRequest request) {
        return fuelCostService.calculateFromFuelCostAndTelemetry(request);
    }

    // --- 2. Electronic Proof of Delivery (ePOD - UC11) ---
    @Transactional
    public PodResponse submitPodAndCalculateEmissions(PodSubmissionRequest request) {
        return podService.submitPodAndCalculateEmissions(request);
    }

    // --- 3. GLEC v3 Emission Accounting (UC12) ---
    public List<EmissionFactor> getAllFactors() {
        return emissionAccountingService.getAllFactors();
    }

    public Optional<EmissionFactor> getFactorByCode(String code) {
        return emissionAccountingService.getFactorByCode(code);
    }

    public List<EmissionCalculation> getTripCalculations(UUID tripId) {
        return emissionAccountingService.getTripCalculations(tripId);
    }

    public List<EmissionCalculationResponse> getTripCalculationResponses(UUID tripId) {
        return emissionAccountingService.getTripCalculationResponses(tripId);
    }

    @Transactional
    public EmissionCalculationResponse calculateGlecV3Emissions(EmissionCalculationRequest request) {
        return emissionAccountingService.calculateGlecV3Emissions(request);
    }

    @Transactional
    public EmissionCalculation calculatePlanningCarbon(UUID tripId, BigDecimal payloadTons, BigDecimal distanceKm, String factorCode) {
        return emissionAccountingService.calculatePlanningCarbon(tripId, payloadTons, distanceKm, factorCode);
    }

    // --- 4. Corridor Benchmarking (UC13) ---
    public List<CarbonBenchmark> getAllBenchmarks() {
        return carbonBenchmarkService.getAllBenchmarks();
    }

    @Transactional
    public CarbonBenchmarkResult evaluateTripBenchmark(UUID tripId) {
        return carbonBenchmarkService.evaluateTripBenchmark(tripId);
    }

    public List<CarbonBenchmarkResult> getBenchmarkResultsByTrip(UUID tripId) {
        return carbonBenchmarkService.getBenchmarkResultsByTrip(tripId);
    }

    // --- 5. ESG Audit Report Export (UC14) ---
    @Transactional
    public CarbonReportExport exportAuditReport(String reportName, String exportFormat, String exportedBy) {
        return carbonReportService.exportAuditReport(reportName, exportFormat, exportedBy);
    }

    public List<CarbonReportExport> getAllReportExports() {
        return carbonReportService.getAllReportExports();
    }
}
