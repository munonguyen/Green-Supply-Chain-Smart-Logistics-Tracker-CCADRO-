package com.ccadro.incident.service;

import com.ccadro.incident.configuration.CcadroProperties;
import com.ccadro.incident.dto.request.DemeritReviewRequest;
import com.ccadro.incident.dto.response.DriverDemeritSummaryResponse;
import com.ccadro.incident.entity.DemeritRecord;
import com.ccadro.incident.exception.AppException;
import com.ccadro.incident.exception.ErrorCode;
import com.ccadro.incident.repository.DemeritRecordRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Quản trị điểm phạt và kỷ luật tài xế (Demerit Governance Service - UC18 / BRULE-17, BRULE-18):
 * - Quản lý điểm phạt tích lũy.
 * - Cảnh báo ngưỡng 10 điểm (WARNING).
 * - Chuyển sang REVIEW_REQUIRED khi chạm ngưỡng 20 điểm (không tự ý sa thải hay phạt tự động).
 * - Phê duyệt quyết định kỷ luật có sự tham gia của con người (HR / Fleet Manager).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DemeritGovernanceService {

    DemeritRecordRepository demeritRecordRepository;
    CcadroProperties ccadroProperties;

    public List<DemeritRecord> getDemeritsByDriverId(UUID driverId) {
        return demeritRecordRepository.findByDriverId(driverId);
    }

    public DriverDemeritSummaryResponse getDriverDemeritSummary(UUID driverId) {
        List<DemeritRecord> records = demeritRecordRepository.findByDriverId(driverId);
        int activePoints = calculateActiveDemeritPoints(records);
        int warningThreshold = ccadroProperties.getDemerit().getWarningThreshold();
        int reviewThreshold = ccadroProperties.getDemerit().getReviewRequiredThreshold();

        boolean isBlacklisted = records.stream().anyMatch(r -> "BLACKLISTED".equalsIgnoreCase(r.getStatus()));
        boolean isSuspended = records.stream().anyMatch(r -> "SUSPENDED".equalsIgnoreCase(r.getStatus()));

        String governanceStatus;
        if (isBlacklisted) {
            governanceStatus = "BLACKLISTED";
        } else if (isSuspended) {
            governanceStatus = "SUSPENDED";
        } else if (activePoints >= reviewThreshold) {
            governanceStatus = "REVIEW_REQUIRED";
        } else if (activePoints >= warningThreshold) {
            governanceStatus = "WARNING";
        } else {
            governanceStatus = "GOOD_STANDING";
        }

        return DriverDemeritSummaryResponse.builder()
                .driverId(driverId)
                .totalActivePoints(activePoints)
                .warningThreshold(warningThreshold)
                .reviewRequiredThreshold(reviewThreshold)
                .governanceStatus(governanceStatus)
                .records(records)
                .build();
    }

    @Transactional
    public DemeritRecord reviewDemeritRecord(UUID demeritId, DemeritReviewRequest request) {
        DemeritRecord record = demeritRecordRepository.findById(demeritId)
                .orElseThrow(() -> new AppException(ErrorCode.DEMERIT_RECORD_NOT_FOUND));

        String decision = request.getAuditDecision().trim().toUpperCase();
        record.setReviewedBy(request.getReviewedBy());
        record.setAuditDecision(decision);
        record.setDecisionNotes(request.getDecisionNotes());
        record.setStatus(decision);

        return demeritRecordRepository.save(record);
    }

    @Transactional
    public DemeritRecord issueDemeritForDriver(UUID driverId, UUID incidentId, int points, String category, String notes) {
        List<DemeritRecord> existing = demeritRecordRepository.findByDriverId(driverId);
        int cumulativePoints = calculateActiveDemeritPoints(existing) + points;

        int warningThreshold = ccadroProperties.getDemerit().getWarningThreshold();
        int reviewThreshold = ccadroProperties.getDemerit().getReviewRequiredThreshold();

        // BRULE-18: Vượt ngưỡng điểm phạt chỉ chuyển sang REVIEW_REQUIRED, tuyệt đối không tự động BLACKLISTED
        String initialStatus = "RECORDED";
        if (cumulativePoints >= reviewThreshold) {
            initialStatus = "REVIEW_REQUIRED";
        } else if (cumulativePoints >= warningThreshold) {
            initialStatus = "WARNING";
        }

        DemeritRecord demerit = new DemeritRecord();
        demerit.setDriverId(driverId);
        demerit.setIncidentId(incidentId);
        demerit.setPoints(points);
        demerit.setViolationCategory(category);
        demerit.setStatus(initialStatus);
        demerit.setDecisionNotes(notes);
        demerit.setRecordedAt(Instant.now());

        return demeritRecordRepository.save(demerit);
    }

    public int calculateActiveDemeritPoints(List<DemeritRecord> records) {
        return records.stream()
                .filter(r -> !"DISMISSED".equalsIgnoreCase(r.getStatus()))
                .mapToInt(r -> r.getPoints() != null ? r.getPoints() : 0)
                .sum();
    }
}

