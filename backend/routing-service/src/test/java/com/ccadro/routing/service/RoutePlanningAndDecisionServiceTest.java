package com.ccadro.routing.service;

import com.ccadro.routing.configuration.CcadroProperties;
import com.ccadro.routing.dto.ApiResponse;
import com.ccadro.routing.dto.ShipmentDto;
import com.ccadro.routing.dto.request.RerouteVersionRequest;
import com.ccadro.routing.entity.*;
import com.ccadro.routing.exception.AppException;
import com.ccadro.routing.mapper.RouteDecisionMapper;
import com.ccadro.routing.mapper.RoutingMapper;
import com.ccadro.routing.repository.RouteCandidateRepository;
import com.ccadro.routing.repository.RouteDecisionRepository;
import com.ccadro.routing.repository.RouteVersionRepository;
import com.ccadro.routing.repository.httpclient.ShipmentClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoutePlanningAndDecisionServiceTest {

    @Mock
    RouteCandidateRepository routeCandidateRepository;
    @Mock
    RouteDecisionRepository routeDecisionRepository;
    @Mock
    RouteVersionRepository routeVersionRepository;
    @Mock
    ShipmentClient shipmentClient;
    @Mock
    ApplicationContext applicationContext;
    @Mock
    RoutingMapper routingMapper;
    @Mock
    RouteDecisionMapper routeDecisionMapper;
    @Mock
    TrafficProvider trafficProvider;
    @Mock
    WeatherProvider weatherProvider;

    @Test
    void calculateRoutesForShipment_shouldIncorporateTrafficWeatherAndMarkParetoWinner() {
        CcadroProperties props = new CcadroProperties();
        RoutePlanningService service = new RoutePlanningService(
                routeCandidateRepository,
                shipmentClient,
                props,
                applicationContext,
                routingMapper,
                trafficProvider,
                weatherProvider
        );

        UUID shipmentId = UUID.randomUUID();
        ShipmentDto shipment = new ShipmentDto();
        shipment.setId(shipmentId);
        shipment.setCargoWeightTons(BigDecimal.valueOf(10.0));
        shipment.setOriginLatitude(10.7769);
        shipment.setOriginLongitude(106.7009);
        shipment.setDestinationLatitude(10.9465);
        shipment.setDestinationLongitude(106.8920);
        when(shipmentClient.getShipmentById(shipmentId)).thenReturn(ApiResponse.success(shipment));

        RoutingProvider mockProvider = mock(RoutingProvider.class);
        when(mockProvider.getRoutes(any())).thenReturn(List.of(
                new RouteCandidateData("GreenEco", "mock", BigDecimal.valueOf(30000), BigDecimal.valueOf(2400),
                        BigDecimal.valueOf(8.0), BigDecimal.valueOf(20.0), null, null, List.of()),
                new RouteCandidateData("FastHighway", "mock", BigDecimal.valueOf(40000), BigDecimal.valueOf(1800),
                        BigDecimal.valueOf(12.0), BigDecimal.valueOf(30.0), null, null, List.of())
        ));
        when(applicationContext.getBean("mockRoutingProvider", RoutingProvider.class)).thenReturn(mockProvider);
        when(trafficProvider.getTrafficForLocation(any())).thenReturn(TrafficCondition.HEAVY);
        when(weatherProvider.getWeather(any())).thenReturn(WeatherCondition.RAINY);
        when(routingMapper.toEntity(any(RouteCandidateData.class))).thenAnswer(inv -> {
            RouteCandidateData d = inv.getArgument(0);
            RouteCandidate entity = new RouteCandidate();
            entity.setCandidateName(d.getCandidateName());
            entity.setProviderName(d.getProviderName());
            entity.setDistanceMeters(d.getDistanceMeters());
            entity.setDurationSeconds(d.getDurationSeconds());
            entity.setEstimatedFuelLiters(d.getEstimatedFuelLiters());
            entity.setEstimatedCo2Kg(d.getEstimatedCo2Kg());
            return entity;
        });
        when(routeCandidateRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<RouteCandidateData> result = service.calculateRoutesForShipment(shipmentId);

        assertEquals(2, result.size());
        verify(trafficProvider, times(1)).getTrafficForLocation(any());
        verify(weatherProvider, times(1)).getWeather(any());

        ArgumentCaptor<List<RouteCandidate>> savedCaptor = ArgumentCaptor.forClass(List.class);
        verify(routeCandidateRepository).saveAll(savedCaptor.capture());
        List<RouteCandidate> persisted = savedCaptor.getValue();
        assertEquals(2, persisted.size());
        // HEAVY traffic (1.60) * RAINY weather (1.12) = 1.792x on baseline 2400s -> 4300.80s
        assertTrue(persisted.get(0).getDurationSeconds().doubleValue() > 4000.0);
        assertEquals(0, new BigDecimal("0.3500").compareTo(persisted.get(0).getRiskScore()));
        assertTrue(persisted.stream().allMatch(c -> c.getCompositeScore() != null));
        assertTrue(persisted.stream().noneMatch(RouteCandidate::isSelected),
                "A scoring recommendation is not an approved route until a dispatcher selects it");
    }

    @Test
    void routeDecisionMustUseCandidateBelongingToSelectedShipment() {
        RouteCandidate candidate = new RouteCandidate();
        candidate.setId(UUID.randomUUID());
        candidate.setShipmentId(UUID.randomUUID());
        when(routeCandidateRepository.findById(candidate.getId())).thenReturn(java.util.Optional.of(candidate));

        RouteDecisionService decisionService = new RouteDecisionService(
                routeCandidateRepository,
                routeDecisionRepository,
                routeVersionRepository,
                routeDecisionMapper
        );

        AppException failure = assertThrows(AppException.class, () -> decisionService.selectRoute(
                com.ccadro.routing.dto.request.RouteDecisionRequest.builder()
                        .shipmentId(UUID.randomUUID())
                        .selectedCandidateId(candidate.getId())
                        .build()
        ));

        assertEquals("Phương án lộ trình không thuộc vận đơn đang được chọn", failure.getMessage());
        verify(routeDecisionRepository, never()).save(any());
        verify(routeVersionRepository, never()).save(any());
    }

    @Test
    void routeDecisionMustNotPromoteMockCandidateToOfficialRoute() {
        UUID shipmentId = UUID.randomUUID();
        RouteCandidate candidate = new RouteCandidate();
        candidate.setId(UUID.randomUUID());
        candidate.setShipmentId(shipmentId);
        candidate.setProviderName("MOCK");
        when(routeCandidateRepository.findById(candidate.getId())).thenReturn(java.util.Optional.of(candidate));

        RouteDecisionService decisionService = new RouteDecisionService(
                routeCandidateRepository,
                routeDecisionRepository,
                routeVersionRepository,
                routeDecisionMapper
        );

        AppException failure = assertThrows(AppException.class, () -> decisionService.selectRoute(
                com.ccadro.routing.dto.request.RouteDecisionRequest.builder()
                        .shipmentId(shipmentId)
                        .selectedCandidateId(candidate.getId())
                        .build()
        ));

        assertEquals("Không thể chốt lộ trình mô phỏng làm tuyến vận hành chính thức", failure.getMessage());
        verify(routeDecisionRepository, never()).save(any());
        verify(routeVersionRepository, never()).save(any());
    }

    @Test
    void roadCandidatesKeepProviderEtaAndUseRoadDistanceWithoutDoubleAdjustment() throws Exception {
        CcadroProperties props = new CcadroProperties();
        props.getRouting().setProvider("osrm");
        var service = new RoutePlanningService(routeCandidateRepository, shipmentClient, props,
            applicationContext, routingMapper, trafficProvider, weatherProvider);
        UUID shipmentId = UUID.randomUUID();
        ShipmentDto shipment = new ShipmentDto();
        shipment.setCargoWeightTons(BigDecimal.TEN);
        shipment.setOriginLatitude(10.8);
        shipment.setOriginLongitude(106.7);
        shipment.setDestinationLatitude(10.9);
        shipment.setDestinationLongitude(106.8);
        when(shipmentClient.getShipmentById(shipmentId)).thenReturn(ApiResponse.success(shipment));
        var provider = mock(RoutingProvider.class);
        when(applicationContext.containsBean("osrmRoutingProvider")).thenReturn(true);
        when(applicationContext.getBean("osrmRoutingProvider", RoutingProvider.class)).thenReturn(provider);
        when(provider.getRoutes(any())).thenReturn(List.of(
            new RouteCandidateData("Short", "OSRM", BigDecimal.valueOf(30000), BigDecimal.valueOf(2400), null, null, null, null, List.of()),
            new RouteCandidateData("Fast", "OSRM", BigDecimal.valueOf(40000), BigDecimal.valueOf(1800), null, null, null, null, List.of()),
            new RouteCandidateData("Dominated", "OSRM", BigDecimal.valueOf(45000), BigDecimal.valueOf(3000), null, null, null, null, List.of())));
        when(routingMapper.toEntity(any())).thenAnswer(inv -> {
            RouteCandidateData data = inv.getArgument(0);
            var entity = new RouteCandidate();
            entity.setCandidateName(data.getCandidateName());
            entity.setProviderName(data.getProviderName());
            entity.setDistanceMeters(data.getDistanceMeters());
            entity.setDurationSeconds(data.getDurationSeconds());
            return entity;
        });
        when(routeCandidateRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        var results = service.calculateRoutesForShipment(shipmentId, 5, 3, 2);
        verifyNoInteractions(trafficProvider, weatherProvider);
        var shortRoute = results.stream().filter(route -> route.getCandidateName().equals("Short")).findFirst().orElseThrow();
        assertEquals(0, shortRoute.getDurationSeconds().compareTo(BigDecimal.valueOf(2400)));
        assertEquals(0, shortRoute.getEstimatedCo2Kg().compareTo(BigDecimal.valueOf(24)));
        var metadata = new com.fasterxml.jackson.databind.ObjectMapper().readTree(shortRoute.getRoutingMetadataJson());
        assertEquals("NOT_AVAILABLE", metadata.path("trafficSource").asText());
        assertTrue(metadata.path("paretoOptimal").asBoolean());
        assertTrue(metadata.path("shortestCandidate").asBoolean());
        assertEquals(0.5, metadata.path("wCo2").asDouble());
        var dominated = results.stream().filter(route -> route.getCandidateName().equals("Dominated")).findFirst().orElseThrow();
        assertFalse(new com.fasterxml.jackson.databind.ObjectMapper().readTree(dominated.getRoutingMetadataJson()).path("paretoOptimal").asBoolean());
    }

    @Test
    void fuelModelCanPreferLongerRouteWithLessFuelAndRequiresConfiguredFactor() throws Exception {
        var props = new CcadroProperties();
        props.getRouting().setProvider("tomtom");
        props.getCarbon().setFuelKgCo2PerLiter(3.0); // Test factor, not a fleet default.
        var service = new RoutePlanningService(routeCandidateRepository, shipmentClient, props,
            applicationContext, routingMapper, trafficProvider, weatherProvider);
        UUID shipmentId = UUID.randomUUID();
        var shipment = new ShipmentDto();
        shipment.setCargoWeightTons(BigDecimal.TEN);
        shipment.setOriginLatitude(10.8); shipment.setOriginLongitude(106.7);
        shipment.setDestinationLatitude(10.9); shipment.setDestinationLongitude(106.8);
        when(shipmentClient.getShipmentById(shipmentId)).thenReturn(ApiResponse.success(shipment));
        var provider = mock(RoutingProvider.class);
        when(applicationContext.getBean("tomTomRoutingProvider", RoutingProvider.class)).thenReturn(provider);
        when(provider.getRoutes(any())).thenReturn(List.of(
            new RouteCandidateData("Short congested", "TOMTOM", new BigDecimal("30000"), new BigDecimal("3600"),
                new BigDecimal("14"), null, null, null, List.of()),
            new RouteCandidateData("Eco flowing", "TOMTOM", new BigDecimal("35000"), new BigDecimal("2400"),
                new BigDecimal("10"), null, null, null, List.of())));
        when(routingMapper.toEntity(any())).thenAnswer(inv -> {
            RouteCandidateData data = inv.getArgument(0);
            var entity = new RouteCandidate();
            entity.setCandidateName(data.getCandidateName()); entity.setProviderName(data.getProviderName());
            entity.setDistanceMeters(data.getDistanceMeters()); entity.setDurationSeconds(data.getDurationSeconds());
            return entity;
        });
        when(routeCandidateRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        var routes = service.calculateRoutesForShipment(shipmentId, 1, 0, 0);
        assertEquals("Eco flowing", routes.get(0).getCandidateName());
        assertEquals(new BigDecimal("30.00"), routes.get(0).getEstimatedCo2Kg());
        var metadata = new com.fasterxml.jackson.databind.ObjectMapper().readTree(routes.get(0).getRoutingMetadataJson());
        assertEquals("PROVIDER_FUEL_ESTIMATE", metadata.path("carbonModel").asText());
        assertTrue(metadata.path("lowestEstimatedCarbonCandidate").asBoolean());
        assertFalse(metadata.path("shortestCandidate").asBoolean());
        verifyNoInteractions(trafficProvider, weatherProvider);
        props.getCarbon().setFuelKgCo2PerLiter(0);
        assertThrows(AppException.class, () -> service.calculateRoutesForShipment(shipmentId));
    }

    @Test
    void initialPlanningCannotReplaceAnInTransitTripsPinnedRoute() {
        UUID shipmentId = UUID.randomUUID();
        var candidate = new RouteCandidate();
        candidate.setShipmentId(shipmentId);
        candidate.setProviderName("OSRM");
        candidate.setDistanceMeters(BigDecimal.valueOf(30000));
        candidate.setDurationSeconds(BigDecimal.valueOf(2400));
        candidate.setRouteGeometry(new org.locationtech.jts.geom.GeometryFactory().createLineString(
            new org.locationtech.jts.geom.Coordinate[] {
                new org.locationtech.jts.geom.Coordinate(106.7, 10.8), new org.locationtech.jts.geom.Coordinate(106.8, 10.9)}));
        UUID candidateId = UUID.randomUUID();
        when(routeCandidateRepository.findById(candidateId)).thenReturn(java.util.Optional.of(candidate));
        var shipment = new ShipmentDto(); shipment.setStatus("IN_TRANSIT");
        when(shipmentClient.getShipmentById(shipmentId)).thenReturn(ApiResponse.success(shipment));
        var validator = new com.ccadro.routing.validate.RouteDecisionValidator(routeCandidateRepository, shipmentClient);
        assertThrows(AppException.class, () -> validator.requireSelectedCandidate(candidateId, shipmentId));
        shipment.setStatus("PLANNED");
        assertSame(candidate, validator.requireSelectedCandidate(candidateId, shipmentId));
    }

    @Test
    void rerouteWithoutNewRoadGeometryMustNotDeactivateCurrentRoute() {
        var service = new RouteDecisionService(routeCandidateRepository, routeDecisionRepository,
            routeVersionRepository, routeDecisionMapper);
        assertThrows(AppException.class, () -> service.createDynamicRerouteVersion(RerouteVersionRequest.builder()
            .shipmentId(UUID.randomUUID()).distanceMeters(BigDecimal.valueOf(25000)).build()));
        verifyNoInteractions(routeVersionRepository);
    }

    @Test
    void createDynamicRerouteVersion_shouldDeactivatePreviousVersionsAndIncrementNumber() {
        RouteDecisionService decisionService = new RouteDecisionService(
                routeCandidateRepository,
                routeDecisionRepository,
                routeVersionRepository,
                routeDecisionMapper
        );

        UUID shipmentId = UUID.randomUUID();
        RouteVersion v1 = new RouteVersion();
        v1.setId(UUID.randomUUID());
        v1.setShipmentId(shipmentId);
        v1.setVersionNumber(1);
        v1.setTotalDistanceMeters(BigDecimal.valueOf(32000));
        v1.setActive(true);

        when(routeVersionRepository.findByShipmentIdOrderByVersionNumberDesc(shipmentId)).thenReturn(List.of(v1));
        when(routeVersionRepository.save(any(RouteVersion.class))).thenAnswer(inv -> {
            RouteVersion rv = inv.getArgument(0);
            if (rv.getId() == null) rv.setId(UUID.randomUUID());
            return rv;
        });
        UUID candidateId = UUID.randomUUID(), proposalId = UUID.randomUUID();
        var source = new RouteCandidate();
        source.setId(candidateId);
        source.setShipmentId(shipmentId);
        source.setProviderName("OSRM");
        source.setDistanceMeters(BigDecimal.valueOf(25600));
        source.setDurationSeconds(BigDecimal.valueOf(1800));
        source.setMetricsBreakdownJson("{\"trafficSource\":\"TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL\",\"guidance\":{\"instructions\":[{\"message\":\"Rẽ phải\"}]}}");
        source.setRouteGeometry(new org.locationtech.jts.geom.GeometryFactory().createLineString(
            new org.locationtech.jts.geom.Coordinate[]{new org.locationtech.jts.geom.Coordinate(106.7,10.7),
                new org.locationtech.jts.geom.Coordinate(106.8,10.8)}));
        when(routeCandidateRepository.findById(candidateId)).thenReturn(java.util.Optional.of(source));

        RouteVersion v2 = decisionService.createDynamicRerouteVersion(RerouteVersionRequest.builder()
                .shipmentId(shipmentId)
                .selectedCandidateId(candidateId).proposalId(proposalId)
                .distanceMeters(BigDecimal.ONE)
                .durationSeconds(BigDecimal.ONE)
                .routeGeoJson("not trusted client geometry")
                .reason("REROUTE_CONGESTION")
                .build());

        assertFalse(v1.isActive());
        assertTrue(v2.isActive());
        assertEquals(2, v2.getVersionNumber());
        assertEquals(BigDecimal.valueOf(25600), v2.getTotalDistanceMeters());
        assertSame(source.getRouteGeometry(), v2.getRouteGeometry());
        assertEquals(BigDecimal.valueOf(1800), v2.getTotalDurationSeconds());
        assertEquals("REROUTE_PROPOSAL_" + proposalId, v2.getReason());
        assertEquals(source.getMetricsBreakdownJson(), v2.getRoutingMetadataJson());
    }

    @Test
    void selectRoute_preservesRoutingMetadataJsonOnCreatedRouteVersion() {
        RouteDecisionService decisionService = new RouteDecisionService(
                routeCandidateRepository,
                routeDecisionRepository,
                routeVersionRepository,
                routeDecisionMapper
        );
        UUID shipmentId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        RouteCandidate selected = new RouteCandidate();
        selected.setId(candidateId);
        selected.setShipmentId(shipmentId);
        selected.setProviderName("TOMTOM");
        selected.setDistanceMeters(BigDecimal.valueOf(28500));
        selected.setDurationSeconds(BigDecimal.valueOf(2100));
        selected.setMetricsBreakdownJson("{\"trafficSource\":\"TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL\",\"shortestCandidate\":true}");
        selected.setRouteGeometry(new org.locationtech.jts.geom.GeometryFactory().createLineString(
                new org.locationtech.jts.geom.Coordinate[]{
                        new org.locationtech.jts.geom.Coordinate(106.7, 10.8),
                        new org.locationtech.jts.geom.Coordinate(106.8, 10.9)}));

        when(routeCandidateRepository.findById(candidateId)).thenReturn(java.util.Optional.of(selected));
        when(routeCandidateRepository.findByShipmentId(shipmentId)).thenReturn(List.of(selected));
        when(routeDecisionMapper.toEntity(any())).thenReturn(new RouteDecision());
        when(routeDecisionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(routeVersionRepository.findByShipmentIdOrderByVersionNumberDesc(shipmentId)).thenReturn(List.of());
        when(routeDecisionMapper.toResponse(any())).thenReturn(new com.ccadro.routing.dto.response.RouteDecisionResponse());

        decisionService.selectRoute(com.ccadro.routing.dto.request.RouteDecisionRequest.builder()
                .shipmentId(shipmentId)
                .selectedCandidateId(candidateId)
                .build());

        ArgumentCaptor<RouteVersion> versionCaptor = ArgumentCaptor.forClass(RouteVersion.class);
        verify(routeVersionRepository).save(versionCaptor.capture());
        assertEquals(selected.getMetricsBreakdownJson(), versionCaptor.getValue().getRoutingMetadataJson());
    }

    @Test
    void retriedRerouteApprovalUsesThePreviouslyActivatedVersion() {
        var service = new RouteDecisionService(routeCandidateRepository, routeDecisionRepository, routeVersionRepository, routeDecisionMapper);
        UUID shipmentId = UUID.randomUUID(), proposalId = UUID.randomUUID();
        var version = new RouteVersion(); version.setActive(true);
        when(routeVersionRepository.findByShipmentIdAndReason(shipmentId, "REROUTE_PROPOSAL_" + proposalId))
            .thenReturn(java.util.Optional.of(version));
        assertSame(version, service.createDynamicRerouteVersion(RerouteVersionRequest.builder().shipmentId(shipmentId)
            .selectedCandidateId(UUID.randomUUID()).proposalId(proposalId).build()));
        verify(routeVersionRepository, never()).save(any());
        verifyNoInteractions(routeCandidateRepository);
    }
}
