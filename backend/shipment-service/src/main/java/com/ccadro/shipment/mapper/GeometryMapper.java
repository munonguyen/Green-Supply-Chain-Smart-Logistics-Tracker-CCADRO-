package com.ccadro.shipment.mapper;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mapstruct.Named;
import org.springframework.stereotype.Component;

@Component
public class GeometryMapper {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    public Point toPoint(Double longitude, Double latitude) {
        if (longitude == null || latitude == null) {
            return null;
        }
        return geometryFactory.createPoint(new Coordinate(longitude, latitude));
    }

    @Named("toLongitude")
    public Double toLongitude(Point point) {
        return point != null ? point.getX() : null;
    }

    @Named("toLatitude")
    public Double toLatitude(Point point) {
        return point != null ? point.getY() : null;
    }
}

