package com.ccadro.tracking.service;

import com.ccadro.tracking.client.EmergencyNotificationPublisher;
import com.ccadro.tracking.dto.request.RerouteApprovalRequest;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.exception.ErrorCode;
import com.ccadro.tracking.mapper.RerouteProposalMapper;
import com.ccadro.tracking.repository.RerouteProposalRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản lý đề xuất và phê duyệt đổi tuyến động Human-in-the-Loop (Reroute Proposal Service - UC10 / BRULE-08, BRULE-09):
 * - Cooldown Window 300s chống rung lắc lộ trình.
 * - Minimum Benefit Threshold >= 10% (0.1000).
 * - Dispatcher phê duyệt ACCEPTED / REJECTED trước khi tuyến có hiệu lực.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RerouteProposalService {

    private static final long REROUTE_COOLDOWN_SECONDS = 300L;
    private static final BigDecimal MINIMUM_BENEFIT_RATIO = new BigDecimal("0.1000");

    RerouteProposalRepository rerouteProposalRepository;
    RerouteProposalMapper rerouteProposalMapper;
    EmergencyNotificationPublisher notificationPublisher;

    public List<RerouteProposal> getProposals(UUID tripId) {
        return rerouteProposalRepository.findByTripId(tripId);
    }

    public List<RerouteProposalResponse> getProposalResponses(UUID tripId) {
        return rerouteProposalMapper.toResponseList(rerouteProposalRepository.findByTripId(tripId));
    }

    @Transactional
    public Optional<RerouteProposalResponse> evaluateDynamicReroute(
            UUID tripId, String triggerReason, BigDecimal originalRemainingMeters, BigDecimal proposedMeters) {
        Optional<RerouteProposal> lastProposal = rerouteProposalRepository
                .findFirstByTripIdOrderByCreatedAtDesc(tripId);
        if (lastProposal.isPresent()) {
            long elapsedSeconds = Duration.between(lastProposal.get().getCreatedAt(), Instant.now()).getSeconds();
            if (elapsedSeconds < REROUTE_COOLDOWN_SECONDS) {
                log.info("Bỏ qua đề xuất Reroute cho Trip {}: đang trong thời gian Cooldown 300s (đã qua {}s)",
                        tripId, elapsedSeconds);
                return Optional.empty();
            }
        }

        if (originalRemainingMeters == null || originalRemainingMeters.compareTo(BigDecimal.ZERO) <= 0
                || proposedMeters == null) {
            return Optional.empty();
        }

        BigDecimal savedMeters = originalRemainingMeters.subtract(proposedMeters);
        BigDecimal benefitRatio = savedMeters.divide(originalRemainingMeters, 4, RoundingMode.HALF_UP);

        if (benefitRatio.compareTo(MINIMUM_BENEFIT_RATIO) < 0) {
            log.info("Đề xuất Reroute cho Trip {} không đạt ngưỡng tối thiểu 10% (benefitRatio = {})",
                    tripId, benefitRatio);
            return Optional.empty();
        }

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

        // Bắn thông báo khẩn cấp tới Dispatcher
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

        String decision = request.getDecision().trim().toUpperCase();
        if (!"ACCEPTED".equalsIgnoreCase(decision) && !"REJECTED".equalsIgnoreCase(decision)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Quyết định không hợp lệ: " + decision);
        }

        proposal.setStatus(decision);
        proposal.setUpdatedAt(Instant.now());

        return rerouteProposalMapper.toResponse(rerouteProposalRepository.save(proposal));
    }
}
