package com.ccadro.routing.validate;

import com.ccadro.routing.entity.RouteCandidate;
import com.ccadro.routing.entity.RouteDecision;
import com.ccadro.routing.exception.AppException;
import com.ccadro.routing.exception.ErrorCode;
import com.ccadro.routing.repository.RouteCandidateRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Validator chuẩn hóa & kiểm tra ứng viên tuyến đường Human-in-the-Loop (UC05 / BRULE-09).
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RouteDecisionValidator {

    RouteCandidateRepository routeCandidateRepository;

    public RouteCandidate requireSelectedCandidate(UUID candidateId) {
        return routeCandidateRepository.findById(candidateId)
                .orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND));
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

