package com.ccadro.routing.entity;

import java.util.List;

public interface RoutingProvider {

    List<RouteCandidateData> getRoutes(RouteRequest request);

    String getProviderName();
}
