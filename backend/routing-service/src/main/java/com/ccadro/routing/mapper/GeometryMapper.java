package com.ccadro.routing.mapper;

import com.ccadro.routing.entity.RouteWaypoint;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.PrecisionModel;
import org.mapstruct.Named;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GeometryMapper {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Named("toLineString")
    public LineString toLineString(List<RouteWaypoint> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            return null;
        }
        Coordinate[] coords = waypoints.stream()
                .map(wp -> new Coordinate(wp.getLongitude(), wp.getLatitude()))
                .toArray(Coordinate[]::new);
        return geometryFactory.createLineString(coords);
    }
}
