package com.ccadro.tracking.controller;

import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.dto.ApiResponse;
import com.ccadro.tracking.dto.request.CreateTripRequest;
import com.ccadro.tracking.dto.request.RerouteApprovalRequest;
import com.ccadro.tracking.dto.response.DeviationAlertResponse;
import com.ccadro.tracking.dto.response.LiveFleetTelemetryResponse;
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
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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
    @Operation(summary = "Ingest GPS Telemetry Point with Quality Gate, Deviation State Machine & Arrival Geofence (UC08, UC09, BRULE-10)")
    public ApiResponse<TelemetryResponse> ingestTelemetry(@Valid @RequestBody IngestTelemetryRequest request) {
        TelemetryResponse response = trackingMapper.toTelemetryResponse(trackingService.ingestTelemetry(request));
        trackingService.findTripById(request.getTripId()).ifPresent(trip -> {
            if (trip.getDistanceToDestinationMeters() != null) {
                response.setDistanceToDestinationMeters(trip.getDistanceToDestinationMeters().doubleValue());
            }
            response.setArrivalStatus(trip.getArrivalStatus());
            response.setArrivedAtDestination("ARRIVED_AT_DESTINATION".equalsIgnoreCase(trip.getArrivalStatus())
                    || "DELIVERED".equalsIgnoreCase(trip.getArrivalStatus())
                    || trip.getArrivedAt() != null);
        });
        return ApiResponse.success("Dữ liệu telemetry được ghi nhận thành công", response);
    }

    @PostMapping("/trips")
    @Operation(summary = "Create or initialize Trip from Dispatch Saga (UC06, UC07)")
    public ApiResponse<Trip> createTrip(@Valid @RequestBody CreateTripRequest request) {
        return ApiResponse.success("Khởi tạo chuyến xe theo dõi thành công", trackingService.createOrGetTrip(request));
    }

    @GetMapping("/trips")
    @Operation(summary = "List all trips with Elastic search (?q=), driverId and soft-delete filter (UC07)")
    public ApiResponse<List<Trip>> getAllTrips(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestParam(required = false) UUID driverId) {
        return ApiResponse.success(trackingService.getAllTrips(q, includeDeleted, driverId));
    }

    @DeleteMapping("/trips/{tripId}")
    @Operation(summary = "Soft delete trip")
    public ApiResponse<Trip> softDeleteTrip(
            @PathVariable UUID tripId,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername) {
        return ApiResponse.success("Đã xóa mềm chuyến xe", trackingService.softDeleteTrip(tripId, callerUsername));
    }

    @PostMapping("/trips/{tripId}/restore")
    @Operation(summary = "Restore soft-deleted trip")
    public ApiResponse<Trip> restoreTrip(@PathVariable UUID tripId) {
        return ApiResponse.success("Đã khôi phục chuyến xe", trackingService.restoreTrip(tripId));
    }

    @GetMapping("/fleet/live")
    @Operation(summary = "Get real-time fleet GPS telemetry snapshot aggregated from Trip, TelemetryEvent, RouteVersion & Container IoT (UC08)")
    public ApiResponse<List<LiveFleetTelemetryResponse>> getLiveFleetTelemetry(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID driverId) {
        return ApiResponse.success(trackingService.getLiveFleetTelemetry(customerId, q, driverId));
    }

    @GetMapping("/trips/{tripId}/live")
    @Operation(summary = "Get real-time telemetry state, ETA, progress & deviation for a single Trip")
    public ApiResponse<LiveFleetTelemetryResponse> getLiveTripTelemetry(@PathVariable UUID tripId) {
        return ApiResponse.success(trackingService.getLiveTripTelemetry(tripId));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to Server-Sent Events (SSE) real-time fleet GPS stream")
    public SseEmitter streamFleetTelemetry(@RequestParam(required = false) String customerId) {
        return trackingService.subscribeFleetStream(customerId);
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
            @Valid @RequestBody RerouteApprovalRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        if (callerScope == null || callerScope.isBlank()
                || (!callerScope.contains("ROLE_ADMIN")
                && !callerScope.contains("ROLE_DISPATCHER"))) {
            throw new com.ccadro.tracking.exception.AppException(
                    com.ccadro.tracking.exception.ErrorCode.UNAUTHORIZED,
                    "Chỉ Điều phối viên (DISPATCHER) hoặc ADMIN mới có quyền phê duyệt đổi tuyến (BRULE-09).");
        }
        return ApiResponse.success("Đã ghi nhận quyết định phê duyệt đổi tuyến của Điều phối viên",
                trackingService.decideRerouteProposal(proposalId, request));
    }
}
