package com.ccadro.shipment.json;

import com.ccadro.shipment.entity.Shipment;
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
    void hidesShipmentOriginGeomWithoutRemovingPublicCoordinates() {
        Shipment entity = new Shipment();
        entity.setOriginGeom(geometry.createPoint(new Coordinate(106.75, 10.83)));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("originGeom")).isFalse();
        assertThat(document.path("originLatitude").asDouble()).isEqualTo(10.83);
        assertThat(document.path("originLongitude").asDouble()).isEqualTo(106.75);
    }

    @Test
    void hidesShipmentDestinationGeomWithoutRemovingPublicCoordinates() {
        Shipment entity = new Shipment();
        entity.setDestinationGeom(geometry.createPoint(new Coordinate(106.75, 10.83)));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("destinationGeom")).isFalse();
        assertThat(document.path("destinationLatitude").asDouble()).isEqualTo(10.83);
        assertThat(document.path("destinationLongitude").asDouble()).isEqualTo(106.75);
    }
}
