package com.ccadro.tracking.service;

import com.ccadro.tracking.client.EmergencyNotificationPublisher;
import com.ccadro.tracking.client.RoadRerouteClient;
import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.dto.ApiResponse;
import com.ccadro.tracking.dto.request.RerouteApprovalRequest;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.exception.ErrorCode;
import com.ccadro.tracking.mapper.RerouteProposalMapper;
import com.ccadro.tracking.repository.RerouteProposalRepository;
import com.ccadro.tracking.repository.TripRepository;
import com.ccadro.tracking.repository.TelemetryEventRepository;
import com.ccadro.tracking.validate.ReroutePolicyValidator;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản lý đề xuất và phê duyệt đổi tuyến động Human-in-the-Loop (Reroute Proposal Service - UC10 / BRULE-08, BRULE-09):
 * - Cooldown Window 300s chống rung lắc lộ trình.
 * - Minimum Benefit Threshold >= 10% (0.1000).
 * - Dispatcher phê duyệt ACCEPTED -> đồng bộ nâng cấp RouteVersion mới tại routing-service & cập nhật activeRouteVersionId.
 */
@Service
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RerouteProposalService {

    RerouteProposalRepository rerouteProposalRepository;
    TripRepository tripRepository;
    RerouteProposalMapper rerouteProposalMapper;
    EmergencyNotificationPublisher notificationPublisher;
    CcadroProperties ccadroProperties;
    ReroutePolicyValidator reroutePolicyValidator;
    TelemetryEventRepository telemetryEventRepository;
    RoadRerouteClient roadRerouteClient;

    @NonFinal
    @Value("${services.routing.url:http://localhost:8083}")
    String routingServiceUrl = "http://localhost:8083";

    public RerouteProposalService(
            RerouteProposalRepository rerouteProposalRepository,
            TripRepository tripRepository,
            RerouteProposalMapper rerouteProposalMapper,
            EmergencyNotificationPublisher notificationPublisher) {
        this(rerouteProposalRepository, tripRepository, rerouteProposalMapper,
                notificationPublisher, new CcadroProperties(), new ReroutePolicyValidator());
    }

    public RerouteProposalService(
            RerouteProposalRepository rerouteProposalRepository,
            TripRepository tripRepository,
            RerouteProposalMapper rerouteProposalMapper,
            EmergencyNotificationPublisher notificationPublisher,
            CcadroProperties ccadroProperties) {
        this(rerouteProposalRepository, tripRepository, rerouteProposalMapper,
                notificationPublisher, ccadroProperties, new ReroutePolicyValidator());
    }

    public RerouteProposalService(
            RerouteProposalRepository rerouteProposalRepository,
            TripRepository tripRepository,
            RerouteProposalMapper rerouteProposalMapper,
            EmergencyNotificationPublisher notificationPublisher,
            CcadroProperties ccadroProperties,
            ReroutePolicyValidator reroutePolicyValidator) {
        this(rerouteProposalRepository, tripRepository, rerouteProposalMapper, notificationPublisher,
            ccadroProperties, reroutePolicyValidator, null, null);
    }

    @Autowired
    public RerouteProposalService(RerouteProposalRepository rerouteProposalRepository, TripRepository tripRepository,
            RerouteProposalMapper rerouteProposalMapper, EmergencyNotificationPublisher notificationPublisher,
            CcadroProperties ccadroProperties, ReroutePolicyValidator reroutePolicyValidator,
            TelemetryEventRepository telemetryEventRepository, RoadRerouteClient roadRerouteClient) {
        this.rerouteProposalRepository = rerouteProposalRepository;
        this.tripRepository = tripRepository;
        this.rerouteProposalMapper = rerouteProposalMapper;
        this.notificationPublisher = notificationPublisher;
        this.ccadroProperties = ccadroProperties != null ? ccadroProperties : new CcadroProperties();
        this.reroutePolicyValidator = reroutePolicyValidator != null ? reroutePolicyValidator : new ReroutePolicyValidator();
        this.telemetryEventRepository = telemetryEventRepository;
        this.roadRerouteClient = roadRerouteClient;
    }

    public List<RerouteProposal> getProposals(UUID tripId) {
        return rerouteProposalRepository.findByTripId(tripId);
    }

    public List<RerouteProposalResponse> getProposalResponses(UUID tripId) {
        return rerouteProposalMapper.toResponseList(rerouteProposalRepository.findByTripId(tripId));
    }

    /**
     * Tính toán quãng đường còn lại thực tế từ activeRouteVersion - actualDistanceMeters
     * và đề xuất phương án tối ưu (> 10% lợi ích) nếu đủ điều kiện Cooldown 300s.
     */
    @Transactional
    public Optional<RerouteProposalResponse> evaluateDynamicRerouteForTrip(UUID tripId, String triggerReason) {
        boolean manual = "DISPATCHER_REQUEST".equals(triggerReason);
        if (telemetryEventRepository == null || roadRerouteClient == null) return Optional.empty();
        var trip = tripRepository.findById(tripId).orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
        if (!"EN_ROUTE".equals(trip.getStatus())) return Optional.empty();
        var previous = rerouteProposalRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId);
        if (!manual && reroutePolicyValidator.isWithinCooldownWindow(previous, ccadroProperties.getReroute().getCooldownSeconds()))
            return Optional.empty();
        var gps = telemetryEventRepository.findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(tripId);
        if (gps.isEmpty() || gps.get().getTimestamp() == null || gps.get().getLocationGeom() == null
                || gps.get().getTimestamp().isBefore(Instant.now().minusSeconds(300))) {
            if (manual) throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Cần GPS hợp lệ trong 5 phút gần nhất để tính lại tuyến");
            return Optional.empty();
        }
        var point = gps.get();
        var remaining = tripRepository.findRemainingRouteDistanceMeters(tripId, point.getLatitude(), point.getLongitude());
        if (remaining.isEmpty() || !Double.isFinite(remaining.get()) || remaining.get() <= 0) return Optional.empty();
        var baseline = BigDecimal.valueOf(remaining.get());
        Optional<RoadRerouteClient.RoadRoute> source;
        try {
            source = roadRerouteClient.calculate(trip.getShipmentId(), point.getLatitude(), point.getLongitude()).stream()
                .filter(route -> reroutePolicyValidator.calculateValidBenefitRatio(baseline, route.distanceMeters(),
                    BigDecimal.valueOf(ccadroProperties.getReroute().getMinimumBenefitRatio())).isPresent()).findFirst();
        } catch (Exception error) {
            if (manual) throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                "Chưa tính được tuyến đường thực từ GPS hiện tại. Kiểm tra dữ liệu điểm giao và nhà cung cấp định tuyến.");
            log.warn("Không tạo đề xuất đổi tuyến cho Trip {} do thiếu tuyến đường thực", tripId);
            return Optional.empty();
        }
        if (source.isEmpty()) return Optional.empty();
        return evaluateRoadReroute(tripId, triggerReason, baseline, source.get().distanceMeters(), source.get(), manual);
    }

    @Transactional
    public Optional<RerouteProposalResponse> evaluateDynamicReroute(
            UUID tripId, String triggerReason, BigDecimal originalRemainingMeters, BigDecimal proposedMeters) {
        return evaluateRoadReroute(tripId, triggerReason, originalRemainingMeters, proposedMeters, null, false);
    }

    private Optional<RerouteProposalResponse> evaluateRoadReroute(UUID tripId, String triggerReason,
            BigDecimal originalRemainingMeters, BigDecimal proposedMeters, RoadRerouteClient.RoadRoute source, boolean manual) {
        long cooldownSeconds = ccadroProperties.getReroute().getCooldownSeconds();
        BigDecimal minimumBenefitRatio = BigDecimal.valueOf(ccadroProperties.getReroute().getMinimumBenefitRatio());

        Optional<RerouteProposal> lastProposal = rerouteProposalRepository
                .findFirstByTripIdOrderByCreatedAtDesc(tripId);
        if (!manual && reroutePolicyValidator.isWithinCooldownWindow(lastProposal, cooldownSeconds)) {
            log.info("Bỏ qua đề xuất Reroute cho Trip {}: đang trong thời gian Cooldown {}s", tripId, cooldownSeconds);
            return Optional.empty();
        }

        Optional<BigDecimal> benefitOpt = reroutePolicyValidator.calculateValidBenefitRatio(
                originalRemainingMeters, proposedMeters, minimumBenefitRatio);
        if (benefitOpt.isEmpty()) {
            log.info("Đề xuất Reroute cho Trip {} không đạt ngưỡng tối thiểu {}", tripId, minimumBenefitRatio);
            return Optional.empty();
        }
        BigDecimal benefitRatio = benefitOpt.get();

        RerouteProposal proposal = new RerouteProposal();
        proposal.setTripId(tripId);
        proposal.setTriggerReason(triggerReason != null ? triggerReason : "DEVIATION_RED");
        proposal.setOriginalRemainingDistanceMeters(originalRemainingMeters);
        proposal.setProposedDistanceMeters(proposedMeters);
        proposal.setBenefitRatio(benefitRatio);
        proposal.setStatus("PENDING_DISPATCHER");
        proposal.setCreatedAt(Instant.now());
        proposal.setUpdatedAt(Instant.now());
        if (source != null) {
            proposal.setProposedGeometry(roadRerouteClient.geometry(source));
            proposal.setSourceCandidateId(source.candidateId());
            proposal.setProposedDurationSeconds(source.durationSeconds());
            proposal.setRoutingMetadataJson(source.routingMetadataJson());
            for (var older : rerouteProposalRepository.findByTripId(tripId)) {
                if ("PENDING_DISPATCHER".equals(older.getStatus())) {
                    older.setStatus("SUPERSEDED");
                    older.setUpdatedAt(Instant.now());
                    rerouteProposalRepository.save(older);
                }
            }
        }

        RerouteProposal saved = rerouteProposalRepository.save(proposal);

        return Optional.of(rerouteProposalMapper.toResponse(saved));
    }

    @Transactional
    public RerouteProposalResponse decideRerouteProposal(UUID proposalId, RerouteApprovalRequest request) {
        RerouteProposal proposal = rerouteProposalRepository.findById(proposalId)
                .orElseThrow(() -> new AppException(ErrorCode.REROUTE_BENEFIT_INSUFFICIENT,
                        "Không tìm thấy đề xuất đổi tuyến: " + proposalId));

        String decision = reroutePolicyValidator.validateDispatcherDecision(request.getDecision());
        reroutePolicyValidator.requirePendingDispatcher(proposal);

        if ("ACCEPTED".equals(decision) && (proposal.getProposedGeometry() == null
                || proposal.getSourceCandidateId() == null || proposal.getProposedDurationSeconds() == null))
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                "Đề xuất mới là ước tính lợi ích, chưa có tuyến đường thực. Tính và chốt phương án đường mới trước khi phê duyệt.");
        if ("ACCEPTED".equals(decision)) requireCurrentProposal(proposal);
        proposal.setStatus(decision);
        proposal.setUpdatedAt(Instant.now());
        RerouteProposal savedProposal = rerouteProposalRepository.save(proposal);

        if ("ACCEPTED".equals(decision)) {
            activateNewRouteVersionOnApproval(savedProposal);
        }

        return rerouteProposalMapper.toResponse(savedProposal);
    }

    private void activateNewRouteVersionOnApproval(RerouteProposal proposal) {
        Optional<Trip> tripOpt = tripRepository.findById(proposal.getTripId());
        if (tripOpt.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không tìm thấy chuyến cần đổi tuyến");
        }
        Trip trip = tripOpt.get();
        if (!java.util.Set.of("EN_ROUTE", "DELAYED").contains(String.valueOf(trip.getStatus())))
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Chuyến không còn trong trạng thái đang vận hành");

        try {
            var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(3000);
            factory.setReadTimeout(10000);
            RestClient routingClient = RestClient.builder().baseUrl(routingServiceUrl).requestFactory(factory).build();
            ApiResponse<Map<String, Object>> resp = routingClient.post()
                    .uri("/api/v1/routing/versions/reroute")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "shipmentId", trip.getShipmentId(),
                            "selectedCandidateId", proposal.getSourceCandidateId(),
                            "proposalId", proposal.getId()
                    ))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (resp != null && resp.getCode() == 1000 && resp.getResult() != null && resp.getResult().get("id") != null) {
                UUID newVersionId = UUID.fromString(resp.getResult().get("id").toString());
                trip.setActiveRouteVersionId(newVersionId);
                trip.setUpdatedAt(Instant.now());
                tripRepository.save(trip);
                log.info("Đã kích hoạt RouteVersion {} cho Trip {} sau khi Dispatcher duyệt ACCEPTED",
                        newVersionId, trip.getId());
            } else throw new IllegalStateException("Routing did not activate a route version");
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                "Chưa kích hoạt được tuyến mới. Đề xuất vẫn cần xử lý; kiểm tra hình học và thời gian tuyến tại Routing.");
        }
    }

    private void requireCurrentProposal(RerouteProposal proposal) {
        var gps = telemetryEventRepository.findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(proposal.getTripId());
        if (proposal.getCreatedAt().isBefore(Instant.now().minusSeconds(300)) || gps.isEmpty()
                || gps.get().getTimestamp() == null || gps.get().getTimestamp().isBefore(Instant.now().minusSeconds(300))
                || gps.get().getLocationGeom() == null)
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Đề xuất hoặc GPS đã cũ; cần tính lại tuyến trước khi duyệt");
        var start = proposal.getProposedGeometry().getCoordinateN(0);
        double lat1 = Math.toRadians(start.y), lat2 = Math.toRadians(gps.get().getLatitude());
        double dLat = lat2 - lat1, dLon = Math.toRadians(gps.get().getLongitude() - start.x);
        double a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLon / 2), 2);
        double distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
        if (distance > 250) throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
            "Xe đã cách điểm tính tuyến hơn 250 m; cần tính lại từ GPS hiện tại");
    }
}
