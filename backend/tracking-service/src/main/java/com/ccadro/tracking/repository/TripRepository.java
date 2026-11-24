package com.ccadro.tracking.repository;

import com.ccadro.tracking.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripRepository extends JpaRepository<Trip, UUID> {
    @Query(value="SELECT * FROM trip WHERE id=:id FOR NO KEY UPDATE",nativeQuery=true)
    Optional<Trip> findForDeviceTelemetry(@Param("id") UUID id);
    Optional<Trip> findByTripCode(String tripCode);
    Optional<Trip> findByShipmentId(UUID shipmentId);
    List<Trip> findByDriverId(UUID driverId);

    @Query(value = """
            SELECT
                t.id, t.trip_code, t.status, t.actual_distance_meters,
                t.shipment_id, t.vehicle_id, t.driver_id,
                s.shipment_code, s.customer_id,
                s.origin_name, ST_Y(s.origin_geom) AS origin_lat, ST_X(s.origin_geom) AS origin_lon,
                s.destination_name, ST_Y(s.destination_geom) AS dest_lat, ST_X(s.destination_geom) AS dest_lon,
                s.cargo_weight_tons,
                v.vehicle_code, v.plate_number, v.fuel_type, v.euro_standard,
                d.full_name AS driver_name,
                rv.total_distance_meters,
                ST_Y(te.location_geom) AS te_lat, ST_X(te.location_geom) AS te_lon,
                te.speed_kmh, te.heading_degrees, te.distance_from_route_meters, te.battery_percentage, te.timestamp,
                c.container_code, c.supply_air_temp_c, c.last_latitude, c.last_longitude,
                c.last_location_name, c.c_speed, c.progress_pct, c.eta_minutes, c.battery_pct,
                t.arrived_at, t.arrival_status, ST_AsGeoJSON(rv.route_geometry) AS route_geojson,
                COALESCE(c.last_position_observed_at, c.last_position_received_at) AS position_timestamp, c.id AS container_id,
                rv.routing_metadata_json
            FROM trip t
            LEFT JOIN vehicle v ON v.id = t.vehicle_id
            LEFT JOIN driver d ON d.id = t.driver_id
            LEFT JOIN shipment s ON s.id = t.shipment_id
            LEFT JOIN route_version rv ON rv.id = COALESCE(
                t.active_route_version_id,
                (SELECT rv2.id FROM route_version rv2
                 WHERE rv2.shipment_id = t.shipment_id AND rv2.is_active = true
                 ORDER BY rv2.version_number DESC LIMIT 1)
            )
            LEFT JOIN LATERAL (
                SELECT te1.location_geom, te1.speed_kmh, te1.heading_degrees,
                       te1.distance_from_route_meters, te1.battery_percentage, te1.timestamp
                FROM telemetry_event te1
                WHERE te1.trip_id = t.id AND te1.quality_passed = true
                ORDER BY te1.timestamp DESC
                LIMIT 1
            ) te ON true
            LEFT JOIN LATERAL (
                SELECT c1.id, c1.last_position_received_at, c1.last_position_observed_at, c1.container_code, c1.supply_air_temp_c, c1.last_latitude, c1.last_longitude,
                       c1.last_location_name, c1.speed_kmh AS c_speed, c1.progress_pct,
                       c1.eta_minutes, c1.battery_pct
                FROM container c1
                WHERE COALESCE(c1.is_deleted, false) = false
                  AND (c1.assigned_shipment_id = t.shipment_id
                       OR (c1.assigned_shipment_code IS NOT NULL AND c1.assigned_shipment_code = s.shipment_code))
                ORDER BY c1.updated_at DESC
                LIMIT 1
            ) c ON true
            WHERE COALESCE(t.is_deleted, false) = false
              AND t.status IN ('SCHEDULED', 'EN_ROUTE', 'DELAYED', 'IN_TRANSIT')
            ORDER BY t.updated_at DESC
            """, nativeQuery = true)
    List<Object[]> findLiveFleetTelemetryRows();

    @Query(value = """
            SELECT
                t.id, t.trip_code, t.status, t.actual_distance_meters,
                t.shipment_id, t.vehicle_id, t.driver_id,
                s.shipment_code, s.customer_id,
                s.origin_name, ST_Y(s.origin_geom) AS origin_lat, ST_X(s.origin_geom) AS origin_lon,
                s.destination_name, ST_Y(s.destination_geom) AS dest_lat, ST_X(s.destination_geom) AS dest_lon,
                s.cargo_weight_tons,
                v.vehicle_code, v.plate_number, v.fuel_type, v.euro_standard,
                d.full_name AS driver_name,
                rv.total_distance_meters,
                ST_Y(te.location_geom) AS te_lat, ST_X(te.location_geom) AS te_lon,
                te.speed_kmh, te.heading_degrees, te.distance_from_route_meters, te.battery_percentage, te.timestamp,
                c.container_code, c.supply_air_temp_c, c.last_latitude, c.last_longitude,
                c.last_location_name, c.c_speed, c.progress_pct, c.eta_minutes, c.battery_pct,
                t.arrived_at, t.arrival_status, ST_AsGeoJSON(rv.route_geometry) AS route_geojson,
                COALESCE(c.last_position_observed_at, c.last_position_received_at) AS position_timestamp, c.id AS container_id,
                rv.routing_metadata_json
            FROM trip t
            LEFT JOIN vehicle v ON v.id = t.vehicle_id
            LEFT JOIN driver d ON d.id = t.driver_id
            LEFT JOIN shipment s ON s.id = t.shipment_id
            LEFT JOIN route_version rv ON rv.id = COALESCE(
                t.active_route_version_id,
                (SELECT rv2.id FROM route_version rv2
                 WHERE rv2.shipment_id = t.shipment_id AND rv2.is_active = true
                 ORDER BY rv2.version_number DESC LIMIT 1)
            )
            LEFT JOIN LATERAL (
                SELECT te1.location_geom, te1.speed_kmh, te1.heading_degrees,
                       te1.distance_from_route_meters, te1.battery_percentage, te1.timestamp
                FROM telemetry_event te1
                WHERE te1.trip_id = t.id AND te1.quality_passed = true
                ORDER BY te1.timestamp DESC
                LIMIT 1
            ) te ON true
            LEFT JOIN LATERAL (
                SELECT c1.id, c1.last_position_received_at, c1.last_position_observed_at, c1.container_code, c1.supply_air_temp_c, c1.last_latitude, c1.last_longitude,
                       c1.last_location_name, c1.speed_kmh AS c_speed, c1.progress_pct,
                       c1.eta_minutes, c1.battery_pct
                FROM container c1
                WHERE COALESCE(c1.is_deleted, false) = false
                  AND (c1.assigned_shipment_id = t.shipment_id
                       OR (c1.assigned_shipment_code IS NOT NULL AND c1.assigned_shipment_code = s.shipment_code))
                ORDER BY c1.updated_at DESC
                LIMIT 1
            ) c ON true
            WHERE t.id = :tripId
              AND COALESCE(t.is_deleted, false) = false
            LIMIT 1
            """, nativeQuery = true)
    List<Object[]> findLiveTripTelemetryRowByTripId(@Param("tripId") UUID tripId);

    @Query(value = """
            SELECT
                c.id, c.container_code, c.status, c.assigned_shipment_id, c.assigned_shipment_code,
                c.assigned_vehicle_id, c.vehicle_license_plate, c.vehicle_type_label,
                c.assigned_driver_id, c.driver_name,
                c.origin_name, c.destination_name,
                c.last_latitude, c.last_longitude, c.last_location_name,
                c.speed_kmh, c.progress_pct, c.eta_minutes,
                c.supply_air_temp_c, c.battery_pct, COALESCE(c.last_position_observed_at, c.last_position_received_at),
                ST_Y(s.origin_geom) AS origin_lat, ST_X(s.origin_geom) AS origin_lon,
                ST_Y(s.destination_geom) AS dest_lat, ST_X(s.destination_geom) AS dest_lon,
                t.id AS linked_trip_id, t.arrived_at, ST_AsGeoJSON(rv.route_geometry) AS route_geojson,
                rv.routing_metadata_json
            FROM container c
            LEFT JOIN LATERAL (
                SELECT s1.id, s1.origin_geom, s1.destination_geom
                FROM shipment s1
                WHERE COALESCE(s1.is_deleted, false) = false
                  AND (s1.id = c.assigned_shipment_id
                       OR (c.assigned_shipment_code IS NOT NULL AND s1.shipment_code = c.assigned_shipment_code))
                LIMIT 1
            ) s ON true
            LEFT JOIN LATERAL (
                SELECT t1.id, t1.arrived_at, t1.active_route_version_id
                FROM trip t1
                WHERE COALESCE(t1.is_deleted, false) = false
                  AND s.id IS NOT NULL
                  AND t1.shipment_id = s.id
                ORDER BY t1.updated_at DESC
                LIMIT 1
            ) t ON true
            LEFT JOIN route_version rv ON rv.id = COALESCE(
                t.active_route_version_id,
                (SELECT rv2.id FROM route_version rv2
                 WHERE s.id IS NOT NULL AND rv2.shipment_id = s.id AND rv2.is_active = true
                 ORDER BY rv2.version_number DESC LIMIT 1)
            )
            WHERE COALESCE(c.is_deleted, false) = false
              AND c.status = 'IN_TRANSIT'
              AND c.last_latitude IS NOT NULL
              AND c.last_longitude IS NOT NULL
            ORDER BY c.updated_at DESC
            """, nativeQuery = true)
    List<Object[]> findActiveContainerTelemetryRows();

    @Query(value = """
            SELECT
                ST_Y(s.destination_geom) AS dest_lat,
                ST_X(s.destination_geom) AS dest_lon,
                ST_Y(s.origin_geom) AS origin_lat,
                ST_X(s.origin_geom) AS origin_lon
            FROM trip t
            JOIN shipment s ON s.id = t.shipment_id
            WHERE t.id = :tripId
              AND s.destination_geom IS NOT NULL
            LIMIT 1
            """, nativeQuery = true)
    List<Object[]> findDestinationCoordinatesByTripId(@Param("tripId") UUID tripId);

    @Query(value = """
            SELECT ST_Distance(
                rv.route_geometry::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            )
            FROM trip t
            JOIN route_version rv ON rv.id = COALESCE(
                t.active_route_version_id,
                (SELECT rv2.id FROM route_version rv2
                 WHERE rv2.shipment_id = t.shipment_id AND rv2.is_active = true
                 ORDER BY rv2.version_number DESC LIMIT 1)
            )
            WHERE t.id = :tripId
              AND rv.route_geometry IS NOT NULL
            LIMIT 1
            """, nativeQuery = true)
    Optional<Double> findDistanceToActiveRouteMeters(
            @Param("tripId") UUID tripId,
            @Param("lat") double lat,
            @Param("lng") double lng);

    @Query(value = """
            SELECT rv.total_distance_meters
            FROM trip t
            JOIN route_version rv ON rv.id = COALESCE(
                t.active_route_version_id,
                (SELECT rv2.id FROM route_version rv2
                 WHERE rv2.shipment_id = t.shipment_id AND rv2.is_active = true
                 ORDER BY rv2.version_number DESC LIMIT 1)
            )
            WHERE t.id = :tripId
            LIMIT 1
            """, nativeQuery = true)
    Optional<Double> findActiveRouteDistanceMeters(@Param("tripId") UUID tripId);

    @Query(value = """
        SELECT ST_Length(ST_LineSubstring(rv.route_geometry,
            ST_LineLocatePoint(rv.route_geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)), 1)::geography)
        FROM trip t JOIN route_version rv ON rv.id = COALESCE(t.active_route_version_id,
            (SELECT rv2.id FROM route_version rv2 WHERE rv2.shipment_id=t.shipment_id AND rv2.is_active=true
             ORDER BY rv2.version_number DESC LIMIT 1))
        WHERE t.id=:tripId AND rv.route_geometry IS NOT NULL LIMIT 1
        """, nativeQuery = true)
    Optional<Double> findRemainingRouteDistanceMeters(@Param("tripId") UUID tripId, @Param("lat") double latitude,
        @Param("lng") double longitude);
}
