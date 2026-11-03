package com.ccadro.routing.controller;

import com.ccadro.routing.dto.ApiResponse;
import com.ccadro.routing.dto.request.RouteDecisionRequest;
import com.ccadro.routing.dto.request.RoutePlanRequest;
import com.ccadro.routing.dto.response.RouteCandidateResponse;
import com.ccadro.routing.dto.response.RouteDecisionResponse;
import com.ccadro.routing.entity.RouteCandidateData;
import com.ccadro.routing.entity.RouteVersion;
import com.ccadro.routing.mapper.RoutingMapper;
import com.ccadro.routing.service.RoutingService;
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
@RequestMapping("/api/v1/routing")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Routing Operations", description = "UC05, UC10 - Multi-criteria green route planning, Min-Max Pareto scoring & route versioning (BRULE-03, BRULE-04, BRULE-05, BRULE-09)")
public class RoutingController {

    RoutingService routingService;
    RoutingMapper routingMapper;

    @PostMapping("/plan")
    @Operation(summary = "Plan multi-criteria green routes with Min-Max normalization (UC05, BRULE-04, BRULE-05)")
    public ApiResponse<List<RouteCandidateResponse>> planRoutes(@Valid @RequestBody RoutePlanRequest request) {
        return ApiResponse.success("Tính toán và xếp hạng lộ trình xanh đa tiêu chí thành công",
                routingService.planRoutes(request));
    }

    @PostMapping("/calculate/{shipmentId}")
    @Operation(summary = "Calculate route candidates for shipment (UC05)")
    public ApiResponse<List<RouteCandidateData>> calculateRoutes(@PathVariable UUID shipmentId) {
        return ApiResponse.success("Tính toán các phương án lộ trình thành công",
                routingService.calculateRoutesForShipment(shipmentId));
    }

    @GetMapping("/candidates/{shipmentId}")
    @Operation(summary = "Get saved candidate routes for shipment (UC05)")
    public ApiResponse<List<RouteCandidateResponse>> getCandidates(@PathVariable UUID shipmentId) {
        return ApiResponse.success(routingMapper.toResponseList(routingService.getSavedCandidates(shipmentId)));
    }

    @PostMapping("/select")
    @Operation(summary = "Dispatcher selects official route candidate and creates RouteVersion (UC05, BRULE-09)")
    public ApiResponse<RouteDecisionResponse> selectRoute(@Valid @RequestBody RouteDecisionRequest request) {
        return ApiResponse.success("Đã chốt lộ trình chính thức và khởi tạo RouteVersion hiệu lực",
                routingService.selectRoute(request));
    }

    @GetMapping("/versions/{shipmentId}/active")
    @Operation(summary = "Get active route version for shipment")
    public ApiResponse<RouteVersion> getActiveRouteVersion(@PathVariable UUID shipmentId) {
        return ApiResponse.success(routingService.getActiveRouteVersion(shipmentId));
    }

    @GetMapping("/versions/{shipmentId}")
    @Operation(summary = "Get route version history for shipment")
    public ApiResponse<List<RouteVersion>> getRouteVersions(@PathVariable UUID shipmentId) {
        return ApiResponse.success(routingService.getRouteVersions(shipmentId));
    }
}
