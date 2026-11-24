package com.ccadro.routing.service;

import com.ccadro.routing.configuration.CcadroProperties;
import com.ccadro.routing.dto.ApiResponse;
import com.ccadro.routing.dto.ShipmentDto;
import com.ccadro.routing.dto.request.RoutePlanRequest;
import com.ccadro.routing.dto.response.RouteCandidateResponse;
import com.ccadro.routing.entity.Location;
import com.ccadro.routing.entity.RouteCandidate;
import com.ccadro.routing.entity.RouteCandidateData;
import com.ccadro.routing.entity.RouteRequest;
import com.ccadro.routing.entity.RoutingProvider;
import com.ccadro.routing.entity.TrafficCondition;
import com.ccadro.routing.entity.TrafficProvider;
import com.ccadro.routing.entity.WeatherCondition;
import com.ccadro.routing.entity.WeatherProvider;
import com.ccadro.routing.exception.AppException;
import com.ccadro.routing.exception.ErrorCode;
import com.ccadro.routing.mapper.RoutingMapper;
import com.ccadro.routing.repository.RouteCandidateRepository;
import com.ccadro.routing.repository.httpclient.ShipmentClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Service tính toán và tối ưu lộ trình xanh đa tiêu chí (UC05, BRULE-03, BRULE-04, BRULE-05):
 * - Tích hợp OpenStreetMap / OSRM / GraphHopper / Mock Routing Providers.
 * - Kết hợp TrafficProvider & WeatherProvider để điều chỉnh thời gian và rủi ro phát thải.
 * - Chuẩn hóa Min-Max trên tập ứng viên (CO2, Thời gian, Quãng đường).
 * - Tính điểm tổng hợp để tham khảo; chỉ dispatcher chốt mới kích hoạt tuyến chính thức.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RoutePlanningService {

    RouteCandidateRepository routeCandidateRepository;
    ShipmentClient shipmentClient;
    CcadroProperties ccadroProperties;
    ApplicationContext applicationContext;
    RoutingMapper routingMapper;
    TrafficProvider trafficProvider;
    WeatherProvider weatherProvider;

    public RoutingProvider getActiveRoutingProvider() {
        String configuredProvider = ccadroProperties.getRouting().getProvider();
        if ("tomtom".equalsIgnoreCase(configuredProvider)) {
            return applicationContext.getBean("tomTomRoutingProvider", RoutingProvider.class);
        }
        if ("osrm".equalsIgnoreCase(configuredProvider) && applicationContext.containsBean("osrmRoutingProvider")) {
            return applicationContext.getBean("osrmRoutingProvider", RoutingProvider.class);
        } else if ("graphhopper".equalsIgnoreCase(configuredProvider) && applicationContext.containsBean("graphHopperRoutingProvider")) {
            return applicationContext.getBean("graphHopperRoutingProvider", RoutingProvider.class);
        }
        if ("mock".equalsIgnoreCase(configuredProvider))
            return applicationContext.getBean("mockRoutingProvider", RoutingProvider.class);
        throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED, "Nhà cung cấp tuyến chưa được cấu hình hợp lệ");
    }

    /**
     * UC05, BRULE-03, BRULE-04, BRULE-05:
     * Lập lộ trình xanh đa tiêu chí (Phát thải CO2, Thời gian, Quãng đường) với chuẩn hóa Min-Max trong cùng tập ứng viên.
     */
    @Transactional
    public List<RouteCandidateResponse> planRoutes(RoutePlanRequest planRequest) {
        if (Boolean.TRUE.equals(planRequest.getAvoidTolls()) || Boolean.TRUE.equals(planRequest.getAvoidHighways())
                || planRequest.getVehicleId() != null)
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                "Chưa hỗ trợ các tùy chọn tránh đường và hồ sơ xe riêng ở API này; không tự bỏ qua yêu cầu.");
        double wCo2 = planRequest.getWeightEmission() != null ? planRequest.getWeightEmission().doubleValue() : 0.50;
        double wTime = planRequest.getWeightDuration() != null ? planRequest.getWeightDuration().doubleValue() : 0.30;
        double wDist = planRequest.getWeightDistance() != null ? planRequest.getWeightDistance().doubleValue() : 0.20;

        List<RouteCandidate> savedEntities = generateAndScoreCandidates(
                planRequest.getShipmentId(), wCo2, wTime, wDist);
        return routingMapper.toResponseList(savedEntities);
    }

    @Transactional
    public List<RouteCandidateData> calculateRoutesForShipment(UUID shipmentId) {
        return calculateRoutesForShipment(shipmentId, 0.50, 0.30, 0.20);
    }

    @Transactional
    public List<RouteCandidateData> calculateRoutesForShipment(UUID shipmentId, double wCo2, double wTime, double wDist) {
        if (!Double.isFinite(wCo2 + wTime + wDist) || Math.min(wCo2, Math.min(wTime, wDist)) < 0
                || wCo2 + wTime + wDist <= 0)
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Trọng số phải không âm và tổng lớn hơn 0");
        ShipmentDto shipment = fetchShipmentOrDefault(shipmentId);
        return calculateForShipment(shipmentId, shipment, wCo2, wTime, wDist);
    }

    @Transactional
    public List<RouteCandidateData> calculateRemainingRoutes(UUID shipmentId, double latitude, double longitude) {
        ShipmentDto shipment = fetchShipmentOrDefault(shipmentId);
        shipment.setOriginLatitude(latitude);
        shipment.setOriginLongitude(longitude);
        shipment.setOriginName("Vị trí GPS tính lại tuyến");
        shipment.setPickupTimePlanned(java.time.Instant.now());
        if (!java.util.Set.of("OSRM", "TOMTOM").contains(getActiveRoutingProvider().getProviderName()))
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED, "Đổi tuyến vận hành cần nhà cung cấp đường thực");
        return calculateForShipment(shipmentId, shipment, 0.5, 0.3, 0.2);
    }

    private List<RouteCandidateData> calculateForShipment(UUID shipmentId, ShipmentDto shipment, double wCo2, double wTime, double wDist) {
        RouteRequest request = buildProviderRouteRequest(shipmentId, shipment);

        RoutingProvider provider = getActiveRoutingProvider();
        List<RouteCandidateData> candidates = provider.getRoutes(request);
        if (candidates == null || candidates.isEmpty()) {
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED);
        }

        List<RouteCandidate> saved = scoreAndPersistCandidates(shipmentId, shipment, candidates, wCo2, wTime, wDist);
        for (int index = 0; index < Math.min(candidates.size(), saved.size()); index++) {
            RouteCandidate entity = saved.get(index);
            RouteCandidateData data = candidates.get(index);
            data.setCandidateId(entity.getId());
            data.setEstimatedCo2Kg(entity.getEstimatedCo2Kg());
            data.setCompositeScore(entity.getCompositeScore());
            data.setDurationSeconds(entity.getDurationSeconds());
            data.setRoutingMetadataJson(entity.getMetricsBreakdownJson());
        }
        return candidates.stream().sorted(Comparator.comparing(RouteCandidateData::getCompositeScore)
                .thenComparing(RouteCandidateData::getEstimatedCo2Kg)
                .thenComparing(RouteCandidateData::getDurationSeconds)
                .thenComparing(RouteCandidateData::getDistanceMeters)).toList();
    }

    public List<RouteCandidate> getSavedCandidates(UUID shipmentId) {
        return routeCandidateRepository.findByShipmentId(shipmentId);
    }

    @Transactional
    public List<RouteCandidate> generateAndScoreCandidates(
            UUID shipmentId, double wCo2, double wTime, double wDist) {
        ShipmentDto shipment = fetchShipmentOrDefault(shipmentId);
        RouteRequest request = buildProviderRouteRequest(shipmentId, shipment);

        RoutingProvider provider = getActiveRoutingProvider();
        List<RouteCandidateData> rawCandidates = provider.getRoutes(request);
        if (rawCandidates == null || rawCandidates.isEmpty()) {
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED);
        }

        return scoreAndPersistCandidates(shipmentId, shipment, rawCandidates, wCo2, wTime, wDist).stream()
            .sorted(Comparator.comparing(RouteCandidate::getCompositeScore)
                .thenComparing(RouteCandidate::getEstimatedCo2Kg)
                .thenComparing(RouteCandidate::getDurationSeconds)
                .thenComparing(RouteCandidate::getDistanceMeters)).toList();
    }

    private List<RouteCandidate> scoreAndPersistCandidates(
            UUID shipmentId,
            ShipmentDto shipment,
            List<RouteCandidateData> rawCandidates,
            double wCo2,
            double wTime,
            double wDist) {
        double sumWeights = wCo2 + wTime + wDist;
        if (!Double.isFinite(sumWeights) || Math.min(wCo2, Math.min(wTime, wDist)) < 0 || sumWeights <= 0)
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Trọng số phải không âm và tổng lớn hơn 0");
        wCo2 /= sumWeights;
        wTime /= sumWeights;
        wDist /= sumWeights;
        boolean fuelModel = rawCandidates.stream().allMatch(data -> "TOMTOM".equalsIgnoreCase(data.getProviderName())
                && data.getEstimatedFuelLiters() != null && data.getEstimatedFuelLiters().signum() > 0);
        if (!fuelModel && rawCandidates.stream().anyMatch(data -> "TOMTOM".equalsIgnoreCase(data.getProviderName())
                && data.getEstimatedFuelLiters() != null))
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED, "Không đủ dự báo nhiên liệu đồng nhất để so sánh các tuyến.");
        double fuelFactor = ccadroProperties.getCarbon().getFuelKgCo2PerLiter();
        if (fuelModel && (!Double.isFinite(fuelFactor) || fuelFactor <= 0))
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                "Cần cấu hình CCADRO_CARBON_FUEL_KG_CO2_PER_LITER đúng loại nhiên liệu khi dùng mô hình tiêu hao xe.");
        BigDecimal payloadTons = shipment.getCargoWeightTons();
        BigDecimal daf = BigDecimal.valueOf(ccadroProperties.getCarbon().getDistanceAdjustmentFactor());
        BigDecimal tonneKmFactor = BigDecimal.valueOf(ccadroProperties.getCarbon().getDefaultTonneKmFactor());

        Location originLoc = new Location(
                shipment.getOriginLatitude(),
                shipment.getOriginLongitude(),
                shipment.getOriginName()
        );
        boolean simulation = rawCandidates.stream().allMatch(candidate -> "mock".equalsIgnoreCase(candidate.getProviderName()));
        TrafficCondition trafficCondition = simulation && trafficProvider != null
                ? trafficProvider.getTrafficForLocation(originLoc)
                : TrafficCondition.NORMAL;
        WeatherCondition weatherCondition = simulation && weatherProvider != null
                ? weatherProvider.getWeather(originLoc)
                : WeatherCondition.CLEAR;

        double trafficDurationFactor = switch (trafficCondition) {
            case MEDIUM -> 1.25;
            case HEAVY -> 1.60;
            case ROAD_CLOSED -> 3.00;
            default -> 1.00;
        };
        double weatherDurationFactor = switch (weatherCondition) {
            case RAINY -> 1.12;
            case HEAVY_STORM -> 1.35;
            case FLOODING -> 1.75;
            default -> 1.00;
        };
        double combinedTimeMultiplier = trafficDurationFactor * weatherDurationFactor;
        double congestionCo2Multiplier = 1.0 + Math.max(0.0, (combinedTimeMultiplier - 1.0) * 0.25);

        List<RouteCandidate> entities = rawCandidates.stream()
                .map(data -> {
                    RouteCandidate entity = routingMapper.toEntity(data);
                    entity.setShipmentId(shipmentId);
                    if (entity.getDurationSeconds() != null) {
                        entity.setDurationSeconds(
                                entity.getDurationSeconds()
                                        .multiply(BigDecimal.valueOf(combinedTimeMultiplier))
                                        .setScale(2, RoundingMode.HALF_UP)
                        );
                    }
                    // Road distance already contains detours; DAF and mock congestion only apply in simulation.
                    BigDecimal distKm = entity.getDistanceMeters()
                            .multiply(simulation ? daf : BigDecimal.ONE)
                            .divide(BigDecimal.valueOf(1000), 3, RoundingMode.HALF_UP);
                    BigDecimal dynamicCo2 = distKm.multiply(payloadTons)
                            .multiply(tonneKmFactor)
                            .multiply(BigDecimal.valueOf(congestionCo2Multiplier))
                            .setScale(2, RoundingMode.HALF_UP);
                    if (fuelModel) {
                        entity.setEstimatedFuelLiters(data.getEstimatedFuelLiters());
                        dynamicCo2 = data.getEstimatedFuelLiters().multiply(BigDecimal.valueOf(fuelFactor))
                            .setScale(2, RoundingMode.HALF_UP);
                    }
                    entity.setEstimatedCo2Kg(dynamicCo2);
                    entity.setRiskScore(simulation ? BigDecimal.valueOf(
                            trafficCondition == TrafficCondition.ROAD_CLOSED ? 0.90
                                    : (weatherCondition == WeatherCondition.FLOODING ? 0.75
                                    : (combinedTimeMultiplier > 1.25 ? 0.35 : 0.05)))
                            .setScale(4, RoundingMode.HALF_UP) : null);
                    return entity;
                })
                .toList();

        // BRULE-04: Chuẩn hóa Min-Max trên tập ứng viên hiện tại
        BigDecimal minCo2 = entities.stream().map(RouteCandidate::getEstimatedCo2Kg).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal maxCo2 = entities.stream().map(RouteCandidate::getEstimatedCo2Kg).max(Comparator.naturalOrder()).orElse(BigDecimal.ONE);
        BigDecimal minTime = entities.stream().map(RouteCandidate::getDurationSeconds).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal maxTime = entities.stream().map(RouteCandidate::getDurationSeconds).max(Comparator.naturalOrder()).orElse(BigDecimal.ONE);
        BigDecimal minDist = entities.stream().map(RouteCandidate::getDistanceMeters).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal maxDist = entities.stream().map(RouteCandidate::getDistanceMeters).max(Comparator.naturalOrder()).orElse(BigDecimal.ONE);

        for (RouteCandidate c : entities) {
            double normCo2 = normalizeMinMax(c.getEstimatedCo2Kg(), minCo2, maxCo2);
            double normTime = normalizeMinMax(c.getDurationSeconds(), minTime, maxTime);
            double normDist = normalizeMinMax(c.getDistanceMeters(), minDist, maxDist);

            double penaltyScore = (wCo2 * normCo2) + (wTime * normTime) + (wDist * normDist);
            BigDecimal compositeScore = BigDecimal.valueOf(penaltyScore).setScale(4, RoundingMode.HALF_UP);
            c.setCompositeScore(compositeScore);
            String scores = String.format(Locale.ROOT,
                    "{\"normCo2\":%.4f,\"normTime\":%.4f,\"normDist\":%.4f,\"wCo2\":%.2f,\"wTime\":%.2f,\"wDist\":%.2f,\"traffic\":\"%s\",\"weather\":\"%s\"}",
                    normCo2, normTime, normDist, wCo2, wTime, wDist, trafficCondition.name(), weatherCondition.name());
            try {
                var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                var metadata = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(scores);
                int candidateIndex = entities.indexOf(c);
                String sourceMetadata = rawCandidates.get(candidateIndex).getRoutingMetadataJson();
                if (sourceMetadata != null) metadata.setAll((com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(sourceMetadata));
                metadata.put("trafficSource", simulation ? "SIMULATED" :
                    "TOMTOM".equalsIgnoreCase(c.getProviderName()) ? "TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL" : "NOT_AVAILABLE");
                if (!simulation) {
                    metadata.put("traffic", "SEE_PROVIDER_SUMMARY");
                    metadata.put("weather", "NOT_AVAILABLE");
                }
                metadata.put("carbonModel", fuelModel ? "PROVIDER_FUEL_ESTIMATE" : "DISTANCE_TONNE_KM_ESTIMATE");
                if (fuelModel) metadata.put("carbonFactorKgPerLiter", fuelFactor);
                metadata.put("carbonUsesTrafficAwareFuelEstimate", fuelModel);
                metadata.put("optimizationScope", "PROVIDER_CANDIDATES");
                metadata.put("carbonFactorKgPerTonneKm", tonneKmFactor);
                metadata.put("carbonIncludesMeasuredCongestion", false);
                metadata.put("truckProfileApplied", "TOMTOM".equalsIgnoreCase(c.getProviderName()));
                metadata.put("shortestCandidate", c.getDistanceMeters().compareTo(minDist) == 0);
                metadata.put("fastestCandidate", c.getDurationSeconds().compareTo(minTime) == 0);
                metadata.put("lowestEstimatedCarbonCandidate", c.getEstimatedCo2Kg().compareTo(minCo2) == 0);
                boolean dominated = entities.stream().anyMatch(other -> other != c
                    && other.getDistanceMeters().compareTo(c.getDistanceMeters()) <= 0
                    && other.getDurationSeconds().compareTo(c.getDurationSeconds()) <= 0
                    && other.getEstimatedCo2Kg().compareTo(c.getEstimatedCo2Kg()) <= 0
                    && (other.getDistanceMeters().compareTo(c.getDistanceMeters()) < 0
                        || other.getDurationSeconds().compareTo(c.getDurationSeconds()) < 0
                        || other.getEstimatedCo2Kg().compareTo(c.getEstimatedCo2Kg()) < 0));
                metadata.put("paretoOptimal", !dominated);
                c.setMetricsBreakdownJson(mapper.writeValueAsString(metadata));
            } catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException(error); }
            // isSelected means dispatcher-approved route; ranking alone must not activate it.
            c.setSelected(false);
        }

        return routeCandidateRepository.saveAll(entities);
    }

    private double normalizeMinMax(BigDecimal val, BigDecimal min, BigDecimal max) {
        if (val == null || min == null || max == null || max.compareTo(min) == 0) {
            return 0.0;
        }
        return val.subtract(min).doubleValue() / max.subtract(min).doubleValue();
    }

    private ShipmentDto fetchShipmentOrDefault(UUID shipmentId) {
        try {
            ApiResponse<ShipmentDto> response = shipmentClient.getShipmentById(shipmentId);
            if (response != null && response.getResult() != null) {
                return response.getResult();
            }
        } catch (Exception e) {
            log.warn("Không thể gọi ShipmentClient cho shipmentId {}: {}",
                    shipmentId, e.getMessage());
        }
        throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED,"Không thể lấy dữ liệu vận đơn; không sử dụng tọa độ demo thay thế");
    }

    private RouteRequest buildProviderRouteRequest(UUID shipmentId, ShipmentDto shipment) {
        if (!isValidLatitude(shipment.getOriginLatitude())
                || !isValidLongitude(shipment.getOriginLongitude())
                || !isValidLatitude(shipment.getDestinationLatitude())
                || !isValidLongitude(shipment.getDestinationLongitude())
                || shipment.getCargoWeightTons() == null
                || shipment.getCargoWeightTons().signum() <= 0) {
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED,
                    "Vận đơn thiếu tọa độ trong phạm vi hợp lệ hoặc tải trọng lớn hơn 0");
        }
        double oLat = shipment.getOriginLatitude();
        double oLon = shipment.getOriginLongitude();
        double dLat = shipment.getDestinationLatitude();
        double dLon = shipment.getDestinationLongitude();

        Location origin = new Location(oLat, oLon, shipment.getOriginName());
        Location destination = new Location(dLat, dLon, shipment.getDestinationName());

        RouteRequest request = new RouteRequest(
                shipmentId,
                origin,
                destination,
                shipment.getCargoWeightTons(),
                "DIESEL",
                "EURO_5"
        );
        request.setDepartureTime(shipment.getPickupTimePlanned() != null
            && shipment.getPickupTimePlanned().isAfter(java.time.Instant.now()) ? shipment.getPickupTimePlanned() : java.time.Instant.now());
        return request;
    }

    private boolean isValidLatitude(Double value) {
        return value != null && Double.isFinite(value) && value >= -90 && value <= 90;
    }

    private boolean isValidLongitude(Double value) {
        return value != null && Double.isFinite(value) && value >= -180 && value <= 180;
    }
}
