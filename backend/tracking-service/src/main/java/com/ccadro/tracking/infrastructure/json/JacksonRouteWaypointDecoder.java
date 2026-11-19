package com.ccadro.tracking.infrastructure.json;

import com.ccadro.tracking.application.port.RouteWaypointDecoder;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public final class JacksonRouteWaypointDecoder implements RouteWaypointDecoder {
    private final ObjectMapper json;

    public JacksonRouteWaypointDecoder(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public List<List<Double>> decode(String routeData) {
        if (routeData == null || routeData.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = json.readTree(routeData);
            JsonNode coordinates = root == null ? null : root.get("coordinates");
            if (coordinates == null || !coordinates.isArray()) {
                return List.of();
            }
            List<List<Double>> points = new ArrayList<>(coordinates.size());
            for (JsonNode point : coordinates) {
                if (point.isArray() && point.size() >= 2
                        && point.get(0).isNumber() && point.get(1).isNumber()) {
                    // GeoJSON stores longitude first; the existing fleet contract uses latitude first.
                    points.add(List.of(point.get(1).doubleValue(), point.get(0).doubleValue()));
                }
            }
            return List.copyOf(points);
        } catch (JsonProcessingException exception) {
            return List.of();
        }
    }
}
