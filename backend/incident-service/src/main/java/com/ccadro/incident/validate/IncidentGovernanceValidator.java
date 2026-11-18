package com.ccadro.incident.validate;

import com.ccadro.incident.dto.request.ExceptionResolutionRequest;
import com.ccadro.incident.entity.FieldIncident;
import com.ccadro.incident.exception.AppException;
import com.ccadro.incident.exception.ErrorCode;
import com.ccadro.incident.repository.ExceptionResolutionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/**
 * Validator quy chuẩn xử lý ngoại lệ hiện trường (UC17) & chuẩn hóa thông số điểm phạt BRULE-18.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class IncidentGovernanceValidator {

    public static final Set<String> VALID_DECISIONS = Set.of(
            "APPROVED_TRIGGER_REROUTE",
            "APPROVED_EXCUSED",
            "REJECTED",
            "ESCALATE_TO_DEMERIT"
    );

    ExceptionResolutionRepository exceptionResolutionRepository;

    public void requireIncidentPendingReview(FieldIncident incident, UUID incidentId) {
        if (!"PENDING_REVIEW".equalsIgnoreCase(incident.getStatus())
                || exceptionResolutionRepository.findByIncidentId(incidentId).isPresent()) {
            throw new AppException(ErrorCode.RESOLUTION_ALREADY_CLOSED);
        }
    }

    public String parseAndValidateDecision(String rawDecision) {
        String decision = rawDecision != null ? rawDecision.trim().toUpperCase() : "";
        if (!VALID_DECISIONS.contains(decision)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Quyết định thẩm định không hợp lệ: " + decision);
        }
        return decision;
    }

    public int resolveDemeritPoints(ExceptionResolutionRequest request) {
        return request.getDemeritPoints() != null ? Math.max(0, request.getDemeritPoints()) : 5;
    }

    public String resolveViolationCategory(ExceptionResolutionRequest request) {
        return (request.getViolationCategory() != null && !request.getViolationCategory().isBlank())
                ? request.getViolationCategory().trim()
                : "ROUTE_DEVIATION_UNAUTHORIZED";
    }
}

