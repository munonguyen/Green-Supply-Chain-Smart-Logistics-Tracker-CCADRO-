package com.ccadro.tracking.service;

import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverTripAccess {
    private final JdbcTemplate jdbc;
    private final TrackingService tracking;

    public boolean isDriver(String scope) {
        return scope != null && Arrays.asList(scope.trim().split("\\s+")).contains("ROLE_DRIVER");
    }

    public UUID resolve(String username) {
        if (username == null || username.isBlank()) throw new AppException(ErrorCode.UNAUTHENTICATED);
        List<UUID> drivers = jdbc.query("""
                SELECT id FROM driver WHERE lower(account_username) = lower(?) AND NOT is_deleted
                """, (row, index) -> row.getObject(1, UUID.class), username);
        if (drivers.size() != 1) throw new AppException(ErrorCode.DRIVER_NOT_FOUND, "Tài khoản chưa liên kết duy nhất với hồ sơ tài xế");
        return drivers.get(0);
    }

    public void requireOwner(UUID tripId, String username) {
        if (!exists("SELECT EXISTS (SELECT 1 FROM trip WHERE id = ? AND driver_id = ? AND NOT is_deleted)",
                tripId, resolve(username))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    @Transactional
    public Trip start(UUID tripId, String username, String scope) {
        if (!isDriver(scope)) throw new AppException(ErrorCode.UNAUTHORIZED);
        UUID driverId = resolve(username);
        var states = jdbc.query("""
                SELECT status FROM trip WHERE id = ? AND driver_id = ? AND NOT is_deleted FOR NO KEY UPDATE
                """, (row, index) -> row.getString(1), tripId, driverId);
        if (states.isEmpty()) throw new AppException(ErrorCode.UNAUTHORIZED);
        Trip trip = tracking.getTripById(tripId);
        if ("EN_ROUTE".equals(states.get(0))) return trip;
        if (!"SCHEDULED".equals(states.get(0))
                || !exists("""
                    SELECT EXISTS (SELECT 1 FROM dispatch_order
                         WHERE trip_id = ? AND shipment_id = ? AND vehicle_id = ? AND driver_id = ?
                           AND status = 'ASSIGNED')
                    """, tripId, trip.getShipmentId(), trip.getVehicleId(), driverId)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Chuyến chưa có lệnh phân công hiệu lực");
        }
        if (!exists("""
                SELECT EXISTS (SELECT 1 FROM driver_dispatch_qualification
                     WHERE driver_id = ? AND driver_status = 'ASSIGNED' AND qualification_issue IS NULL)
                """, driverId)) {
            throw new AppException(ErrorCode.DRIVER_LICENSE_INVALID, "Hồ sơ tài xế không còn đủ điều kiện xuất bến");
        }
        if (!exists("""
                SELECT coalesce((SELECT status = 'PASSED' AND inspection_time >= now() - interval '24 hours'
                  FROM pre_trip_inspection WHERE shipment_id = ? AND vehicle_id = ? AND driver_id = ?
                  ORDER BY inspection_time DESC, created_at DESC, id DESC LIMIT 1), false)
                """, trip.getShipmentId(), trip.getVehicleId(), driverId)) {
            throw new AppException(ErrorCode.PRE_TRIP_INSPECTION_FAILED, "Cần biên bản Pre-trip đạt trong 24 giờ của đúng vận đơn, xe và tài xế");
        }
        if (exists("""
                SELECT EXISTS (SELECT 1 FROM container c WHERE c.assigned_shipment_id = ? AND NOT c.is_deleted
                  AND (c.assigned_vehicle_id IS DISTINCT FROM ? OR c.assigned_driver_id IS DISTINCT FROM ?
                    OR NOT EXISTS (SELECT 1 FROM container_control_round r JOIN container_control_stage s ON s.round_id = r.id
                      WHERE r.container_code = c.container_code AND r.completed_at IS NULL AND s.stage = 'DEPARTURE')))
                """, trip.getShipmentId(), trip.getVehicleId(), driverId)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Cần Dispatcher xác nhận bước xuất bến của container");
        }
        // Serialize departure with container inspection writes (same container row lock).
        jdbc.query("SELECT id FROM container WHERE assigned_shipment_id = ? AND NOT is_deleted ORDER BY id FOR UPDATE",
            (row, index) -> row.getObject(1, UUID.class), trip.getShipmentId());
        if (exists("""
                SELECT EXISTS (SELECT 1 FROM container c WHERE c.assigned_shipment_id = ? AND NOT c.is_deleted
                  AND NOT EXISTS (SELECT 1 FROM container_control_round r
                    WHERE r.container_code = c.container_code AND r.completed_at IS NULL
                      AND COALESCE((SELECT i.status = 'PASSED' AND i.container_type = c.container_type
                            AND i.template_version = '1.0'
                            AND i.inspected_at >= now() - interval '24 hours'
                        FROM container_safety_inspection i WHERE i.container_id = c.id
                        ORDER BY i.inspection_number DESC LIMIT 1), false)))
                """, trip.getShipmentId())) {
            throw new AppException(ErrorCode.PRE_TRIP_INSPECTION_FAILED,
                "Container chưa có hồ sơ kiểm tra an toàn đạt trong 24 giờ của đúng loại; cần điều phối rà soát lại");
        }
        if (jdbc.update("UPDATE vehicle SET status = 'IN_TRANSIT', updated_at = now() WHERE id = ? AND status = 'ASSIGNED' AND NOT is_deleted", trip.getVehicleId()) != 1
                || jdbc.update("""
                   UPDATE driver SET status = 'ON_TRIP', total_trips = coalesce(total_trips, 0) + 1, updated_at = now()
                    WHERE id = ? AND status = 'ASSIGNED' AND NOT is_deleted
                   """, driverId) != 1) {
            throw new AppException(ErrorCode.DRIVER_NOT_AVAILABLE, "Xe hoặc tài xế không còn được giữ chỗ");
        }
        jdbc.update("""
                UPDATE container SET status = 'IN_TRANSIT', updated_at = now() WHERE assigned_shipment_id = ?
                    AND assigned_vehicle_id = ? AND assigned_driver_id = ? AND NOT is_deleted AND status = 'ASSIGNED'
                """, trip.getShipmentId(), trip.getVehicleId(), driverId);
        return tracking.startTrip(tripId);
    }

    private boolean exists(String sql, Object... arguments) {
        return Boolean.TRUE.equals(jdbc.queryForObject(sql, Boolean.class, arguments));
    }
}
