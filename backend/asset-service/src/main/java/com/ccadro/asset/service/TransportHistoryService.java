package com.ccadro.asset.service;

import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransportHistoryService {
    private static final int PAGE_SIZE = 20;
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper json;

    public record Item(String itemCode, String name, String category, BigDecimal weightKg, Integer parcelCount) {}
    public record Entry(UUID id, String tripCode, String shipmentCode, String containerCode,
                        String driverCode, String driverName, String plateNumber, String status,
                        String origin, String destination, Instant recordedAt, Instant departedAt, Instant arrivedAt,
                        BigDecimal declaredWeightTons, boolean manifestOnly, boolean cargoSnapshot, List<Item> items) {}
    public record History(List<Entry> entries, boolean hasMore, boolean linked) {}

    public History container(String code, int page, String query) {
        var ids = jdbc.query("""
            SELECT id FROM container WHERE container_code = :code
            """, Map.of("code", code), (row, index) -> row.getObject(1, UUID.class));
        if (ids.isEmpty()) throw new AppException(ErrorCode.CONTAINER_NOT_FOUND);
        return history("h.container_id", ids.get(0), page, query);
    }

    public History driver(UUID id, int page, String query) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM driver WHERE id = :id)",
                Map.of("id", id), Boolean.class))) {
            throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        }
        return history("h.driver_id", id, page, query);
    }

    public History staffDriver(UUID id, int page, String query) {
        var drivers = jdbc.query("""
            SELECT d.id FROM staff_profiles p JOIN driver d ON lower(d.account_username) = lower(p.username)
            WHERE p.id = :id AND p.role_code = 'DRIVER'
            """, Map.of("id", id), (row, index) -> row.getObject(1, UUID.class));
        if (drivers.size() != 1) return new History(List.of(), false, false);
        return history("h.driver_id", drivers.get(0), page, query);
    }

    private History history(String column, UUID id, int page, String query) {
        if (page < 0 || query.length() > 120) throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT);
        var rows = jdbc.query("""
            SELECT h.*, c.container_code, d.driver_code, d.full_name, v.plate_number,
                   COALESCE(h.cargo, m.cargo, '[]'::jsonb)::text AS items
            FROM transport_history h
            LEFT JOIN container c ON c.id = h.container_id
            LEFT JOIN driver d ON d.id = h.driver_id
            LEFT JOIN vehicle v ON v.id = h.vehicle_id
            LEFT JOIN LATERAL (
                SELECT jsonb_agg(jsonb_build_object('itemCode', item.item_code, 'name', item.cargo_name,
                    'category', item.cargo_category, 'weightKg', item.weight_kg, 'parcelCount', item.parcel_count)
                    ORDER BY item.item_code) AS cargo
                FROM container_cargo_manifest_item item
                WHERE item.container_code = c.container_code AND item.shipment_code IS NOT DISTINCT FROM h.shipment_code
                  AND NOT item.is_deleted
            ) m ON h.cargo IS NULL
            WHERE %s = :id
              AND (:query = '' OR strpos(lower(concat_ws(' ', h.trip_code, h.shipment_code, c.container_code,
                    d.driver_code, d.full_name, h.origin_name, h.destination_name, v.plate_number)), lower(:query)) > 0
                   OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(h.cargo, m.cargo, '[]'::jsonb)) AS item
                        WHERE strpos(lower(concat_ws(' ', item ->> 'name', item ->> 'itemCode')), lower(:query)) > 0))
            ORDER BY h.occurred_at DESC, h.record_id DESC
            LIMIT :limit OFFSET :offset
            """.formatted(column), Map.of("id", id, "limit", PAGE_SIZE + 1, "offset", (long) page * PAGE_SIZE,
                "query", query.trim()), (row, index) -> new Entry(
                    row.getObject("record_id", UUID.class), row.getString("trip_code"), row.getString("shipment_code"),
                    row.getString("container_code"), row.getString("driver_code"), row.getString("full_name"),
                    row.getString("plate_number"), row.getString("status"), row.getString("origin_name"),
                    row.getString("destination_name"), instant(row.getTimestamp("occurred_at")),
                    instant(row.getTimestamp("departed_at")), instant(row.getTimestamp("arrived_at")),
                    row.getBigDecimal("cargo_weight_tons"), row.getBoolean("manifest_only"), row.getString("cargo") != null,
                    items(row.getString("items"))));
        return new History(List.copyOf(rows.subList(0, Math.min(rows.size(), PAGE_SIZE))), rows.size() > PAGE_SIZE, true);
    }

    private List<Item> items(String value) {
        try {
            return json.readValue(value, new TypeReference<List<Item>>() {});
        } catch (com.fasterxml.jackson.core.JsonProcessingException error) {
            throw new IllegalStateException("Cannot read transport cargo history", error);
        }
    }

    private Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
