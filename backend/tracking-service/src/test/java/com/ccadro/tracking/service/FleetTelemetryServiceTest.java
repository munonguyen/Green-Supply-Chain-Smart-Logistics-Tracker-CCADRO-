package com.ccadro.tracking.service;

import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.dto.response.LiveFleetTelemetryResponse;
import com.ccadro.tracking.entity.TelemetryEvent;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.mapper.TrackingMapper;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FleetTelemetryServiceTest {

    @Mock
    TripRepository tripRepository;
    @Mock
    TelemetryEventRepository telemetryEventRepository;
    @Mock
    TrackingMapper trackingMapper;
    @Mock
    DeviationDetectionService deviationDetectionService;
    @Mock
    RerouteProposalService rerouteProposalService;

    @Test
    void getLiveFleetTelemetry_computesAccurateEtaDeviationAndCo2() {
        CcadroProperties props = new CcadroProperties();
        FleetTelemetryService service = new FleetTelemetryService(tripRepository, telemetryEventRepository, props);

        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip();
        trip.setId(tripId);
        trip.setTripCode("TRP-REAL-01");
        trip.setStatus("EN_ROUTE");
        trip.setActualDistanceMeters(new BigDecimal("14000.00"));
        trip.setIsDeleted(false);

        GeometryFactory gf = new GeometryFactory(new PrecisionModel(), 4326);
        TelemetryEvent event = new TelemetryEvent();
        event.setTripId(tripId);
        event.setTimestamp(Instant.now());
        event.setLocationGeom(gf.createPoint(new Coordinate(106.752, 10.835)));
        event.setSpeedKmh(new BigDecimal("60.0"));
        event.setHeadingDegrees(new BigDecimal("332.5"));
        event.setDistanceFromRouteMeters(new BigDecimal("215.0"));
        event.setQualityPassed(true);

        when(tripRepository.findLiveFleetTelemetryRows()).thenReturn(List.of());
        when(tripRepository.findActiveContainerTelemetryRows()).thenReturn(List.of());
        when(tripRepository.findAll()).thenReturn(List.of(trip));
        when(tripRepository.findActiveRouteDistanceMeters(tripId)).thenReturn(Optional.of(28000.0));
        when(telemetryEventRepository.findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(tripId))
                .thenReturn(Optional.of(event));

        List<LiveFleetTelemetryResponse> result = service.getLiveFleetTelemetry(null, null);

        assertEquals(1, result.size());
        LiveFleetTelemetryResponse snap = result.get(0);
        assertEquals("TRP-REAL-01", snap.getTripCode());
        assertEquals(28.0, snap.getTotalDistanceKm());
        assertEquals(14.0, snap.getTraveledDistanceKm());
        assertEquals(14.0, snap.getRemainingDistanceKm());
        assertEquals(50, snap.getProgressPercent());
        assertEquals(14, snap.getEtaMinutes());
        assertTrue(snap.getEtaMinutes() > 0);
        assertEquals("RED_DEVIATION", snap.getDeviationStatus());
        assertEquals("LIVE_TELEMETRY_DB", snap.getDataSource());
        assertTrue(snap.getCo2SavedKg() > 0.0);
    }

    @Test
    void ingestTelemetry_broadcastsSseUpdateWhenValid() {
        CcadroProperties props = new CcadroProperties();
        FleetTelemetryService fleetService = mock(FleetTelemetryService.class);
        FleetTelemetryStreamService streamService = mock(FleetTelemetryStreamService.class);

        TelemetryIngestionService ingestionService = new TelemetryIngestionService(
                telemetryEventRepository,
                tripRepository,
                trackingMapper,
                props,
                deviationDetectionService,
                rerouteProposalService,
                fleetService,
                streamService
        );

        UUID tripId = UUID.randomUUID();
        IngestTelemetryRequest req = new IngestTelemetryRequest();
        req.setTripId(tripId);
        req.setTimestamp(Instant.now());
        req.setLatitude(10.84);
        req.setLongitude(106.75);
        req.setSpeedKmh(BigDecimal.valueOf(55.0));

        TelemetryEvent entity = new TelemetryEvent();
        entity.setTripId(tripId);
        entity.setSpeedKmh(BigDecimal.valueOf(55.0));
        when(trackingMapper.toEntity(req)).thenReturn(entity);
        when(telemetryEventRepository.save(any())).thenReturn(entity);

        LiveFleetTelemetryResponse liveSnap = LiveFleetTelemetryResponse.builder()
                .tripId(tripId)
                .speedKmh(55.0)
                .etaMinutes(18)
                .build();
        when(fleetService.getLiveSnapshotForTrip(tripId)).thenReturn(Optional.of(liveSnap));

        ingestionService.ingestTelemetry(req);

        verify(streamService).broadcastUpdate(liveSnap);
    }
}

