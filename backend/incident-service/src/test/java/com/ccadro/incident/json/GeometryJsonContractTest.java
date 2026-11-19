package com.ccadro.incident.json;

import com.ccadro.incident.entity.FieldIncident;
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
    void hidesFieldIncidentIncidentLocationWithoutRemovingPublicCoordinates() {
        FieldIncident entity = new FieldIncident();
        entity.setIncidentLocation(geometry.createPoint(new Coordinate(106.75, 10.83)));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("incidentLocation")).isFalse();
        assertThat(document.path("latitude").asDouble()).isEqualTo(10.83);
        assertThat(document.path("longitude").asDouble()).isEqualTo(106.75);
    }
}
