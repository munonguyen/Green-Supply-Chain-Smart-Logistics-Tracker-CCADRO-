package com.ccadro.routing.repository.adapter;

import com.ccadro.routing.configuration.CcadroProperties;
import com.ccadro.routing.entity.RouteCandidateData;
import com.ccadro.routing.entity.RouteRequest;
import com.ccadro.routing.entity.RouteWaypoint;
import com.ccadro.routing.entity.RoutingProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component("osrmRoutingProvider")
public class OsrmRoutingProvider implements RoutingProvider {

    private static final Logger log = LoggerFactory.getLogger(OsrmRoutingProvider.class);

    private final CcadroProperties properties;
    private final MockRoutingProvider fallbackMockProvider;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public OsrmRoutingProvider(
            CcadroProperties properties,
            MockRoutingProvider fallbackMockProvider,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.fallbackMockProvider = fallbackMockProvider;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(500, properties.getRouting().getConnectTimeoutMs()));
        requestFactory.setReadTimeout(Math.max(1000, properties.getRouting().getReadTimeoutMs()));
        this.restClient = RestClient.builder()
                .baseUrl(properties.getRouting().getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public String getProviderName() {
        return "OSRM";
    }

    @Override
    public List<RouteCandidateData> getRoutes(RouteRequest request) {
        if (request == null || request.getOrigin() == null || request.getDestination() == null) {
            throw new com.ccadro.routing.exception.AppException(com.ccadro.routing.exception.ErrorCode.ROUTING_PROVIDER_FAILED);
        }

        String path = String.format(
                Locale.ROOT,
                "/route/v1/driving/%.6f,%.6f;%.6f,%.6f?alternatives=3&overview=full&geometries=geojson&radiuses=100;100&steps=true",
                request.getOrigin().getLongitude(),
                request.getOrigin().getLatitude(),
                request.getDestination().getLongitude(),
                request.getDestination().getLatitude()
        );

        try {
            String rawJson = restClient.get().uri(path).retrieve().body(String.class);
            List<RouteCandidateData> parsed = parseOsrmResponse(rawJson, request);
            if (!parsed.isEmpty()) {
                return parsed;
            }
        } catch (Exception ex) {
            log.warn("OSRM route request failed; no synthetic fallback will be used");
        }

        throw new com.ccadro.routing.exception.AppException(com.ccadro.routing.exception.ErrorCode.ROUTING_PROVIDER_FAILED,
            "Không nhận được tuyến đường OSRM hợp lệ; hãy thử lại hoặc cấu hình nhà cung cấp khác");
    }

    List<RouteCandidateData> parseOsrmResponse(String rawJson, RouteRequest request) throws Exception {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }
        JsonNode root = objectMapper.readTree(rawJson);
        if (!"Ok".equals(root.path("code").asText())) return List.of();
        JsonNode routes = root.path("routes");
        if (!routes.isArray() || routes.isEmpty()) {
            return List.of();
        }

        BigDecimal payload = request.getCargoWeightTons() != null
                ? request.getCargoWeightTons()
                : BigDecimal.valueOf(14.20);
        BigDecimal factor = BigDecimal.valueOf(properties.getCarbon().getDefaultTonneKmFactor());

        List<RouteCandidateData> results = new ArrayList<>();
        for (int i = 0; i < routes.size(); i++) {
            JsonNode routeNode = routes.get(i);
            BigDecimal distanceMeters = BigDecimal.valueOf(routeNode.path("distance").asDouble(0.0))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal durationSeconds = BigDecimal.valueOf(routeNode.path("duration").asDouble(0.0))
                    .setScale(2, RoundingMode.HALF_UP);
            if (distanceMeters.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            JsonNode coordsNode = routeNode.path("geometry").path("coordinates");
            List<RouteWaypoint> waypoints = new ArrayList<>();
            if (coordsNode.isArray()) {
                for (int idx = 0; idx < coordsNode.size(); idx++) {
                    JsonNode pt = coordsNode.get(idx);
                    if (pt.isArray() && pt.size() >= 2 && pt.get(0).isNumber() && pt.get(1).isNumber()
                            && Math.abs(pt.get(0).asDouble()) <= 180 && Math.abs(pt.get(1).asDouble()) <= 90) {
                        waypoints.add(new RouteWaypoint(
                                pt.get(1).asDouble(),
                                pt.get(0).asDouble(),
                                idx + 1,
                                idx == 0 ? "Origin" : (idx == coordsNode.size() - 1 ? "Destination" : "OSRM Node " + idx)
                        ));
                    } else throw new IllegalArgumentException("Invalid route coordinate");
                }
            }

            if (waypoints.size() >= 2) RoadGeometryValidator.validate(waypoints, request, 100);
            BigDecimal distKm = distanceMeters.divide(BigDecimal.valueOf(1000), 3, RoundingMode.HALF_UP);
            if (waypoints.size() < 2 || durationSeconds.signum() <= 0) continue;
            BigDecimal estimatedCo2 = distKm.multiply(payload).multiply(factor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal estimatedFuel = null;

            var candidate = new RouteCandidateData(
                    i == 0 ? "OSRM Primary Route" : "OSRM Alternative #" + (i + 1),
                    getProviderName(),
                    distanceMeters,
                    durationSeconds,
                    estimatedFuel,
                    estimatedCo2,
                    BigDecimal.ZERO,
                    routeNode.path("geometry").toString(),
                    waypoints
            );
            var metadata = objectMapper.createObjectNode();
            metadata.put("fetchedAt", java.time.Instant.now().toString());
            metadata.put("routeType", "FASTEST_WITH_ALTERNATIVES");
            metadata.put("trafficSource", "NOT_AVAILABLE");
            metadata.put("snapRadiusMeters", 100);
            var instructions = metadata.putObject("guidance").putArray("instructions");
            double offset = 0;
            for (var leg : routeNode.path("legs")) for (var step : leg.path("steps")) {
                var maneuver = step.path("maneuver");
                String action = switch (maneuver.path("type").asText()) {
                    case "depart" -> "Xuất phát";
                    case "arrive" -> "Đến điểm đích";
                    case "turn", "end of road" -> "Rẽ";
                    case "merge" -> "Nhập làn";
                    case "on ramp" -> "Vào đường nhánh";
                    case "off ramp" -> "Ra đường nhánh";
                    case "roundabout", "rotary" -> "Vào vòng xuyến";
                    case "exit roundabout", "exit rotary" -> "Ra khỏi vòng xuyến";
                    case "fork" -> "Theo nhánh";
                    default -> "Tiếp tục";
                };
                String direction = switch (maneuver.path("modifier").asText()) {
                    case "uturn" -> "quay đầu";
                    case "sharp right" -> "ngoặt phải";
                    case "right" -> "phải";
                    case "slight right" -> "chếch phải";
                    case "straight" -> "thẳng";
                    case "slight left" -> "chếch trái";
                    case "left" -> "trái";
                    case "sharp left" -> "ngoặt trái";
                    default -> "";
                };
                var instruction = instructions.addObject();
                instruction.put("message", action + (direction.isBlank() ? "" : " " + direction)
                    + (step.path("name").asText().isBlank() ? "" : " · " + step.path("name").asText())
                    + (maneuver.has("exit") ? " · lối ra " + maneuver.path("exit").asInt() : ""));
                instruction.put("routeOffsetInMeters", offset);
                instruction.put("distanceMeters", step.path("distance").asDouble());
                offset += step.path("distance").asDouble();
            }
            candidate.setRoutingMetadataJson(objectMapper.writeValueAsString(metadata));
            results.add(candidate);
        }
        return results;
    }
}
