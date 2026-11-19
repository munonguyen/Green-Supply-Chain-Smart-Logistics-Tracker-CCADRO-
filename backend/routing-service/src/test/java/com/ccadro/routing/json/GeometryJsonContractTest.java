package com.ccadro.routing.json;

import com.ccadro.routing.entity.RouteCandidate;
import com.ccadro.routing.entity.RouteVersion;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import static org.assertj.core.api.Assertions.assertThat;

@JsonTest
class GeometryJsonContractTest {
    @Autowired
    ObjectMapper json;
    private final GeometryFactory geometry = new GeometryFactory();

    @Test
    void hidesRouteCandidateRouteGeometryWithoutRemovingPublicCoordinates() {
        RouteCandidate entity = new RouteCandidate();
        entity.setRouteGeometry(geometry.createLineString(new Coordinate[] {new Coordinate(106.75, 10.83), new Coordinate(106.76, 10.84)}));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("routeGeometry")).isFalse();
    }

    @Test
    void hidesRouteVersionRouteGeometryWithoutRemovingPublicCoordinates() {
        RouteVersion entity = new RouteVersion();
        entity.setRouteGeometry(geometry.createLineString(new Coordinate[] {new Coordinate(106.75, 10.83), new Coordinate(106.76, 10.84)}));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("routeGeometry")).isFalse();
    }
}
