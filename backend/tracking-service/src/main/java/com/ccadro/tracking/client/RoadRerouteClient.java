package com.ccadro.tracking.client;

import com.ccadro.tracking.dto.ApiResponse;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.locationtech.jts.geom.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.*;

@Component
public class RoadRerouteClient {
    private final RestClient client;
    private final ObjectMapper json;

    public RoadRerouteClient(@Value("${services.routing.url:http://localhost:8083}") String url, ObjectMapper json) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(35000);
        client = RestClient.builder().baseUrl(url).requestFactory(factory).build();
        this.json = json;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RoadRoute(UUID candidateId, String providerName, BigDecimal distanceMeters,
        BigDecimal durationSeconds, BigDecimal compositeScore, String geometryGeoJson, String routingMetadataJson) {}

    public List<RoadRoute> calculate(UUID shipmentId, double latitude, double longitude) {
        var result = client.post().uri(builder -> builder.path("/api/v1/routing/reroute/calculate/" + shipmentId)
            .queryParam("latitude", latitude).queryParam("longitude", longitude).build())
            .retrieve().body(new ParameterizedTypeReference<ApiResponse<List<RoadRoute>>>() {});
        if (result == null || result.getCode() != 1000 || result.getResult() == null) return List.of();
        return result.getResult().stream().filter(route -> route.candidateId() != null
            && Set.of("OSRM", "TOMTOM").contains(String.valueOf(route.providerName()))
            && route.distanceMeters() != null && route.distanceMeters().signum() > 0
            && route.durationSeconds() != null && route.durationSeconds().signum() > 0)
            .sorted(Comparator.comparing(RoadRoute::compositeScore, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
    }

    public LineString geometry(RoadRoute route) {
        try {
            var value = json.readTree(route.geometryGeoJson());
            if (!"LineString".equals(value.path("type").asText()) || value.path("coordinates").size() < 2)
                throw new IllegalArgumentException("Missing road geometry");
            var coordinates = new ArrayList<Coordinate>();
            for (var point : value.path("coordinates")) {
                double lon = point.path(0).asDouble(Double.NaN), lat = point.path(1).asDouble(Double.NaN);
                if (!Double.isFinite(lon) || !Double.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90)
                    throw new IllegalArgumentException("Invalid coordinate");
                coordinates.add(new Coordinate(lon, lat));
            }
            return new GeometryFactory(new PrecisionModel(), 4326).createLineString(coordinates.toArray(Coordinate[]::new));
        } catch (Exception error) { throw new IllegalArgumentException("Invalid road geometry returned by Routing", error); }
    }
}
