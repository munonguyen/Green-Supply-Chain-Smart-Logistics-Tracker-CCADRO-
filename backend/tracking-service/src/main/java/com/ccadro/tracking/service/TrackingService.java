package com.ccadro.tracking.service;

import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.dto.request.RerouteApprovalRequest;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import com.ccadro.tracking.entity.DeviationAlert;
import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.entity.TelemetryEvent;
import com.ccadro.tracking.entity.Trip;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Facade Service điều phối tổng thể phân hệ Giám sát hành trình & Đổi tuyến động (Tracking Module - UC07, 08, 09, 10).
 * Phân rã nghiệp vụ chi tiết vào 4 dịch vụ chuyên trách:
 * 1. TripService: Vòng đời chuyến xe (UC07, UC11)
 * 2. TelemetryIngestionService: GPS Quality Gate và cộng dồn khoảng cách thực tế (UC08)
 * 3. DeviationDetectionService: Phát hiện lệch hành lang 3 điểm liên tiếp (UC09)
 * 4. RerouteProposalService: Đề xuất đổi tuyến động và Dispatcher phê duyệt (UC10)
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TrackingService {

    TripService tripService;
    TelemetryIngestionService telemetryIngestionService;
    DeviationDetectionService deviationDetectionService;
    RerouteProposalService rerouteProposalService;

    // --- 1. Trip Lifecycle APIs (UC07, UC08) ---
    public List<Trip> getAllTrips() {
        return tripService.getAllTrips();
    }

    public Trip getTripById(UUID tripId) {
        return tripService.getTripById(tripId);
    }

    @Transactional
    public Trip startTrip(UUID tripId) {
        return tripService.startTrip(tripId);
    }

    @Transactional
    public Trip completeTrip(UUID tripId) {
        return tripService.completeTrip(tripId);
    }

    // --- 2. GPS Telemetry Ingestion (UC07, UC08) ---
    public List<TelemetryEvent> getTelemetryHistory(UUID tripId) {
        return telemetryIngestionService.getTelemetryHistory(tripId);
    }

    @Transactional
    public TelemetryEvent ingestTelemetry(IngestTelemetryRequest req) {
        return telemetryIngestionService.ingestTelemetry(req);
    }

    // --- 3. Deviation Detection & Alerting (UC09) ---
    public List<DeviationAlert> getAlerts(UUID tripId) {
        return deviationDetectionService.getAlerts(tripId);
    }

    public void evaluateDeviationStateMachine(UUID tripId, TelemetryEvent latestEvent, double yellowThreshold, double redThreshold) {
        deviationDetectionService.evaluateDeviationStateMachine(tripId, latestEvent, yellowThreshold, redThreshold);
    }

    // --- 4. Dynamic Rerouting & Approval (UC10) ---
    public List<RerouteProposal> getProposals(UUID tripId) {
        return rerouteProposalService.getProposals(tripId);
    }

    public List<RerouteProposalResponse> getProposalResponses(UUID tripId) {
        return rerouteProposalService.getProposalResponses(tripId);
    }

    @Transactional
    public Optional<RerouteProposalResponse> evaluateDynamicReroute(
            UUID tripId, String triggerReason, BigDecimal originalRemainingMeters, BigDecimal proposedMeters) {
        return rerouteProposalService.evaluateDynamicReroute(tripId, triggerReason, originalRemainingMeters, proposedMeters);
    }

    @Transactional
    public RerouteProposalResponse decideRerouteProposal(UUID proposalId, RerouteApprovalRequest request) {
        return rerouteProposalService.decideRerouteProposal(proposalId, request);
    }
}
