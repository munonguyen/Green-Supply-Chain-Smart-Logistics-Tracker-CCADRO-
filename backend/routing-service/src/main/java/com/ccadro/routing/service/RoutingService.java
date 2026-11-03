package com.ccadro.routing.service;

import com.ccadro.routing.dto.request.RouteDecisionRequest;
import com.ccadro.routing.dto.request.RoutePlanRequest;
import com.ccadro.routing.dto.response.RouteCandidateResponse;
import com.ccadro.routing.dto.response.RouteDecisionResponse;
import com.ccadro.routing.entity.RouteCandidate;
import com.ccadro.routing.entity.RouteCandidateData;
import com.ccadro.routing.entity.RouteVersion;
import com.ccadro.routing.entity.RoutingProvider;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Facade Coordinator cho domain Routing (UC05, UC10):
 * - Ủy quyền nghiệp vụ tính toán & tối ưu hóa đa tiêu chí cho {@link RoutePlanningService}.
 * - Ủy quyền nghiệp vụ phê duyệt & phiên bản hóa lộ trình cho {@link RouteDecisionService}.
 * Đảm bảo kiến trúc phân tách rõ ràng và tương thích 100% với Controllers và Test cases.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoutingService {

    RoutePlanningService routePlanningService;
    RouteDecisionService routeDecisionService;

    public RoutingProvider getActiveRoutingProvider() {
        return routePlanningService.getActiveRoutingProvider();
    }

    @Transactional
    public List<RouteCandidateResponse> planRoutes(RoutePlanRequest planRequest) {
        return routePlanningService.planRoutes(planRequest);
    }

    @Transactional
    public List<RouteCandidateData> calculateRoutesForShipment(UUID shipmentId) {
        return routePlanningService.calculateRoutesForShipment(shipmentId);
    }

    @Transactional
    public RouteDecisionResponse selectRoute(RouteDecisionRequest request) {
        return routeDecisionService.selectRoute(request);
    }

    public List<RouteCandidate> getSavedCandidates(UUID shipmentId) {
        return routePlanningService.getSavedCandidates(shipmentId);
    }

    public RouteVersion getActiveRouteVersion(UUID shipmentId) {
        return routeDecisionService.getActiveRouteVersion(shipmentId);
    }

    public List<RouteVersion> getRouteVersions(UUID shipmentId) {
        return routeDecisionService.getRouteVersions(shipmentId);
    }
}
