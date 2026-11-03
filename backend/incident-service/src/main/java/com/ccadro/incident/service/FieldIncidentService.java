package com.ccadro.incident.service;

import com.ccadro.incident.client.EmergencyNotificationPublisher;
import com.ccadro.incident.dto.request.DemeritReviewRequest;
import com.ccadro.incident.dto.request.ExceptionResolutionRequest;
import com.ccadro.incident.dto.request.FieldIncidentCreateRequest;
import com.ccadro.incident.dto.response.DriverDemeritSummaryResponse;
import com.ccadro.incident.dto.response.FieldIncidentResponse;
import com.ccadro.incident.entity.DemeritRecord;
import com.ccadro.incident.entity.ExceptionResolution;
import com.ccadro.incident.entity.FieldIncident;
import com.ccadro.incident.exception.AppException;
import com.ccadro.incident.exception.ErrorCode;
import com.ccadro.incident.mapper.FieldIncidentMapper;
import com.ccadro.incident.repository.FieldIncidentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Facade & Domain Service quản lý sự cố hiện trường (Field Incident Service - UC16, UC17, UC18):
 * - Báo cáo sự cố hiện trường từ xe chở hàng kèm bằng chứng (UC16).
 * - Phát thông báo khẩn cấp qua Apache Kafka -> notification-service (:8087).
 * - Ủy quyền thẩm định ngoại lệ sang ExceptionResolutionService (UC17).
 * - Ủy quyền quản trị điểm phạt sang DemeritGovernanceService (UC18).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FieldIncidentService {

    FieldIncidentRepository fieldIncidentRepository;
    FieldIncidentMapper fieldIncidentMapper;
    EmergencyNotificationPublisher notificationPublisher;
    ExceptionResolutionService exceptionResolutionService;
    DemeritGovernanceService demeritGovernanceService;

    public List<FieldIncidentResponse> getAllIncidents() {
        return fieldIncidentMapper.toResponseList(fieldIncidentRepository.findAll());
    }

    public FieldIncidentResponse getIncidentById(UUID id) {
        return fieldIncidentMapper.toResponse(findIncidentOrThrow(id));
    }

    public List<FieldIncidentResponse> getIncidentsByTripId(UUID tripId) {
        return fieldIncidentMapper.toResponseList(fieldIncidentRepository.findByTripId(tripId));
    }

    /**
     * UC16 & BRULE-17: Tài xế báo cáo sự cố hiện trường kèm tọa độ GPS và bằng chứng.
     * Quy tắc bất biến BRULE-17: Báo cáo sự cố tuyệt đối KHÔNG tự động chuyển thành điểm phạt nhân sự.
     */
    @Transactional
    public FieldIncidentResponse createIncident(FieldIncidentCreateRequest request) {
        FieldIncident incident = fieldIncidentMapper.toEntity(request);

        String code = request.getIncidentCode();
        if (code == null || code.isBlank()) {
            code = "INC-" + System.currentTimeMillis();
        } else if (fieldIncidentRepository.findByIncidentCode(code).isPresent()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã sự cố đã tồn tại: " + code);
        }
        incident.setIncidentCode(code);

        if (incident.getSeverity() == null || incident.getSeverity().isBlank()) {
            incident.setSeverity("MODERATE");
        }
        if (incident.getEvidenceUrls() == null || incident.getEvidenceUrls().isBlank()) {
            incident.setEvidenceUrls("[]");
        }

        FieldIncident saved = fieldIncidentRepository.save(incident);

        // Phát thông báo sự cố khẩn cấp qua Kafka -> notification-service (:8087)
        String notifSeverity = "CRITICAL".equalsIgnoreCase(saved.getSeverity()) ? "CRITICAL" : "HIGH";
        notificationPublisher.publishEmergencyEvent(
                "INCIDENT_CRITICAL",
                notifSeverity,
                "DISPATCHER",
                saved.getTripId(),
                saved.getId(),
                "[SỰ CỐ HIỆN TRƯỜNG UC16] " + saved.getIncidentType() + " (" + saved.getIncidentCode() + ")",
                saved.getDescription(),
                saved.getLatitude(),
                saved.getLongitude(),
                "{\"incidentCode\":\"" + saved.getIncidentCode() + "\",\"incidentType\":\"" + saved.getIncidentType() + "\"}"
        );

        return fieldIncidentMapper.toResponse(saved);
    }

    // --- Delegation sang ExceptionResolutionService (UC17) ---
    @Transactional
    public ExceptionResolution resolveIncident(UUID incidentId, ExceptionResolutionRequest request) {
        return exceptionResolutionService.resolveIncident(incidentId, request);
    }

    public List<ExceptionResolution> getResolutionsByIncidentId(UUID incidentId) {
        return exceptionResolutionService.getResolutionsByIncidentId(incidentId);
    }

    // --- Delegation sang DemeritGovernanceService (UC18) ---
    public List<DemeritRecord> getDemeritsByDriverId(UUID driverId) {
        return demeritGovernanceService.getDemeritsByDriverId(driverId);
    }

    public DriverDemeritSummaryResponse getDriverDemeritSummary(UUID driverId) {
        return demeritGovernanceService.getDriverDemeritSummary(driverId);
    }

    @Transactional
    public DemeritRecord reviewDemeritRecord(UUID demeritId, DemeritReviewRequest request) {
        return demeritGovernanceService.reviewDemeritRecord(demeritId, request);
    }

    private FieldIncident findIncidentOrThrow(UUID id) {
        return fieldIncidentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.FIELD_INCIDENT_NOT_FOUND));
    }
}
