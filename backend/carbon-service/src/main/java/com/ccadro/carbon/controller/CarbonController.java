package com.ccadro.carbon.controller;

import com.ccadro.carbon.dto.ApiResponse;
import com.ccadro.carbon.dto.request.EmissionCalculationRequest;
import com.ccadro.carbon.dto.request.FuelCostCalculationRequest;
import com.ccadro.carbon.dto.request.PodSubmissionRequest;
import com.ccadro.carbon.dto.response.CarbonBenchmarkResponse;
import com.ccadro.carbon.dto.response.EmissionCalculationResponse;
import com.ccadro.carbon.dto.response.FuelCostCalculationResponse;
import com.ccadro.carbon.dto.response.PodResponse;
import com.ccadro.carbon.entity.CarbonBenchmarkResult;
import com.ccadro.carbon.entity.CarbonReportExport;
import com.ccadro.carbon.entity.EmissionFactor;
import com.ccadro.carbon.entity.FuelPriceCatalog;
import com.ccadro.carbon.mapper.CarbonMapper;
import com.ccadro.carbon.service.CarbonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/carbon")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Carbon Accounting & Benchmark", description = "UC11, UC12, UC13, UC14 - ePOD, GLEC v3 carbon accounting (WTW/TTW/WTT), corridor benchmarking & audit export (BRULE-06, 11, 12, 13, 14, 15)")
public class CarbonController {

    CarbonService carbonService;
    CarbonMapper carbonMapper;

    @GetMapping("/factors")
    @Operation(summary = "List emission factors with GLEC v3 lineage (UC12, BRULE-12)")
    public ApiResponse<List<EmissionFactor>> getFactors() {
        return ApiResponse.success(carbonService.getAllFactors());
    }

    @PostMapping("/pod")
    @Operation(summary = "Submit electronic Proof of Delivery (ePOD) & trigger GLEC v3 post-trip accounting (UC11, UC12, BRULE-11)")
    public ApiResponse<PodResponse> submitPod(@Valid @RequestBody PodSubmissionRequest request) {
        return ApiResponse.success("Xác nhận biên bản giao hàng ePOD và hoàn tất kế toán phát thải GLEC v3",
                carbonService.submitPodAndCalculateEmissions(request));
    }

    @PostMapping("/calculate")
    @Operation(summary = "Calculate or recalculate trip carbon emissions per GLEC v3 with immutable versioning (UC12, BRULE-06, 11, 12, 13, 14)")
    public ApiResponse<EmissionCalculationResponse> calculateEmissions(
            @Valid @RequestBody EmissionCalculationRequest request) {
        return ApiResponse.success("Tính toán phát thải khí nhà kính chuẩn GLEC v3 thành công",
                carbonService.calculateGlecV3Emissions(request));
    }

    @GetMapping("/trips/{tripId}")
    @Operation(summary = "Get emission calculation audit trail for a trip (UC12, BRULE-14)")
    public ApiResponse<List<EmissionCalculationResponse>> getTripCalculations(@PathVariable UUID tripId) {
        return ApiResponse.success(carbonService.getTripCalculationResponses(tripId));
    }

    @GetMapping("/benchmarks")
    @Operation(summary = "List corridor carbon benchmarks (UC13)")
    public ApiResponse<List<CarbonBenchmarkResponse>> getBenchmarks() {
        return ApiResponse.success(carbonService.getAllBenchmarks().stream()
                .map(carbonMapper::toBenchmarkResponse)
                .toList());
    }

    @PostMapping("/benchmarks/evaluate/{tripId}")
    @Operation(summary = "Evaluate trip carbon performance against corridor baseline (UC13, BRULE-15)")
    public ApiResponse<CarbonBenchmarkResult> evaluateTripBenchmark(@PathVariable UUID tripId) {
        return ApiResponse.success("Đối chuẩn hiệu quả giảm phát thải hành lang thành công",
                carbonService.evaluateTripBenchmark(tripId));
    }

    @GetMapping("/benchmarks/trips/{tripId}")
    @Operation(summary = "Get corridor benchmark comparison results for trip (UC13, BRULE-15)")
    public ApiResponse<List<CarbonBenchmarkResult>> getTripBenchmarkResults(@PathVariable UUID tripId) {
        return ApiResponse.success(carbonService.getBenchmarkResultsByTrip(tripId));
    }

    @PostMapping("/reports/export")
    @Operation(summary = "Export ESG carbon audit report with SHA-256 tamper-proof hash (UC14)")
    public ApiResponse<CarbonReportExport> exportReport(
            @RequestParam(required = false) String reportName,
            @RequestParam(required = false, defaultValue = "CSV") String exportFormat,
            @RequestParam(required = false, defaultValue = "SUSTAINABILITY_MANAGER") String exportedBy) {
        return ApiResponse.success("Kết xuất báo cáo kiểm toán phát thải ESG thành công",
                carbonService.exportAuditReport(reportName, exportFormat, exportedBy));
    }

    @GetMapping("/reports")
    @Operation(summary = "List exported ESG carbon audit reports (UC14)")
    public ApiResponse<List<CarbonReportExport>> getReports() {
        return ApiResponse.success(carbonService.getAllReportExports());
    }

    @GetMapping("/fuels")
    @Operation(summary = "List 7 transportation fuel price & GLEC v3 emission factor catalogs (TASK-18)")
    public ApiResponse<List<FuelPriceCatalog>> getFuels() {
        return ApiResponse.success(carbonService.getAllActiveFuels());
    }

    @PostMapping("/calculate/fuel-cost")
    @Operation(summary = "Calculate GLEC v3 emissions from actual fuel cost (VND) -> Liters and detect fuel invoice fraud (TASK-18)")
    public ApiResponse<FuelCostCalculationResponse> calculateFromFuelCost(@Valid @RequestBody FuelCostCalculationRequest request) {
        return ApiResponse.success("Tính toán phát thải từ chi phí tiêu thụ nhiên liệu thành công",
                carbonService.calculateFromFuelCostAndTelemetry(request));
    }
}
