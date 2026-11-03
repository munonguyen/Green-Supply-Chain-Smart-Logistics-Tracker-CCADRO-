package com.ccadro.routing.entity;

public interface TrafficProvider {

    TrafficCondition getTraffic(RouteSegment segment);

    TrafficCondition getTrafficForLocation(Location location);
}
