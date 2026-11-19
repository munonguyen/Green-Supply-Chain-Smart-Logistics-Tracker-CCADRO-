package com.ccadro.tracking.service;

import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.infrastructure.json.JacksonRouteWaypointDecoder;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        FleetTelemetryService service = new FleetTelemetryService(tripRepository, telemetryEventRepository, props,
                new JacksonRouteWaypointDecoder(new ObjectMapper()));

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

    @Test
    void evaluateArrivalAndGeoJsonParsing_shouldDetectDestinationGeofenceAndRouteWaypoints() {
        CcadroProperties props = new CcadroProperties();
        FleetTelemetryService service = new FleetTelemetryService(tripRepository, telemetryEventRepository, props,
                new JacksonRouteWaypointDecoder(new ObjectMapper()));

        double destLat = 10.9242;
        double destLon = 106.7145;
        double originLat = 10.7623;
        double originLon = 106.7824;

        // Inside 250m destination geofence
        var arrived = service.evaluateArrival("EN_ROUTE", 10.9245, 106.7148,
                originLat, originLon, destLat, destLon, 99, Instant.now(), null);
        assertTrue(arrived.arrived());
        assertEquals("ARRIVED_AT_DESTINATION", arrived.arrivalStatus());
        assertTrue(arrived.distanceToDestinationMeters() <= 250.0);

        // Within 2000m approaching zone (~1.2 km away)
        var approaching = service.evaluateArrival("EN_ROUTE", 10.9150, 106.7145,
                originLat, originLon, destLat, destLon, 92, null, null);
        assertFalse(approaching.arrived());
        assertEquals("APPROACHING_DESTINATION", approaching.arrivalStatus());
        assertTrue(approaching.distanceToDestinationMeters() > 250.0 && approaching.distanceToDestinationMeters() <= 2000.0);

        // En-route midway
        var transit = service.evaluateArrival("EN_ROUTE", 10.8400, 106.7500,
                originLat, originLon, destLat, destLon, 45, null, null);
        assertFalse(transit.arrived());
        assertEquals("IN_TRANSIT", transit.arrivalStatus());

        // Completed -> DELIVERED
        var delivered = service.evaluateArrival("COMPLETED", destLat, destLon,
                originLat, originLon, destLat, destLon, 100, Instant.now(), "DELIVERED");
        assertTrue(delivered.arrived());
        assertEquals("DELIVERED", delivered.arrivalStatus());


    }

    @Test
    void ingestTelemetry_shouldPersistArrivedStatusWhenInsideDestinationGeofence() {
        CcadroProperties props = new CcadroProperties();
        TelemetryIngestionService ingestionService = new TelemetryIngestionService(
                telemetryEventRepository,
                tripRepository,
                trackingMapper,
                props,
                deviationDetectionService,
                rerouteProposalService
        );

        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip();
        trip.setId(tripId);
        trip.setStatus("SCHEDULED");
        trip.setArrivalStatus("AT_ORIGIN");
        trip.setActualDistanceMeters(BigDecimal.ZERO);

        IngestTelemetryRequest req = new IngestTelemetryRequest();
        req.setTripId(tripId);
        req.setTimestamp(Instant.now());
        req.setLatitude(10.9243);
        req.setLongitude(106.7146);
        req.setSpeedKmh(BigDecimal.valueOf(35.0));

        TelemetryEvent entity = new TelemetryEvent();
        entity.setTripId(tripId);
        entity.setSpeedKmh(BigDecimal.valueOf(35.0));
        when(trackingMapper.toEntity(req)).thenReturn(entity);
        when(telemetryEventRepository.save(any())).thenReturn(entity);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripRepository.findDestinationCoordinatesByTripId(tripId))
                .thenReturn(List.<Object[]>of(new Object[] { 10.9242, 106.7145, 10.7623, 106.7824 }));

        ingestionService.ingestTelemetry(req);

        assertEquals("EN_ROUTE", trip.getStatus());
        assertEquals("ARRIVED_AT_DESTINATION", trip.getArrivalStatus());
        assertNotNull(trip.getArrivedAt());
        assertNotNull(trip.getDistanceToDestinationMeters());
        assertTrue(trip.getDistanceToDestinationMeters().doubleValue() <= 250.0);
        verify(tripRepository, atLeastOnce()).save(trip);
    }
}

