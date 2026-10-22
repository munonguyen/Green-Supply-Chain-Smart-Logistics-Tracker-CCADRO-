package com.ccadro.routing.infrastructure.adapter;

import com.ccadro.routing.domain.*;
import com.ccadro.shared.config.CcadroProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("osrmRoutingProvider")
public class OsrmRoutingProvider implements RoutingProvider {

    private static final Logger log = LoggerFactory.getLogger(OsrmRoutingProvider.class);

    private final CcadroProperties properties;
    private final MockRoutingProvider fallbackMockProvider;

    public OsrmRoutingProvider(CcadroProperties properties, MockRoutingProvider fallbackMockProvider) {
        this.properties = properties;
        this.fallbackMockProvider = fallbackMockProvider;
    }

    @Override
    public String getProviderName() {
        return "OSRM";
    }

    @Override
    public List<RouteCandidateData> getRoutes(RouteRequest request) {
        log.info("Requesting routes from OSRM endpoint: {} (fallback to Mock for dev/test)",
                properties.getRouting().getBaseUrl());
        // For development bootstrap, fallback cleanly to deterministic mock data
        return fallbackMockProvider.getRoutes(request);
    }
}
