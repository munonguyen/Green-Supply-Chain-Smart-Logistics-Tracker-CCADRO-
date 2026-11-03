package com.ccadro.tracking.service;

import com.ccadro.tracking.client.EmergencyNotificationPublisher;
import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.entity.DeviationAlert;
import com.ccadro.tracking.entity.TelemetryEvent;
import com.ccadro.tracking.repository.DeviationAlertRepository;
import com.ccadro.tracking.repository.TelemetryEventRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Phát hiện và cảnh báo lệch hành lang đệm (Deviation Detection Service - UC09 / BRULE-10):
 * - Bộ lọc duy trì (Persistence counter) yêu cầu N điểm liên tiếp (mặc định 3 điểm).
 * - Phân cấp cảnh báo: Vàng (50m) và Đỏ (200m).
 * - Tự động kích hoạt Reroute Proposal khi báo động ĐỎ.
 * - Tự đóng cảnh báo (RESOLVED) khi xe quay trở lại hành lang an toàn (<= 50m).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DeviationDetectionService {

    DeviationAlertRepository deviationAlertRepository;
    TelemetryEventRepository telemetryEventRepository;
    CcadroProperties ccadroProperties;
    EmergencyNotificationPublisher notificationPublisher;

    @Lazy
    RerouteProposalService rerouteProposalService;

    public List<DeviationAlert> getAlerts(UUID tripId) {
        return deviationAlertRepository.findByTripId(tripId);
    }

    @Transactional
    public void evaluateDeviationStateMachine(
            UUID tripId, TelemetryEvent latestEvent, double yellowThreshold, double redThreshold) {
        int requiredPoints = ccadroProperties.getDeviation().getConsecutivePointsRequired();
        List<TelemetryEvent> recentPoints = telemetryEventRepository
                .findTop3ByTripIdAndQualityPassedTrueOrderByTimestampDesc(tripId);
        if (recentPoints.size() < requiredPoints) {
            return;
        }

        boolean allAboveRed = recentPoints.stream()
                .allMatch(p -> p.getDistanceFromRouteMeters() != null
                        && p.getDistanceFromRouteMeters().doubleValue() > redThreshold);
        boolean allAboveYellow = recentPoints.stream()
                .allMatch(p -> p.getDistanceFromRouteMeters() != null
                        && p.getDistanceFromRouteMeters().doubleValue() > yellowThreshold);
        boolean allBackToSafe = recentPoints.stream()
                .allMatch(p -> p.getDistanceFromRouteMeters() != null
                        && p.getDistanceFromRouteMeters().doubleValue() <= yellowThreshold);

        if (allAboveRed) {
            triggerOrUpdateAlert(tripId, latestEvent, "RED");
            rerouteProposalService.evaluateDynamicReroute(tripId, "DEVIATION_RED",
                    BigDecimal.valueOf(18500.0), BigDecimal.valueOf(15200.0));
            return;
        }

        if (allAboveYellow) {
            triggerOrUpdateAlert(tripId, latestEvent, "YELLOW");
            return;
        }

        if (allBackToSafe) {
            resolveOpenAlerts(tripId);
        }
    }

    @Transactional
    public void triggerOrUpdateAlert(UUID tripId, TelemetryEvent event, String severity) {
        List<DeviationAlert> openAlerts = deviationAlertRepository.findByTripIdAndStatus(tripId, "OPEN");

        if (!openAlerts.isEmpty()) {
            DeviationAlert alert = openAlerts.get(0);
            alert.setSeverity(severity);
            alert.setDeviationDistanceMeters(event.getDistanceFromRouteMeters());
            alert.setLocationGeom(event.getLocationGeom());
            deviationAlertRepository.save(alert);
        } else {
            DeviationAlert newAlert = new DeviationAlert();
            newAlert.setTripId(tripId);
            newAlert.setSeverity(severity);
            newAlert.setDeviationDistanceMeters(event.getDistanceFromRouteMeters());
            newAlert.setLocationGeom(event.getLocationGeom());
            newAlert.setStatus("OPEN");
            newAlert.setDetectedAt(Instant.now());
            DeviationAlert savedAlert = deviationAlertRepository.save(newAlert);

            // Bắn Kafka thông báo khẩn cấp sang notification-service (:8087)
            double distance = event.getDistanceFromRouteMeters() != null
                    ? event.getDistanceFromRouteMeters().doubleValue()
                    : 0.0;
            notificationPublisher.publishDeviationEmergency(
                    tripId,
                    savedAlert.getId(),
                    severity,
                    distance,
                    event.getLatitude(),
                    event.getLongitude()
            );
        }
    }

    @Transactional
    public void resolveOpenAlerts(UUID tripId) {
        List<DeviationAlert> openAlerts = deviationAlertRepository.findByTripIdAndStatus(tripId, "OPEN");
        for (DeviationAlert alert : openAlerts) {
            alert.setStatus("RESOLVED");
            alert.setResolvedAt(Instant.now());
        }
        deviationAlertRepository.saveAll(openAlerts);
    }
}
