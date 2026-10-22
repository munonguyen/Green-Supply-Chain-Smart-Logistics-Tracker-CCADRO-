package com.ccadro.routing.infrastructure.adapter;

import com.ccadro.routing.domain.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("graphHopperRoutingProvider")
public class GraphHopperRoutingProvider implements RoutingProvider {

    private static final Logger log = LoggerFactory.getLogger(GraphHopperRoutingProvider.class);
    private final MockRoutingProvider fallbackMockProvider;

    public GraphHopperRoutingProvider(MockRoutingProvider fallbackMockProvider) {
        this.fallbackMockProvider = fallbackMockProvider;
    }

    @Override
    public String getProviderName() {
        return "GRAPHHOPPER";
    }

    @Override
    public List<RouteCandidateData> getRoutes(RouteRequest request) {
        log.info("Requesting routes from GraphHopper adapter (delegating to fallback mock)");
        return fallbackMockProvider.getRoutes(request);
    }
}
