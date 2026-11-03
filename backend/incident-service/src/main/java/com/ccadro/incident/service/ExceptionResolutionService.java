package com.ccadro.incident.service;

import com.ccadro.incident.dto.request.ExceptionResolutionRequest;
import com.ccadro.incident.entity.ExceptionResolution;
import com.ccadro.incident.entity.FieldIncident;
import com.ccadro.incident.exception.AppException;
import com.ccadro.incident.exception.ErrorCode;
import com.ccadro.incident.mapper.FieldIncidentMapper;
import com.ccadro.incident.repository.ExceptionResolutionRepository;
import com.ccadro.incident.repository.FieldIncidentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Thẩm định và phân giải ngoại lệ hiện trường (Exception Resolution Service - UC17 / BRULE-17):
 * - Dispatcher/Supervisor phân loại nguyên nhân khách quan hay chủ quan.
 * - APPROVED_TRIGGER_REROUTE: Sự cố khách quan -> Duyệt đổi tuyến, không phạt.
 * - APPROVED_EXCUSED: Miễn trừ bất khả kháng -> Đóng hồ sơ, không phạt.
 * - ESCALATE_TO_DEMERIT: Lỗi chủ quan -> Chuyển sang DemeritGovernanceService.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ExceptionResolutionService {

    FieldIncidentRepository fieldIncidentRepository;
    ExceptionResolutionRepository exceptionResolutionRepository;
    DemeritGovernanceService demeritGovernanceService;
    FieldIncidentMapper fieldIncidentMapper;

    @Transactional
    public ExceptionResolution resolveIncident(UUID incidentId, ExceptionResolutionRequest request) {
        FieldIncident incident = fieldIncidentRepository.findById(incidentId)
                .orElseThrow(() -> new AppException(ErrorCode.FIELD_INCIDENT_NOT_FOUND));

        if (!"PENDING_REVIEW".equalsIgnoreCase(incident.getStatus())
                || exceptionResolutionRepository.findByIncidentId(incidentId).isPresent()) {
            throw new AppException(ErrorCode.RESOLUTION_ALREADY_CLOSED);
        }

        String decision = request.getDecision().trim().toUpperCase();
        switch (decision) {
            case "APPROVED_TRIGGER_REROUTE" -> incident.setStatus("APPROVED");
            case "APPROVED_EXCUSED" -> incident.setStatus("RESOLVED");
            case "REJECTED" -> incident.setStatus("REJECTED");
            case "ESCALATE_TO_DEMERIT" -> {
                incident.setStatus("RESOLVED");
                int points = request.getDemeritPoints() != null ? request.getDemeritPoints() : 5;
                String category = (request.getViolationCategory() != null && !request.getViolationCategory().isBlank())
                        ? request.getViolationCategory()
                        : "ROUTE_DEVIATION_UNAUTHORIZED";
                demeritGovernanceService.issueDemeritForDriver(incident.getDriverId(), incident.getId(), points, category, request.getReviewNotes());
            }
            default -> throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Quyết định thẩm định không hợp lệ: " + decision);
        }

        ExceptionResolution resolution = fieldIncidentMapper.toResolutionEntity(incidentId, request);
        resolution.setDecision(decision);
        return exceptionResolutionRepository.save(resolution);
    }

    public List<ExceptionResolution> getResolutionsByIncidentId(UUID incidentId) {
        return exceptionResolutionRepository.findByIncidentId(incidentId).stream().toList();
    }
}

