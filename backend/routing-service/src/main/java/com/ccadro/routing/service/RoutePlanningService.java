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
 * - Tính toán điểm phạt tổng hợp (Composite Penalty Score) theo trọng số động.
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
        if ("osrm".equalsIgnoreCase(configuredProvider) && applicationContext.containsBean("osrmRoutingProvider")) {
            return applicationContext.getBean("osrmRoutingProvider", RoutingProvider.class);
        } else if ("graphhopper".equalsIgnoreCase(configuredProvider) && applicationContext.containsBean("graphHopperRoutingProvider")) {
            return applicationContext.getBean("graphHopperRoutingProvider", RoutingProvider.class);
        }
        return applicationContext.getBean("mockRoutingProvider", RoutingProvider.class);
    }

    /**
     * UC05, BRULE-03, BRULE-04, BRULE-05:
     * Lập lộ trình xanh đa tiêu chí (Phát thải CO2, Thời gian, Quãng đường) với chuẩn hóa Min-Max trong cùng tập ứng viên.
     */
    @Transactional
    public List<RouteCandidateResponse> planRoutes(RoutePlanRequest planRequest) {
        double wCo2 = planRequest.getWeightEmission() != null ? planRequest.getWeightEmission().doubleValue() : 0.50;
        double wTime = planRequest.getWeightDuration() != null ? planRequest.getWeightDuration().doubleValue() : 0.30;
        double wDist = planRequest.getWeightDistance() != null ? planRequest.getWeightDistance().doubleValue() : 0.20;

        // BRULE-05: Đảm bảo tổng trọng số = 1.0
        double sumWeights = wCo2 + wTime + wDist;
        if (sumWeights <= 0) {
            wCo2 = 0.50;
            wTime = 0.30;
            wDist = 0.20;
        } else if (Math.abs(sumWeights - 1.0) > 0.0001) {
            wCo2 /= sumWeights;
            wTime /= sumWeights;
            wDist /= sumWeights;
        }

        List<RouteCandidate> savedEntities = generateAndScoreCandidates(
                planRequest.getShipmentId(), wCo2, wTime, wDist);
        return routingMapper.toResponseList(savedEntities);
    }

    @Transactional
    public List<RouteCandidateData> calculateRoutesForShipment(UUID shipmentId) {
        ShipmentDto shipment = fetchShipmentOrDefault(shipmentId);
        RouteRequest request = buildProviderRouteRequest(shipmentId, shipment);

        RoutingProvider provider = getActiveRoutingProvider();
        List<RouteCandidateData> candidates = provider.getRoutes(request);
        if (candidates == null || candidates.isEmpty()) {
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED);
        }

        scoreAndPersistCandidates(shipmentId, shipment, candidates, 0.50, 0.30, 0.20);
        return candidates;
    }

    public List<RouteCandidate> getSavedCandidates(UUID shipmentId) {
        return routeCandidateRepository.findByShipmentId(shipmentId);
    }

    public List<RouteCandidate> generateAndScoreCandidates(
            UUID shipmentId, double wCo2, double wTime, double wDist) {
        ShipmentDto shipment = fetchShipmentOrDefault(shipmentId);
        RouteRequest request = buildProviderRouteRequest(shipmentId, shipment);

        RoutingProvider provider = getActiveRoutingProvider();
        List<RouteCandidateData> rawCandidates = provider.getRoutes(request);
        if (rawCandidates == null || rawCandidates.isEmpty()) {
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED);
        }

        return scoreAndPersistCandidates(shipmentId, shipment, rawCandidates, wCo2, wTime, wDist);
    }

    private List<RouteCandidate> scoreAndPersistCandidates(
            UUID shipmentId,
            ShipmentDto shipment,
            List<RouteCandidateData> rawCandidates,
            double wCo2,
            double wTime,
            double wDist) {
        BigDecimal payloadTons = shipment.getCargoWeightTons() != null
                ? shipment.getCargoWeightTons()
                : BigDecimal.valueOf(14.20);
        BigDecimal daf = BigDecimal.valueOf(ccadroProperties.getCarbon().getDistanceAdjustmentFactor());
        BigDecimal tonneKmFactor = BigDecimal.valueOf(ccadroProperties.getCarbon().getDefaultTonneKmFactor());

        Location originLoc = new Location(
                shipment.getOriginLatitude() != null ? shipment.getOriginLatitude() : 10.762622,
                shipment.getOriginLongitude() != null ? shipment.getOriginLongitude() : 106.795677,
                shipment.getOriginName()
        );
        TrafficCondition trafficCondition = trafficProvider != null
                ? trafficProvider.getTrafficForLocation(originLoc)
                : TrafficCondition.NORMAL;
        WeatherCondition weatherCondition = weatherProvider != null
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
                    // Planning Carbon: Distance * DAF * PayloadTons * TonneKmFactor * congestionMultiplier
                    BigDecimal distKm = entity.getDistanceMeters()
                            .multiply(daf)
                            .divide(BigDecimal.valueOf(1000), 3, RoundingMode.HALF_UP);
                    BigDecimal dynamicCo2 = distKm.multiply(payloadTons)
                            .multiply(tonneKmFactor)
                            .multiply(BigDecimal.valueOf(congestionCo2Multiplier))
                            .setScale(2, RoundingMode.HALF_UP);
                    entity.setEstimatedCo2Kg(dynamicCo2);
                    entity.setRiskScore(BigDecimal.valueOf(
                            trafficCondition == TrafficCondition.ROAD_CLOSED ? 0.90
                                    : (weatherCondition == WeatherCondition.FLOODING ? 0.75
                                    : (combinedTimeMultiplier > 1.25 ? 0.35 : 0.05)))
                            .setScale(4, RoundingMode.HALF_UP));
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

        RouteCandidate bestCandidate = null;
        BigDecimal lowestPenaltyScore = BigDecimal.valueOf(Double.MAX_VALUE);

        for (RouteCandidate c : entities) {
            double normCo2 = normalizeMinMax(c.getEstimatedCo2Kg(), minCo2, maxCo2);
            double normTime = normalizeMinMax(c.getDurationSeconds(), minTime, maxTime);
            double normDist = normalizeMinMax(c.getDistanceMeters(), minDist, maxDist);

            double penaltyScore = (wCo2 * normCo2) + (wTime * normTime) + (wDist * normDist);
            BigDecimal compositeScore = BigDecimal.valueOf(penaltyScore).setScale(4, RoundingMode.HALF_UP);
            c.setCompositeScore(compositeScore);
            c.setMetricsBreakdownJson(String.format(Locale.ROOT,
                    "{\"normCo2\":%.4f,\"normTime\":%.4f,\"normDist\":%.4f,\"wCo2\":%.2f,\"wTime\":%.2f,\"wDist\":%.2f,\"traffic\":\"%s\",\"weather\":\"%s\"}",
                    normCo2, normTime, normDist, wCo2, wTime, wDist, trafficCondition.name(), weatherCondition.name()));
            c.setSelected(false);

            if (compositeScore.compareTo(lowestPenaltyScore) < 0) {
                lowestPenaltyScore = compositeScore;
                bestCandidate = c;
            }
        }

        if (bestCandidate != null) {
            bestCandidate.setSelected(true);
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
            log.warn("Không thể gọi ShipmentClient cho shipmentId {}, sử dụng tọa độ mặc định Cát Lái -> VSIP 1: {}",
                    shipmentId, e.getMessage());
        }
        throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED,"Không thể lấy dữ liệu vận đơn; không sử dụng tọa độ demo thay thế");
    }

    private RouteRequest buildProviderRouteRequest(UUID shipmentId, ShipmentDto shipment) {
        if(shipment.getOriginLatitude()==null || shipment.getOriginLongitude()==null || shipment.getDestinationLatitude()==null || shipment.getDestinationLongitude()==null || shipment.getCargoWeightTons()==null || shipment.getCargoWeightTons().signum()<=0)
            throw new AppException(ErrorCode.ROUTING_PROVIDER_FAILED,"Vận đơn thiếu tọa độ hoặc tải trọng hợp lệ");
        double oLat = shipment.getOriginLatitude();
        double oLon = shipment.getOriginLongitude() != null ? shipment.getOriginLongitude() : 106.795677;
        double dLat = shipment.getDestinationLatitude() != null ? shipment.getDestinationLatitude() : 10.931215;
        double dLon = shipment.getDestinationLongitude() != null ? shipment.getDestinationLongitude() : 106.697426;

        Location origin = new Location(oLat, oLon, shipment.getOriginName());
        Location destination = new Location(dLat, dLon, shipment.getDestinationName());

        return new RouteRequest(
                shipmentId,
                origin,
                destination,
                shipment.getCargoWeightTons() != null ? shipment.getCargoWeightTons() : BigDecimal.valueOf(14.20),
                "DIESEL",
                "EURO_5"
        );
    }
}
