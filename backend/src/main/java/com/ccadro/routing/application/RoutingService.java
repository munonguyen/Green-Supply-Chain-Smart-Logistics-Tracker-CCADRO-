package com.ccadro.routing.application;

import com.ccadro.exception.ResourceNotFoundException;
import com.ccadro.routing.domain.*;
import com.ccadro.routing.infrastructure.RouteCandidateRepository;
import com.ccadro.routing.infrastructure.RouteDecisionRepository;
import com.ccadro.routing.infrastructure.RouteVersionRepository;
import com.ccadro.shared.config.CcadroProperties;
import com.ccadro.shipment.domain.Shipment;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class RoutingService {

    private final RouteCandidateRepository routeCandidateRepository;
    private final RouteDecisionRepository routeDecisionRepository;
    private final RouteVersionRepository routeVersionRepository;
    private final com.ccadro.shipment.application.ShipmentService shipmentService;
    private final CcadroProperties ccadroProperties;
    private final ApplicationContext applicationContext;

    public RoutingService(RouteCandidateRepository routeCandidateRepository,
                          RouteDecisionRepository routeDecisionRepository,
                          RouteVersionRepository routeVersionRepository,
                          com.ccadro.shipment.application.ShipmentService shipmentService,
                          CcadroProperties ccadroProperties,
                          ApplicationContext applicationContext) {
        this.routeCandidateRepository = routeCandidateRepository;
        this.routeDecisionRepository = routeDecisionRepository;
        this.routeVersionRepository = routeVersionRepository;
        this.shipmentService = shipmentService;
        this.ccadroProperties = ccadroProperties;
        this.applicationContext = applicationContext;
    }

    public RoutingProvider getActiveRoutingProvider() {
        String configuredProvider = ccadroProperties.getRouting().getProvider();
        if ("osrm".equalsIgnoreCase(configuredProvider) && applicationContext.containsBean("osrmRoutingProvider")) {
            return applicationContext.getBean("osrmRoutingProvider", RoutingProvider.class);
        } else if ("graphhopper".equalsIgnoreCase(configuredProvider) && applicationContext.containsBean("graphHopperRoutingProvider")) {
            return applicationContext.getBean("graphHopperRoutingProvider", RoutingProvider.class);
        }
        return applicationContext.getBean("mockRoutingProvider", RoutingProvider.class);
    }

    @Transactional
    public List<RouteCandidateData> calculateRoutesForShipment(UUID shipmentId) {
        Shipment shipment = shipmentService.getShipmentById(shipmentId);

        Location origin = new Location(shipment.getOriginGeom().getY(), shipment.getOriginGeom().getX(), shipment.getOriginName());
        Location destination = new Location(shipment.getDestinationGeom().getY(), shipment.getDestinationGeom().getX(), shipment.getDestinationName());

        RouteRequest request = new RouteRequest(
                shipmentId,
                origin,
                destination,
                shipment.getCargoWeightTons(),
                "DIESEL",
                "EURO_5"
        );

        RoutingProvider provider = getActiveRoutingProvider();
        List<RouteCandidateData> candidates = provider.getRoutes(request);

        // Save generated candidates
        for (RouteCandidateData data : candidates) {
            RouteCandidate candidate = new RouteCandidate();
            candidate.setShipmentId(shipmentId);
            candidate.setCandidateName(data.getCandidateName());
            candidate.setProviderName(data.getProviderName());
            candidate.setDistanceMeters(data.getDistanceMeters());
            candidate.setDurationSeconds(data.getDurationSeconds());
            candidate.setEstimatedFuelLiters(data.getEstimatedFuelLiters());
            candidate.setEstimatedCo2Kg(data.getEstimatedCo2Kg());
            candidate.setCompositeScore(data.getCompositeScore());
            candidate.setWaypointsJson(data.getGeometryGeoJson());
            routeCandidateRepository.save(candidate);
        }

        return candidates;
    }

    public List<RouteCandidate> getSavedCandidates(UUID shipmentId) {
        return routeCandidateRepository.findByShipmentId(shipmentId);
    }
}
