package com.ccadro.routing.service;

import com.ccadro.routing.configuration.CcadroProperties;
import com.ccadro.routing.dto.ApiResponse;
import com.ccadro.routing.dto.ShipmentDto;
import com.ccadro.routing.dto.request.RerouteVersionRequest;
import com.ccadro.routing.entity.*;
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
        assertTrue(persisted.stream().anyMatch(RouteCandidate::isSelected));
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

        RouteVersion v2 = decisionService.createDynamicRerouteVersion(RerouteVersionRequest.builder()
                .shipmentId(shipmentId)
                .distanceMeters(BigDecimal.valueOf(25600))
                .reason("REROUTE_CONGESTION")
                .build());

        assertFalse(v1.isActive());
        assertTrue(v2.isActive());
        assertEquals(2, v2.getVersionNumber());
        assertEquals(BigDecimal.valueOf(25600), v2.getTotalDistanceMeters());
        assertEquals("REROUTE_CONGESTION", v2.getReason());
    }
}
