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

        generateAndScoreCandidates(shipmentId, 0.50, 0.30, 0.20);
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

        BigDecimal payloadTons = shipment.getCargoWeightTons() != null
                ? shipment.getCargoWeightTons()
                : BigDecimal.valueOf(14.20);
        BigDecimal tonneKmFactor = BigDecimal.valueOf(ccadroProperties.getCarbon().getDefaultTonneKmFactor());

        List<RouteCandidate> entities = rawCandidates.stream()
                .map(data -> {
                    RouteCandidate entity = routingMapper.toEntity(data);
                    entity.setShipmentId(shipmentId);
                    // Tính lại phát thải ước tính theo tải trọng thực tế của đơn hàng (Planning Carbon)
                    BigDecimal distKm = entity.getDistanceMeters()
                            .divide(BigDecimal.valueOf(1000), 3, RoundingMode.HALF_UP);
                    BigDecimal dynamicCo2 = distKm.multiply(payloadTons).multiply(tonneKmFactor)
                            .setScale(2, RoundingMode.HALF_UP);
                    if (entity.getEstimatedCo2Kg() == null || entity.getEstimatedCo2Kg().compareTo(BigDecimal.ZERO) <= 0) {
                        entity.setEstimatedCo2Kg(dynamicCo2);
                    }
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
                    "{\"normCo2\":%.4f,\"normTime\":%.4f,\"normDist\":%.4f,\"wCo2\":%.2f,\"wTime\":%.2f,\"wDist\":%.2f}",
                    normCo2, normTime, normDist, wCo2, wTime, wDist));
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
        return ShipmentDto.builder()
                .id(shipmentId)
                .originName("Cảng Cát Lái TP.HCM")
                .originLatitude(10.762622)
                .originLongitude(106.795677)
                .destinationName("KCN VSIP 1 Bình Dương")
                .destinationLatitude(10.931215)
                .destinationLongitude(106.697426)
                .cargoWeightTons(BigDecimal.valueOf(14.20))
                .build();
    }

    private RouteRequest buildProviderRouteRequest(UUID shipmentId, ShipmentDto shipment) {
        double oLat = shipment.getOriginLatitude() != null ? shipment.getOriginLatitude() : 10.762622;
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
