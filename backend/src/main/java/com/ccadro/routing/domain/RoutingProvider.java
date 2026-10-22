package com.ccadro.routing.domain;

import java.util.List;

public interface RoutingProvider {

    List<RouteCandidateData> getRoutes(RouteRequest request);

    String getProviderName();
}
