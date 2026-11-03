package com.ccadro.incident.controller;

import com.ccadro.incident.dto.ApiResponse;
import com.ccadro.incident.dto.request.DemeritReviewRequest;
import com.ccadro.incident.dto.request.ExceptionResolutionRequest;
import com.ccadro.incident.dto.request.FieldIncidentCreateRequest;
import com.ccadro.incident.dto.response.DriverDemeritSummaryResponse;
import com.ccadro.incident.dto.response.FieldIncidentResponse;
import com.ccadro.incident.entity.DemeritRecord;
import com.ccadro.incident.entity.ExceptionResolution;
import com.ccadro.incident.service.FieldIncidentService;
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
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Field Incidents & Exceptions", description = "UC16, UC17, UC18 - Logistics exception handling and driver demerit governance (BRULE-17, BRULE-18)")
public class FieldIncidentController {

    FieldIncidentService fieldIncidentService;

    @GetMapping
    @Operation(summary = "List all field incidents")
    public ApiResponse<List<FieldIncidentResponse>> getAll() {
        return ApiResponse.success(fieldIncidentService.getAllIncidents());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get field incident by ID")
    public ApiResponse<FieldIncidentResponse> getById(@PathVariable UUID id) {
        return ApiResponse.success(fieldIncidentService.getIncidentById(id));
    }

    @GetMapping("/trips/{tripId}")
    @Operation(summary = "Get field incidents by trip ID")
    public ApiResponse<List<FieldIncidentResponse>> getByTripId(@PathVariable UUID tripId) {
        return ApiResponse.success(fieldIncidentService.getIncidentsByTripId(tripId));
    }

    @PostMapping
    @Operation(summary = "Report a new field incident (UC16, BRULE-17)")
    public ApiResponse<FieldIncidentResponse> create(@Valid @RequestBody FieldIncidentCreateRequest request) {
        return ApiResponse.success("Báo cáo sự cố hiện trường thành công", fieldIncidentService.createIncident(request));
    }

    @PostMapping("/{incidentId}/resolve")
    @Operation(summary = "Supervisor resolves a field incident (UC17, BRULE-17)")
    public ApiResponse<ExceptionResolution> resolveIncident(
            @PathVariable UUID incidentId,
            @Valid @RequestBody ExceptionResolutionRequest request) {
        return ApiResponse.success("Thẩm định và xử lý sự cố hiện trường thành công",
                fieldIncidentService.resolveIncident(incidentId, request));
    }

    @GetMapping("/{incidentId}/resolutions")
    @Operation(summary = "Get exception resolutions by incident ID (UC17)")
    public ApiResponse<List<ExceptionResolution>> getResolutions(@PathVariable UUID incidentId) {
        return ApiResponse.success(fieldIncidentService.getResolutionsByIncidentId(incidentId));
    }

    @GetMapping("/drivers/{driverId}/demerits")
    @Operation(summary = "Get demerit records by driver ID (UC18)")
    public ApiResponse<List<DemeritRecord>> getDemerits(@PathVariable UUID driverId) {
        return ApiResponse.success(fieldIncidentService.getDemeritsByDriverId(driverId));
    }

    @GetMapping("/drivers/{driverId}/demerit-summary")
    @Operation(summary = "Get driver cumulative demerit summary and governance status (UC18, BRULE-18)")
    public ApiResponse<DriverDemeritSummaryResponse> getDriverDemeritSummary(@PathVariable UUID driverId) {
        return ApiResponse.success(fieldIncidentService.getDriverDemeritSummary(driverId));
    }

    @PutMapping("/demerits/{demeritId}/review")
    @Operation(summary = "HR / Fleet Manager reviews demerit record for disciplinary decision (UC18, BRULE-18)")
    public ApiResponse<DemeritRecord> reviewDemerit(
            @PathVariable UUID demeritId,
            @Valid @RequestBody DemeritReviewRequest request) {
        return ApiResponse.success("Cập nhật quyết định hội đồng kỷ luật thành công",
                fieldIncidentService.reviewDemeritRecord(demeritId, request));
    }
}
