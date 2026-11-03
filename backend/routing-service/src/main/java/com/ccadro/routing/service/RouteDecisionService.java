package com.ccadro.routing.service;

import com.ccadro.routing.dto.request.RouteDecisionRequest;
import com.ccadro.routing.dto.response.RouteDecisionResponse;
import com.ccadro.routing.entity.RouteCandidate;
import com.ccadro.routing.entity.RouteDecision;
import com.ccadro.routing.entity.RouteVersion;
import com.ccadro.routing.exception.AppException;
import com.ccadro.routing.exception.ErrorCode;
import com.ccadro.routing.mapper.RouteDecisionMapper;
import com.ccadro.routing.repository.RouteCandidateRepository;
import com.ccadro.routing.repository.RouteDecisionRepository;
import com.ccadro.routing.repository.RouteVersionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Service quản lý phê duyệt lộ trình và phiên bản tuyến đường (TASK-06 / UC05 & BRULE-09):
 * - Dispatcher Human-in-the-Loop: Phê duyệt phương án tuyến chính thức.
 * - Lưu vết quyết định (Audit Trail) trong RouteDecision.
 * - Quản lý bất biến lịch sử các phiên bản lộ trình (RouteVersion v1, v2...).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RouteDecisionService {

    RouteCandidateRepository routeCandidateRepository;
    RouteDecisionRepository routeDecisionRepository;
    RouteVersionRepository routeVersionRepository;
    RouteDecisionMapper routeDecisionMapper;

    /**
     * Điều phối viên chốt phương án tuyến chính thức và khởi tạo RouteVersion mới ở trạng thái ACTIVE.
     */
    @Transactional
    public RouteDecisionResponse selectRoute(RouteDecisionRequest request) {
        RouteCandidate selectedCandidate = routeCandidateRepository.findById(request.getSelectedCandidateId())
                .orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND));

        // Cập nhật cờ isSelected cho tập ứng viên của đơn hàng
        List<RouteCandidate> allCandidates = routeCandidateRepository.findByShipmentId(request.getShipmentId());
        for (RouteCandidate candidate : allCandidates) {
            candidate.setSelected(candidate.getId().equals(selectedCandidate.getId()));
        }
        routeCandidateRepository.saveAll(allCandidates);

        // Lưu vết quyết định của Điều phối viên (Audit Trail)
        RouteDecision decision = routeDecisionMapper.toEntity(request);
        if (decision.getDecisionType() == null || decision.getDecisionType().isBlank()) {
            decision.setDecisionType("RECOMMENDED");
        }
        if (decision.getDecidedBy() == null || decision.getDecidedBy().isBlank()) {
            decision.setDecidedBy("DISPATCHER");
        }
        decision.setDecidedAt(Instant.now());
        RouteDecision savedDecision = routeDecisionRepository.save(decision);

        // Vô hiệu hóa các RouteVersion cũ và tạo RouteVersion mới (v1, v2...)
        List<RouteVersion> existingVersions = routeVersionRepository
                .findByShipmentIdOrderByVersionNumberDesc(request.getShipmentId());
        int nextVersionNumber = existingVersions.isEmpty() ? 1 : existingVersions.get(0).getVersionNumber() + 1;
        for (RouteVersion oldVersion : existingVersions) {
            oldVersion.setActive(false);
        }
        routeVersionRepository.saveAll(existingVersions);

        RouteVersion newVersion = new RouteVersion();
        newVersion.setShipmentId(request.getShipmentId());
        newVersion.setVersionNumber(nextVersionNumber);
        newVersion.setRouteGeometry(selectedCandidate.getRouteGeometry());
        newVersion.setTotalDistanceMeters(selectedCandidate.getDistanceMeters());
        newVersion.setTotalDurationSeconds(selectedCandidate.getDurationSeconds());
        newVersion.setActive(true);
        newVersion.setReason(nextVersionNumber == 1 ? "INITIAL_PLANNING" : "DISPATCHER_RESELECTION");
        newVersion.setCreatedAt(Instant.now());
        routeVersionRepository.save(newVersion);

        return routeDecisionMapper.toResponse(savedDecision);
    }

    public RouteVersion getActiveRouteVersion(UUID shipmentId) {
        return routeVersionRepository.findByShipmentIdAndIsActiveTrue(shipmentId)
                .orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND,
                        "Chưa có phiên bản lộ trình hiệu lực cho đơn hàng: " + shipmentId));
    }

    public List<RouteVersion> getRouteVersions(UUID shipmentId) {
        return routeVersionRepository.findByShipmentIdOrderByVersionNumberDesc(shipmentId);
    }
}

