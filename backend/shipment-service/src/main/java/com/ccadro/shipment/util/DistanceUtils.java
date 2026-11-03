package com.ccadro.shipment.util;

import com.ccadro.shipment.dto.request.ShipmentCreationRequest;
import com.ccadro.shipment.entity.Shipment;
import lombok.experimental.UtilityClass;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utility class xử lý các phép toán không gian, tính toán và chuẩn hóa khoảng cách (GLEC v3 & BRULE-02).
 */
@UtilityClass
public class DistanceUtils {

    private static final int EARTH_RADIUS_KM = 6371;
    private static final double ROAD_CIRCUITY_FACTOR = 1.25;
    private static final String DEFAULT_UNIT = "KM";

    /**
     * Chuẩn hóa khoảng cách và đơn vị đo lường cho đơn vận tải (BRULE-02 & GLEC v3).
     * Tự động nhận diện đơn vị, parse số từ chuỗi, hoặc ước tính khoảng cách theo tọa độ GPS.
     */
    public static void normalizeDistance(Shipment shipment, ShipmentCreationRequest request) {
        String unit = DEFAULT_UNIT;
        if (request.getDistanceUnit() != null && !request.getDistanceUnit().isBlank()) {
            unit = request.getDistanceUnit().trim().toUpperCase();
        }

        BigDecimal distanceKm = request.getDistanceKm();
        String distanceRaw = request.getDistance();

        // 1. Phân tích chuỗi distance nếu client truyền chuỗi (ví dụ "km", "35.5", "35.5 km")
        if (distanceRaw != null && !distanceRaw.isBlank()) {
            String trimmed = distanceRaw.trim();
            if (trimmed.equalsIgnoreCase("km") || trimmed.equalsIgnoreCase("m") || trimmed.equalsIgnoreCase("mile")) {
                unit = trimmed.toUpperCase();
            } else {
                try {
                    String numericPart = trimmed.replaceAll("[^0-9.]", "");
                    if (!numericPart.isBlank() && distanceKm == null) {
                        distanceKm = new BigDecimal(numericPart).setScale(2, RoundingMode.HALF_UP);
                    }
                    if (trimmed.toLowerCase().endsWith("km")) unit = "KM";
                    else if (trimmed.toLowerCase().endsWith("m")) unit = "M";
                } catch (Exception ignored) {
                }
            }
        }

        // 2. Nếu chưa có giá trị số (distanceKm == null), tự động ước tính theo tọa độ GPS Origin - Destination (Haversine)
        if (distanceKm == null && request.getOriginLatitude() != null && request.getOriginLongitude() != null
                && request.getDestinationLatitude() != null && request.getDestinationLongitude() != null) {
            distanceKm = estimateRoadDistanceKm(
                    request.getOriginLatitude(), request.getOriginLongitude(),
                    request.getDestinationLatitude(), request.getDestinationLongitude()
            );
        }

        shipment.setDistanceKm(distanceKm);
        shipment.setDistanceUnit(unit);
        shipment.setDistance(distanceKm != null ? distanceKm + " " + unit : unit);
    }

    /**
     * Tính khoảng cách đường chim bay giữa 2 tọa độ theo công thức Haversine (km).
     */
    public static double calculateHaversineKm(double lat1, double lon1, double lat2, double lon2) {
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * Ước tính khoảng cách đường bộ bằng cách nhân hệ số uốn lượn (circuity factor ~1.25).
     */
    public static BigDecimal estimateRoadDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double straightKm = calculateHaversineKm(lat1, lon1, lat2, lon2);
        return BigDecimal.valueOf(straightKm * ROAD_CIRCUITY_FACTOR).setScale(2, RoundingMode.HALF_UP);
    }
}

