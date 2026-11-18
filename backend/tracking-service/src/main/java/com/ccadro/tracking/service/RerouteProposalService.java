package com.ccadro.tracking.service;

import com.ccadro.tracking.client.EmergencyNotificationPublisher;
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

    @Autowired
    public RerouteProposalService(
            RerouteProposalRepository rerouteProposalRepository,
            TripRepository tripRepository,
            RerouteProposalMapper rerouteProposalMapper,
            EmergencyNotificationPublisher notificationPublisher,
            CcadroProperties ccadroProperties,
            ReroutePolicyValidator reroutePolicyValidator) {
        this.rerouteProposalRepository = rerouteProposalRepository;
        this.tripRepository = tripRepository;
        this.rerouteProposalMapper = rerouteProposalMapper;
        this.notificationPublisher = notificationPublisher;
        this.ccadroProperties = ccadroProperties != null ? ccadroProperties : new CcadroProperties();
        this.reroutePolicyValidator = reroutePolicyValidator != null ? reroutePolicyValidator : new ReroutePolicyValidator();
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
        double plannedTotalMeters = tripRepository.findActiveRouteDistanceMeters(tripId)
                .orElse(28500.0);
        double actualWalked = tripRepository.findById(tripId)
                .map(Trip::getActualDistanceMeters)
                .map(BigDecimal::doubleValue)
                .orElse(0.0);

        double remaining = Math.max(2000.0, plannedTotalMeters - actualWalked);
        BigDecimal originalRemaining = BigDecimal.valueOf(remaining).setScale(2, RoundingMode.HALF_UP);
        double detourRatio = ccadroProperties.getReroute().getDetourSavingsEstimateRatio();
        BigDecimal proposedDetour = BigDecimal.valueOf(remaining * detourRatio).setScale(2, RoundingMode.HALF_UP);
        return evaluateDynamicReroute(tripId, triggerReason, originalRemaining, proposedDetour);
    }

    @Transactional
    public Optional<RerouteProposalResponse> evaluateDynamicReroute(
            UUID tripId, String triggerReason, BigDecimal originalRemainingMeters, BigDecimal proposedMeters) {
        long cooldownSeconds = ccadroProperties.getReroute().getCooldownSeconds();
        BigDecimal minimumBenefitRatio = BigDecimal.valueOf(ccadroProperties.getReroute().getMinimumBenefitRatio());

        Optional<RerouteProposal> lastProposal = rerouteProposalRepository
                .findFirstByTripIdOrderByCreatedAtDesc(tripId);
        if (reroutePolicyValidator.isWithinCooldownWindow(lastProposal, cooldownSeconds)) {
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
        BigDecimal savedMeters = originalRemainingMeters.subtract(proposedMeters);

        RerouteProposal proposal = new RerouteProposal();
        proposal.setTripId(tripId);
        proposal.setTriggerReason(triggerReason != null ? triggerReason : "DEVIATION_RED");
        proposal.setOriginalRemainingDistanceMeters(originalRemainingMeters);
        proposal.setProposedDistanceMeters(proposedMeters);
        proposal.setBenefitRatio(benefitRatio);
        proposal.setStatus("PENDING_DISPATCHER");
        proposal.setCreatedAt(Instant.now());
        proposal.setUpdatedAt(Instant.now());

        RerouteProposal saved = rerouteProposalRepository.save(proposal);

        notificationPublisher.publishDeviationEmergency(
                tripId,
                saved.getId(),
                "RED",
                savedMeters.doubleValue(),
                null,
                null
        );

        return Optional.of(rerouteProposalMapper.toResponse(saved));
    }

    @Transactional
    public RerouteProposalResponse decideRerouteProposal(UUID proposalId, RerouteApprovalRequest request) {
        RerouteProposal proposal = rerouteProposalRepository.findById(proposalId)
                .orElseThrow(() -> new AppException(ErrorCode.REROUTE_BENEFIT_INSUFFICIENT,
                        "Không tìm thấy đề xuất đổi tuyến: " + proposalId));

        String decision = reroutePolicyValidator.validateDispatcherDecision(request.getDecision());
        reroutePolicyValidator.requirePendingDispatcher(proposal);

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
            return;
        }
        Trip trip = tripOpt.get();

        try {
            RestClient routingClient = RestClient.builder().baseUrl(routingServiceUrl).build();
            ApiResponse<Map<String, Object>> resp = routingClient.post()
                    .uri("/api/v1/routing/versions/reroute")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "shipmentId", trip.getShipmentId(),
                            "distanceMeters", proposal.getProposedDistanceMeters(),
                            "reason", "REROUTE_" + (proposal.getTriggerReason() != null ? proposal.getTriggerReason() : "DYNAMIC")
                    ))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (resp != null && resp.getResult() != null && resp.getResult().get("id") != null) {
                UUID newVersionId = UUID.fromString(resp.getResult().get("id").toString());
                trip.setActiveRouteVersionId(newVersionId);
                trip.setUpdatedAt(Instant.now());
                tripRepository.save(trip);
                log.info("Đã kích hoạt RouteVersion {} cho Trip {} sau khi Dispatcher duyệt ACCEPTED",
                        newVersionId, trip.getId());
            }
        } catch (Exception ex) {
            log.warn("Không thể đồng bộ tạo RouteVersion mới tại routing-service cho Trip {}: {}",
                    trip.getId(), ex.getMessage());
        }
    }
}
