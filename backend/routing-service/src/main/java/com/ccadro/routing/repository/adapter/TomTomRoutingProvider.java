package com.ccadro.routing.repository.adapter;

import com.ccadro.routing.entity.*;
import com.ccadro.routing.exception.AppException;
import com.ccadro.routing.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Component("tomTomRoutingProvider")
public class TomTomRoutingProvider implements RoutingProvider {
    private final ObjectMapper json;
    private final RestClient client;
    private final String key;
    private final int grossWeightKg;
    private final double heightMeters;
    private final double widthMeters;
    private final double lengthMeters;

    @Value("${CCADRO_TRUCK_CONSUMPTION_CURVE:}")
    private String consumptionCurve = "";
    @Value("${CCADRO_TRUCK_AUXILIARY_LITERS_PER_HOUR:0}")
    private double auxiliaryLitersPerHour;

    public TomTomRoutingProvider(ObjectMapper json,
            @Value("${TOMTOM_API_KEY:}") String key,
            @Value("${CCADRO_TRUCK_GROSS_WEIGHT_KG:0}") int grossWeightKg,
            @Value("${CCADRO_TRUCK_HEIGHT_METERS:0}") double heightMeters,
            @Value("${CCADRO_TRUCK_WIDTH_METERS:0}") double widthMeters,
            @Value("${CCADRO_TRUCK_LENGTH_METERS:0}") double lengthMeters) {
        this.json = json;
        this.key = key;
        this.grossWeightKg = grossWeightKg;
        this.heightMeters = heightMeters;
        this.widthMeters = widthMeters;
        this.lengthMeters = lengthMeters;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(12000);
        client = RestClient.builder().baseUrl("https://api.tomtom.com").requestFactory(factory).build();
    }

    @Override
    public String getProviderName() { return "TOMTOM"; }

    @Override
    public List<RouteCandidateData> getRoutes(RouteRequest request) {
        if (key.isBlank()) throw invalid("Chưa cấu hình TOMTOM_API_KEY để lấy tuyến có giao thông.");
        if (request == null || request.getOrigin() == null || request.getDestination() == null
                || request.getCargoWeightTons() == null || request.getCargoWeightTons().signum() <= 0)
            throw invalid("Thiếu tọa độ hoặc tải trọng hàng hợp lệ.");
        validateConsumptionConfiguration();
        if (grossWeightKg <= 0 || !Double.isFinite(heightMeters + widthMeters + lengthMeters)
                || heightMeters <= 0 || widthMeters <= 0 || lengthMeters <= 0)
            throw invalid("Cần khai báo tổng trọng lượng và kích thước tổ hợp đầu kéo/container trước khi tính tuyến xe tải.");
        if (request.getCargoWeightTons().multiply(BigDecimal.valueOf(1000)).doubleValue() >= grossWeightKg)
            throw invalid("Tổng trọng lượng xe phải lớn hơn khối lượng hàng.");
        Instant departure = request.getDepartureTime();
        if (departure == null || departure.isBefore(Instant.now())) departure = Instant.now();
        var results = new ArrayList<RouteCandidateData>();
        for (String type : List.of("fastest", "shortest", "eco")) {
            try {
                final Instant departing = departure;
                String coordinates = String.format(Locale.ROOT, "%.6f,%.6f:%.6f,%.6f",
                    request.getOrigin().getLatitude(), request.getOrigin().getLongitude(),
                    request.getDestination().getLatitude(), request.getDestination().getLongitude());
                String raw = client.get().uri(builder -> {
                    if (!consumptionCurve.isBlank()) {
                        builder.queryParam("vehicleEngineType", "combustion")
                            .queryParam("constantSpeedConsumptionInLitersPerHundredkm", consumptionCurve)
                            .queryParam("auxiliaryPowerInLitersPerHour", auxiliaryLitersPerHour);
                    }
                    return builder
                    .path("/routing/1/calculateRoute/" + coordinates + "/json")
                    .queryParam("key", key).queryParam("travelMode", "truck")
                    .queryParam("routeType", type).queryParam("traffic", true)
                    .queryParam("departAt", departing.toString()).queryParam("computeTravelTimeFor", "all")
                    .queryParam("maxAlternatives", type.equals("fastest") ? 2 : 0)
                    .queryParam("vehicleWeight", grossWeightKg).queryParam("vehicleHeight", heightMeters)
                    .queryParam("vehicleWidth", widthMeters).queryParam("vehicleLength", lengthMeters)
                    .queryParam("sectionType", "traffic").queryParam("sectionType", "travelMode")
                    .queryParam("routeRepresentation", "polyline").queryParam("instructionsType", "text")
                    .queryParam("language", "vi-VN").build(); }).retrieve().body(String.class);
                var parsed = parse(raw, type, departing);
                for (var candidate : parsed) RoadGeometryValidator.validate(candidate.getWaypoints(), request, 100);
                if (parsed.isEmpty()) throw invalid("Không có phương án " + type + " hợp lệ.");
                results.addAll(parsed);
            } catch (Exception error) {
                throw invalid("Không lấy được đầy đủ phương án TomTom. Kiểm tra khóa, quyền Routing, vùng phủ và cấu hình xe.");
            }
        }
        var unique = new LinkedHashMap<String, RouteCandidateData>();
        for (var route : results) unique.putIfAbsent(route.getGeometryGeoJson(), route);
        if (unique.isEmpty()) throw invalid("Nhà cung cấp không trả tuyến xe tải hợp lệ.");
        return new ArrayList<>(unique.values());
    }

    List<RouteCandidateData> parse(String raw, String type, Instant departure) throws Exception {
        var results = new ArrayList<RouteCandidateData>();
        for (JsonNode route : json.readTree(raw).path("routes")) {
            JsonNode summary = route.path("summary");
            double distance = summary.path("lengthInMeters").asDouble();
            double duration = summary.path("travelTimeInSeconds").asDouble();
            if (!Double.isFinite(distance) || !Double.isFinite(duration) || distance <= 0 || duration <= 0) continue;
            var points = new ArrayList<RouteWaypoint>();
            for (var leg : route.path("legs")) for (var point : leg.path("points")) {
                double lat = point.path("latitude").asDouble(Double.NaN);
                double lon = point.path("longitude").asDouble(Double.NaN);
                if (!Double.isFinite(lat) || !Double.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
                    throw invalid("Nhà cung cấp trả tọa độ không hợp lệ.");
                points.add(new RouteWaypoint(lat, lon, points.size() + 1, null));
            }
            if (points.size() < 2) continue;
            for (var section : route.path("sections")) {
                if ("TRAVEL_MODE".equals(section.path("sectionType").asText())
                        && !"truck".equals(section.path("travelMode").asText()))
                    throw invalid("Tuyến chứa đoạn không dành cho xe tải.");
            }
            var candidate = new RouteCandidateData();
            candidate.setCandidateName("TomTom " + type + " #" + (results.size() + 1));
            candidate.setProviderName(getProviderName());
            candidate.setDistanceMeters(BigDecimal.valueOf(distance));
            candidate.setDurationSeconds(BigDecimal.valueOf(duration));
            if (!consumptionCurve.isBlank()) {
                double fuel = summary.path("fuelConsumptionInLiters").asDouble(Double.NaN);
                if (!Double.isFinite(fuel) || fuel <= 0)
                    throw invalid("Thiếu dự báo nhiên liệu theo hồ sơ xe; không trộn mô hình CO₂ giữa các tuyến.");
                candidate.setEstimatedFuelLiters(BigDecimal.valueOf(fuel));
            }
            candidate.setWaypoints(points);
            candidate.setGeometryGeoJson(json.writeValueAsString(Map.of("type", "LineString",
                "coordinates", points.stream().map(point -> List.of(point.getLongitude(), point.getLatitude())).toList())));
            var metadata = json.createObjectNode();
            metadata.put("trafficSource", "TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL");
            metadata.put("routeType", type);
            metadata.put("fuelModelApplied", !consumptionCurve.isBlank());
            if (!consumptionCurve.isBlank()) {
                metadata.put("consumptionCurve", consumptionCurve);
                metadata.put("auxiliaryLitersPerHour", auxiliaryLitersPerHour);
            }
            metadata.put("snapRadiusMeters", 100);
            metadata.put("departAt", departure.toString());
            metadata.put("fetchedAt", Instant.now().toString());
            metadata.put("truckGrossWeightKg", grossWeightKg);
            metadata.put("truckHeightMeters", heightMeters);
            metadata.put("truckWidthMeters", widthMeters);
            metadata.put("truckLengthMeters", lengthMeters);
            metadata.set("summary", summary);
            metadata.set("trafficSections", route.path("sections"));
            metadata.set("guidance", route.path("guidance"));
            candidate.setRoutingMetadataJson(json.writeValueAsString(metadata));
            results.add(candidate);
        }
        return results;
    }

    private void validateConsumptionConfiguration() {
        if (consumptionCurve.isBlank()) {
            if (auxiliaryLitersPerHour != 0)
                throw invalid("Tiêu hao phụ trợ cần đường cong tiêu hao xe đã hiệu chỉnh.");
            return;
        }
        if (!Double.isFinite(auxiliaryLitersPerHour) || auxiliaryLitersPerHour < 0)
            throw invalid("Tiêu hao phụ trợ phải là số hữu hạn không âm.");
        try {
            var speeds = new TreeMap<Double, Double>();
            String[] pairs = consumptionCurve.split(":", -1);
            if (pairs.length > 25) throw new IllegalArgumentException();
            for (String pair : pairs) {
                String[] values = pair.split(",", -1);
                if (values.length != 2) throw new IllegalArgumentException();
                double speed = Double.parseDouble(values[0]);
                double fuel = Double.parseDouble(values[1]);
                if (!Double.isFinite(speed) || speed < 0 || speed > 255
                        || !Double.isFinite(fuel) || fuel < 0.01 || fuel > 100000
                        || speeds.putIfAbsent(speed, fuel) != null) throw new IllegalArgumentException();
            }
            if (speeds.size() > 1) {
                var first = speeds.firstEntry();
                var second = speeds.higherEntry(first.getKey());
                var last = speeds.lastEntry();
                var previous = speeds.lowerEntry(last.getKey());
                double fuelAtZero = first.getValue() - first.getKey()
                    * (second.getValue() - first.getValue()) / (second.getKey() - first.getKey());
                if (fuelAtZero < 0 || last.getValue() < previous.getValue()) throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException error) {
            throw invalid("Đường cong tiêu hao không hợp lệ: cần 1–25 cặp tốc độ, lít/100km, tốc độ không trùng và ngoại suy không âm.");
        }
    }

    private AppException invalid(String message) { return new AppException(ErrorCode.ROUTING_PROVIDER_FAILED, message); }
}
