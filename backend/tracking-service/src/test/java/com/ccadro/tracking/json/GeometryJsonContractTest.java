package com.ccadro.tracking.json;

import com.ccadro.tracking.entity.DeviationAlert;
import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.entity.TelemetryEvent;
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
    void hidesTelemetryEventLocationGeomWithoutRemovingPublicCoordinates() {
        TelemetryEvent entity = new TelemetryEvent();
        entity.setLocationGeom(geometry.createPoint(new Coordinate(106.75, 10.83)));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("locationGeom")).isFalse();
        assertThat(document.path("latitude").asDouble()).isEqualTo(10.83);
        assertThat(document.path("longitude").asDouble()).isEqualTo(106.75);
    }

    @Test
    void hidesDeviationAlertLocationGeomWithoutRemovingPublicCoordinates() {
        DeviationAlert entity = new DeviationAlert();
        entity.setLocationGeom(geometry.createPoint(new Coordinate(106.75, 10.83)));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("locationGeom")).isFalse();
        assertThat(document.path("latitude").asDouble()).isEqualTo(10.83);
        assertThat(document.path("longitude").asDouble()).isEqualTo(106.75);
    }

    @Test
    void hidesRerouteProposalProposedGeometryWithoutRemovingPublicCoordinates() {
        RerouteProposal entity = new RerouteProposal();
        entity.setProposedGeometry(geometry.createLineString(new Coordinate[] {new Coordinate(106.75, 10.83), new Coordinate(106.76, 10.84)}));
        JsonNode document = json.valueToTree(entity);
        assertThat(document.has("proposedGeometry")).isFalse();
    }
}
