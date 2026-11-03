package com.ccadro.tracking.controller;

import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.dto.ApiResponse;
import com.ccadro.tracking.dto.request.RerouteApprovalRequest;
import com.ccadro.tracking.dto.response.DeviationAlertResponse;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import com.ccadro.tracking.dto.response.TelemetryResponse;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.mapper.TrackingMapper;
import com.ccadro.tracking.service.TrackingService;
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
@RequestMapping("/api/v1/tracking")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Trip Tracking & Dynamic Rerouting", description = "UC07, UC08, UC09, UC10 - Real-time GPS telemetry, 3-point deviation buffer state machine & Human-in-the-Loop reroute approval (BRULE-08, BRULE-09, BRULE-10)")
public class TrackingController {

    TrackingService trackingService;
    TrackingMapper trackingMapper;

    @PostMapping("/telemetry")
    @Operation(summary = "Ingest GPS Telemetry Point with Quality Gate & Deviation State Machine (UC08, UC09, BRULE-10)")
    public ApiResponse<TelemetryResponse> ingestTelemetry(@Valid @RequestBody IngestTelemetryRequest request) {
        return ApiResponse.success("Dữ liệu telemetry được ghi nhận thành công",
                trackingMapper.toTelemetryResponse(trackingService.ingestTelemetry(request)));
    }

    @GetMapping("/trips")
    @Operation(summary = "List all trips (UC07)")
    public ApiResponse<List<Trip>> getAllTrips() {
        return ApiResponse.success(trackingService.getAllTrips());
    }

    @GetMapping("/trips/{tripId}")
    @Operation(summary = "Get trip tracking state (UC07, UC08)")
    public ApiResponse<Trip> getTrip(@PathVariable UUID tripId) {
        return ApiResponse.success(trackingService.getTripById(tripId));
    }

    @PutMapping("/trips/{tripId}/start")
    @Operation(summary = "Start trip execution (UC07)")
    public ApiResponse<Trip> startTrip(@PathVariable UUID tripId) {
        return ApiResponse.success("Chuyến xe đã bắt đầu lăn bánh (EN_ROUTE)", trackingService.startTrip(tripId));
    }

    @PutMapping("/trips/{tripId}/complete")
    @Operation(summary = "Complete trip execution (UC07)")
    public ApiResponse<Trip> completeTrip(@PathVariable UUID tripId) {
        return ApiResponse.success("Chuyến xe đã hoàn thành hành trình (COMPLETED)", trackingService.completeTrip(tripId));
    }

    @GetMapping("/trips/{tripId}/telemetry")
    @Operation(summary = "Get historical GPS telemetry track for trip (UC08)")
    public ApiResponse<List<TelemetryResponse>> getTelemetryHistory(@PathVariable UUID tripId) {
        return ApiResponse.success(trackingService.getTelemetryHistory(tripId).stream()
                .map(trackingMapper::toTelemetryResponse)
                .toList());
    }

    @GetMapping("/trips/{tripId}/alerts")
    @Operation(summary = "Get deviation alerts for trip (UC09)")
    public ApiResponse<List<DeviationAlertResponse>> getAlerts(@PathVariable UUID tripId) {
        return ApiResponse.success(trackingMapper.toDeviationAlertResponseList(trackingService.getAlerts(tripId)));
    }

    @GetMapping("/trips/{tripId}/proposals")
    @Operation(summary = "Get dynamic reroute proposals for trip (UC10)")
    public ApiResponse<List<RerouteProposalResponse>> getProposals(@PathVariable UUID tripId) {
        return ApiResponse.success(trackingService.getProposalResponses(tripId));
    }

    @PutMapping("/reroute-proposals/{proposalId}/decision")
    @Operation(summary = "Dispatcher approves or rejects a reroute proposal - Human-in-the-Loop (UC10, BRULE-09)")
    public ApiResponse<RerouteProposalResponse> decideRerouteProposal(
            @PathVariable UUID proposalId,
            @Valid @RequestBody RerouteApprovalRequest request) {
        return ApiResponse.success("Đã ghi nhận quyết định phê duyệt đổi tuyến của Điều phối viên",
                trackingService.decideRerouteProposal(proposalId, request));
    }
}
