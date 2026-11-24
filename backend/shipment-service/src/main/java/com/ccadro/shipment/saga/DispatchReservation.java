package com.ccadro.shipment.saga;

import com.ccadro.shipment.entity.Shipment;
import com.ccadro.shipment.exception.AppException;
import com.ccadro.shipment.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/** Holds the vehicle and driver rows in the same PostgreSQL transaction as the dispatch order. */
@Component
@RequiredArgsConstructor
public class DispatchReservation {
    private final JdbcTemplate jdbc;

    UUID reserve(Shipment shipment, UUID vehicleId, UUID driverId) {
        UUID shipmentId = shipment.getId();
        UUID containerId = jdbc.queryForObject("SELECT container_id FROM shipment WHERE id = ?", UUID.class, shipmentId);
        var pinned = jdbc.query("""
                SELECT assigned_vehicle_id, assigned_driver_id, assigned_shipment_id, id FROM container
                 WHERE NOT is_deleted AND status = 'ASSIGNED'
                   AND (assigned_shipment_id = ? OR id = ?)
                   FOR NO KEY UPDATE
                """, (row, index) -> new PinnedContainer(row.getObject(4, UUID.class), vehicleId.equals(row.getObject(1, UUID.class))
                        && driverId.equals(row.getObject(2, UUID.class)) && shipmentId.equals(row.getObject(3, UUID.class))), shipmentId, containerId);
        if (pinned.size() > 1 || pinned.stream().anyMatch(entry -> !entry.matches())
                || (containerId != null && pinned.stream().anyMatch(entry -> !containerId.equals(entry.id())))) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Xe và tài xế phải khớp phân công trên container");
        }
        if (containerId != null && pinned.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Cần phân công container trước khi tạo lệnh");
        }

        var vehicles = jdbc.query("""
                SELECT status, max_payload_tons FROM vehicle WHERE id = ? AND NOT is_deleted FOR NO KEY UPDATE
                """, (row, index) -> new VehicleCapacity(row.getString(1), row.getBigDecimal(2)), vehicleId);
        if (vehicles.isEmpty()) throw new AppException(ErrorCode.VEHICLE_NOT_FOUND);
        var vehicle = vehicles.get(0);
        String expected = pinned.isEmpty() ? "AVAILABLE" : "ASSIGNED";
        if (!expected.equals(vehicle.status())) throw new AppException(ErrorCode.VEHICLE_MAINTENANCE_REQUIRED);
        if (vehicle.payload() == null || shipment.getCargoWeightTons() == null
                || shipment.getCargoWeightTons().compareTo(vehicle.payload()) > 0) {
            throw new AppException(ErrorCode.INVALID_CARGO_WEIGHT, "Thiếu tải trọng hoặc hàng vượt tải trọng xe");
        }

        var drivers = jdbc.query("""
                SELECT status FROM driver WHERE id = ? AND NOT is_deleted FOR NO KEY UPDATE
                """, (row, index) -> row.getString(1), driverId);
        if (drivers.isEmpty()) throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        if (!expected.equals(drivers.get(0))) throw new AppException(ErrorCode.DRIVER_NOT_AVAILABLE);
        var issues = jdbc.query("""
                SELECT qualification_issue FROM driver_dispatch_qualification WHERE driver_id = ?
                """, (row, index) -> row.getString(1), driverId);
        if (issues.size() != 1 || issues.get(0) != null) {
            throw new AppException(ErrorCode.DRIVER_LICENSE_INVALID,
                    issues.size() == 1 ? issues.get(0) : "Không xác minh được hồ sơ tài xế");
        }
        if (pinned.isEmpty()) {
            jdbc.update("UPDATE vehicle SET status = 'ASSIGNED', updated_at = now() WHERE id = ?", vehicleId);
            jdbc.update("UPDATE driver SET status = 'ASSIGNED', updated_at = now() WHERE id = ?", driverId);
        }
        return pinned.isEmpty() ? null : pinned.get(0).id();
    }

    private record PinnedContainer(UUID id, boolean matches) {}
    private record VehicleCapacity(String status, BigDecimal payload) {}
}
