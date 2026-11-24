package com.ccadro.routing.repository.adapter;

import com.ccadro.routing.entity.RouteRequest;
import com.ccadro.routing.entity.RouteWaypoint;
import java.util.List;

/** Reject distant map matches rather than silently navigating to a different road. */
final class RoadGeometryValidator {
    private RoadGeometryValidator() {}

    static void validate(List<RouteWaypoint> points, RouteRequest request, double radiusMeters) {
        if (points == null || points.size() < 2) throw new IllegalArgumentException("Missing road geometry");
        var first = points.get(0);
        var last = points.get(points.size() - 1);
        if (distance(first.getLatitude(), first.getLongitude(), request.getOrigin().getLatitude(),
                request.getOrigin().getLongitude()) > radiusMeters
                || distance(last.getLatitude(), last.getLongitude(), request.getDestination().getLatitude(),
                request.getDestination().getLongitude()) > radiusMeters)
            throw new IllegalArgumentException("Road endpoints are more than " + radiusMeters + "m from requested coordinates");
    }

    private static double distance(double lat1, double lon1, double lat2, double lon2) {
        double a = Math.pow(Math.sin(Math.toRadians(lat2 - lat1) / 2), 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.pow(Math.sin(Math.toRadians(lon2 - lon1) / 2), 2);
        return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    }
}
