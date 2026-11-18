package com.ccadro.tracking.service;

import com.ccadro.tracking.client.EmergencyNotificationPublisher;
import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import com.ccadro.tracking.entity.DeviationAlert;
import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.entity.TelemetryEvent;
import com.ccadro.tracking.mapper.RerouteProposalMapper;
import com.ccadro.tracking.mapper.TrackingMapper;
import com.ccadro.tracking.repository.DeviationAlertRepository;
import com.ccadro.tracking.repository.RerouteProposalRepository;
import com.ccadro.tracking.repository.TelemetryEventRepository;
import com.ccadro.tracking.repository.TripRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TelemetryAndRerouteServiceTest {

    @Mock
    TelemetryEventRepository telemetryEventRepository;
    @Mock
    TripRepository tripRepository;
    @Mock
    DeviationAlertRepository deviationAlertRepository;
    @Mock
    RerouteProposalRepository rerouteProposalRepository;
    @Mock
    TrackingMapper trackingMapper;
    @Mock
    RerouteProposalMapper rerouteProposalMapper;
    @Mock
    EmergencyNotificationPublisher notificationPublisher;

    @Test
    void ingestTelemetry_shouldFilterExcessiveSpeedAndComputePostGisDeviation() {
        CcadroProperties props = new CcadroProperties();
        DeviationDetectionService deviationService = mock(DeviationDetectionService.class);
        RerouteProposalService rerouteService = mock(RerouteProposalService.class);

        TelemetryIngestionService ingestionService = new TelemetryIngestionService(
                telemetryEventRepository,
                tripRepository,
                trackingMapper,
                props,
                deviationService,
                rerouteService
        );

        UUID tripId = UUID.randomUUID();
        IngestTelemetryRequest fastSpike = new IngestTelemetryRequest();
        fastSpike.setTripId(tripId);
        fastSpike.setTimestamp(Instant.now());
        fastSpike.setLatitude(10.8);
        fastSpike.setLongitude(106.7);
        fastSpike.setSpeedKmh(BigDecimal.valueOf(185.0));

        GeometryFactory gf = new GeometryFactory(new PrecisionModel(), 4326);
        when(trackingMapper.toEntity(any(IngestTelemetryRequest.class))).thenAnswer(inv -> {
            IngestTelemetryRequest req = inv.getArgument(0);
            TelemetryEvent e = new TelemetryEvent();
            e.setTripId(req.getTripId());
            if (req.getLongitude() != null && req.getLatitude() != null) {
                e.setLocationGeom(gf.createPoint(new Coordinate(req.getLongitude(), req.getLatitude())));
            }
            e.setSpeedKmh(req.getSpeedKmh());
            return e;
        });
        when(telemetryEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TelemetryEvent spikeResult = ingestionService.ingestTelemetry(fastSpike);
        assertFalse(spikeResult.getQualityPassed());
        verifyNoInteractions(deviationService);

        IngestTelemetryRequest offRoutePoint = new IngestTelemetryRequest();
        offRoutePoint.setTripId(tripId);
        offRoutePoint.setTimestamp(Instant.now());
        offRoutePoint.setLatitude(10.82);
        offRoutePoint.setLongitude(106.75);
        offRoutePoint.setSpeedKmh(BigDecimal.valueOf(55.0));

        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());
        when(tripRepository.findDistanceToActiveRouteMeters(tripId, 10.82, 106.75))
                .thenReturn(Optional.of(245.5));

        TelemetryEvent validOffRoute = ingestionService.ingestTelemetry(offRoutePoint);
        assertTrue(validOffRoute.getQualityPassed());
        assertEquals(new BigDecimal("245.50"), validOffRoute.getDistanceFromRouteMeters());
        verify(deviationService).evaluateDeviationStateMachine(eq(tripId), eq(validOffRoute), eq(50.0), eq(200.0));
    }

    @Test
    void evaluateDeviationAndReroute_shouldTriggerRedAlertAndEnforceBenefitAndCooldownRules() {
        CcadroProperties props = new CcadroProperties();
        RerouteProposalService rerouteService = new RerouteProposalService(
                rerouteProposalRepository,
                tripRepository,
                rerouteProposalMapper,
                notificationPublisher
        );
        DeviationDetectionService deviationService = new DeviationDetectionService(
                deviationAlertRepository,
                telemetryEventRepository,
                props,
                notificationPublisher,
                rerouteService
        );

        GeometryFactory gf = new GeometryFactory(new PrecisionModel(), 4326);
        UUID tripId = UUID.randomUUID();
        TelemetryEvent p1 = new TelemetryEvent();
        p1.setDistanceFromRouteMeters(BigDecimal.valueOf(220));
        TelemetryEvent p2 = new TelemetryEvent();
        p2.setDistanceFromRouteMeters(BigDecimal.valueOf(230));
        TelemetryEvent p3 = new TelemetryEvent();
        p3.setDistanceFromRouteMeters(BigDecimal.valueOf(260));
        p3.setLocationGeom(gf.createPoint(new Coordinate(106.75, 10.82)));

        when(telemetryEventRepository.findTop3ByTripIdAndQualityPassedTrueOrderByTimestampDesc(tripId))
                .thenReturn(List.of(p3, p2, p1));
        when(deviationAlertRepository.findByTripIdAndStatus(tripId, "OPEN")).thenReturn(List.of());
        when(deviationAlertRepository.save(any(DeviationAlert.class))).thenAnswer(inv -> {
            DeviationAlert a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });
        when(rerouteProposalRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId)).thenReturn(Optional.empty());
        when(tripRepository.findActiveRouteDistanceMeters(tripId)).thenReturn(Optional.of(30000.0));
        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());
        when(rerouteProposalRepository.save(any(RerouteProposal.class))).thenAnswer(inv -> {
            RerouteProposal rp = inv.getArgument(0);
            rp.setId(UUID.randomUUID());
            return rp;
        });
        when(rerouteProposalMapper.toResponse(any(RerouteProposal.class))).thenAnswer(inv -> {
            RerouteProposal rp = inv.getArgument(0);
            RerouteProposalResponse resp = new RerouteProposalResponse();
            resp.setId(rp.getId());
            resp.setStatus(rp.getStatus());
            resp.setBenefitRatio(rp.getBenefitRatio());
            return resp;
        });

        deviationService.evaluateDeviationStateMachine(tripId, p3, 50.0, 200.0);

        verify(deviationAlertRepository).save(argThat(a -> "RED".equals(a.getSeverity())));
        verify(rerouteProposalRepository).save(argThat(p ->
                "PENDING_DISPATCHER".equals(p.getStatus())
                        && p.getBenefitRatio().compareTo(new BigDecimal("0.1000")) >= 0));

        // 2. Benefit < 10% must be rejected without persisting a proposal
        Optional<RerouteProposalResponse> lowBenefit = rerouteService.evaluateDynamicReroute(
                tripId, "MINOR_TRAFFIC", BigDecimal.valueOf(10000), BigDecimal.valueOf(9500));
        assertTrue(lowBenefit.isEmpty());

        // 3. Recent proposal inside 300s cooldown window must be skipped
        RerouteProposal recent = new RerouteProposal();
        recent.setCreatedAt(Instant.now().minusSeconds(60));
        when(rerouteProposalRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId))
                .thenReturn(Optional.of(recent));

        Optional<RerouteProposalResponse> insideCooldown = rerouteService.evaluateDynamicReroute(
                tripId, "DEVIATION_RED", BigDecimal.valueOf(10000), BigDecimal.valueOf(7000));
        assertTrue(insideCooldown.isEmpty());
    }
}
