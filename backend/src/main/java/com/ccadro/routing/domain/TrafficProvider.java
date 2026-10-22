package com.ccadro.routing.domain;

public interface TrafficProvider {

    TrafficCondition getTraffic(RouteSegment segment);

    TrafficCondition getTrafficForLocation(Location location);
}
