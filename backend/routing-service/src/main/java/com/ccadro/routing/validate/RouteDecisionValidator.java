package com.ccadro.routing.validate;

import com.ccadro.routing.entity.RouteCandidate;
import com.ccadro.routing.entity.RouteDecision;
import com.ccadro.routing.exception.AppException;
import com.ccadro.routing.exception.ErrorCode;
import com.ccadro.routing.repository.RouteCandidateRepository;
import lombok.AccessLevel;
import com.ccadro.routing.repository.httpclient.ShipmentClient;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Validator chuẩn hóa & kiểm tra ứng viên tuyến đường Human-in-the-Loop (UC05 / BRULE-09).
 */
@Component
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RouteDecisionValidator {

    RouteCandidateRepository routeCandidateRepository;
    ShipmentClient shipmentClient;

    public RouteDecisionValidator(RouteCandidateRepository repository) {
        this(repository, null);
    }

    @Autowired
    public RouteDecisionValidator(RouteCandidateRepository repository, ShipmentClient shipmentClient) {
        this.routeCandidateRepository = repository;
        this.shipmentClient = shipmentClient;
    }

    public RouteCandidate requireSelectedCandidate(UUID candidateId) {
        return routeCandidateRepository.findById(candidateId)
                .orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND));
    }

    public RouteCandidate requireSelectedCandidate(UUID candidateId, UUID shipmentId) {
        RouteCandidate candidate = requireRoadCandidate(candidateId, shipmentId);
        if (shipmentClient != null) {
            var response = shipmentClient.getShipmentById(shipmentId);
            var shipment = response != null ? response.getResult() : null;
            if (shipment == null || !java.util.Set.of("PENDING", "PLANNED").contains(String.valueOf(shipment.getStatus())))
                throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Chỉ chốt tuyến ban đầu cho vận đơn chờ xử lý/đã lập kế hoạch. Chuyến đã xuất bến phải dùng quy trình đổi tuyến.");
        }
        return candidate;
    }

    public RouteCandidate requireRoadCandidate(UUID candidateId, UUID shipmentId) {
        RouteCandidate candidate = requireSelectedCandidate(candidateId);
        if (!shipmentId.equals(candidate.getShipmentId())) {
            throw new AppException(ErrorCode.ROUTE_NOT_FOUND,
                    "Phương án lộ trình không thuộc vận đơn đang được chọn");
        }
        if ("MOCK".equalsIgnoreCase(candidate.getProviderName())) {
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED,
                    "Không thể chốt lộ trình mô phỏng làm tuyến vận hành chính thức");
        }
        if (!java.util.Set.of("OSRM", "TOMTOM").contains(String.valueOf(candidate.getProviderName()).toUpperCase(java.util.Locale.ROOT))
                || candidate.getRouteGeometry() == null || candidate.getRouteGeometry().getNumPoints() < 2
                || candidate.getDistanceMeters() == null || candidate.getDistanceMeters().signum() <= 0
                || candidate.getDurationSeconds() == null || candidate.getDurationSeconds().signum() <= 0)
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED, "Tuyến chưa có dữ liệu đường hợp lệ từ nhà cung cấp hỗ trợ");
        return candidate;
    }

    public void applyDefaultAuditMetadata(RouteDecision decision) {
        if (decision.getDecisionType() == null || decision.getDecisionType().isBlank()) {
            decision.setDecisionType("RECOMMENDED");
        }
        if (decision.getDecidedBy() == null || decision.getDecidedBy().isBlank()) {
            decision.setDecidedBy("DISPATCHER");
        }
    }
}

