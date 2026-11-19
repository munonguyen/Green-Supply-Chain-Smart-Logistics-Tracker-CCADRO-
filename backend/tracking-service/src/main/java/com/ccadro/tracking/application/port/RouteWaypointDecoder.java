package com.ccadro.tracking.application.port;

import java.util.List;

/** Reads stored route data into latitude/longitude pairs used by the fleet view. */
public interface RouteWaypointDecoder {
    List<List<Double>> decode(String routeData);
}
