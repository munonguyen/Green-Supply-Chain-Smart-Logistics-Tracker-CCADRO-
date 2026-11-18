package com.ccadro.tracking.validate;

import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Validator quy tắc đổi tuyến động (UC10 / BRULE-08, BRULE-09):
 * - Cửa sổ Cooldown 300s chống rung lắc lộ trình.
 * - Ngưỡng lợi ích tối thiểu >= 10%.
 * - Trạng thái phê duyệt Dispatcher (ACCEPTED / REJECTED).
 */
@Component
public class ReroutePolicyValidator {

    public boolean isWithinCooldownWindow(Optional<RerouteProposal> lastProposal, long cooldownSeconds) {
        if (lastProposal.isEmpty()) return false;
        long elapsedSeconds = Duration.between(lastProposal.get().getCreatedAt(), Instant.now()).getSeconds();
        return elapsedSeconds < cooldownSeconds;
    }

    public Optional<BigDecimal> calculateValidBenefitRatio(
            BigDecimal originalRemainingMeters,
            BigDecimal proposedMeters,
            BigDecimal minimumBenefitRatio) {
        if (originalRemainingMeters == null || originalRemainingMeters.compareTo(BigDecimal.ZERO) <= 0
                || proposedMeters == null) {
            return Optional.empty();
        }
        BigDecimal savedMeters = originalRemainingMeters.subtract(proposedMeters);
        BigDecimal benefitRatio = savedMeters.divide(originalRemainingMeters, 4, RoundingMode.HALF_UP);
        if (benefitRatio.compareTo(minimumBenefitRatio) < 0) {
            return Optional.empty();
        }
        return Optional.of(benefitRatio);
    }

    public String validateDispatcherDecision(String rawDecision) {
        String decision = rawDecision != null ? rawDecision.trim().toUpperCase() : "";
        if (!"ACCEPTED".equalsIgnoreCase(decision) && !"REJECTED".equalsIgnoreCase(decision)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Quyết định không hợp lệ: " + decision);
        }
        return decision;
    }

    public void requirePendingDispatcher(RerouteProposal proposal) {
        if (!"PENDING_DISPATCHER".equalsIgnoreCase(proposal.getStatus())) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Đề xuất đổi tuyến đã được xử lý trước đó với trạng thái: " + proposal.getStatus());
        }
    }
}

