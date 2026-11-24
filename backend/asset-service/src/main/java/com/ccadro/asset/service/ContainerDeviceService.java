package com.ccadro.asset.service;

import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.dto.request.ContainerTelemetryUpdateRequest;
import com.ccadro.asset.repository.ContainerRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ContainerDeviceService {
    private final JdbcTemplate jdbc;
    private final ContainerRepository containers;
    private final ContainerService containerService;
    private final ObjectMapper json;

    public record Configure(
        @NotBlank @Size(max=100) @Pattern(regexp="[a-zA-Z0-9_.:-]+") String deviceId,
        @NotBlank @Size(max=100) String label,
        @NotBlank @Size(max=500) String reason) {}
    public record Packet(
        @NotNull UUID eventId, @NotNull Instant observedAt,
        @NotNull @DecimalMin("-90") @DecimalMax("90") java.math.BigDecimal latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") java.math.BigDecimal longitude,
        @NotNull @DecimalMin("0") @DecimalMax("150") java.math.BigDecimal speedKmh,
        java.math.BigDecimal supplyAirTempC,
        java.math.BigDecimal returnAirTempC,
        java.math.BigDecimal reeferSetPointTempC,
        @Size(max = 50) String reeferTemperatureAlarmStatus,
        @DecimalMin("0") @DecimalMax("100") java.math.BigDecimal humidityPct,
        @DecimalMin("0") @DecimalMax("50") java.math.BigDecimal shockG,
        @Min(0) @Max(100) Integer batteryPct,
        @Size(max = 40) String eSealStatus,
        @Min(0) @Max(100) Integer eSealIntegrityPct) {
        public Packet(UUID eventId, Instant observedAt, java.math.BigDecimal latitude,
                      java.math.BigDecimal longitude, java.math.BigDecimal speedKmh) {
            this(eventId, observedAt, latitude, longitude, speedKmh, null, null, null, null, null, null, null, null, null);
        }
    }
    public record Connection(String deviceId, String label, boolean enabled, String configuredBy,
                             Instant configuredAt, Instant lastReceivedAt, Instant lastObservedAt) {}
    public record RouteLink(UUID tripId, UUID routeVersionId, String tripStatus) {}
    public record Forward(String status, Instant receivedAt, int attempts) {}
    public record State(Connection connection, RouteLink route, Forward latestPacket, String linkageIssue) {}
    public record Configured(State state, String deviceKey, String ingestPath) {}
    public record Receipt(UUID eventId, boolean duplicate, String trackingStatus) {}

    public State state(String code) {
        var container = containers.findByContainerCode(code).filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
            .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));
        var connections = jdbc.query("""
            SELECT * FROM container_device_connection WHERE container_code = ?
            """, (row, index) -> new Connection(row.getString("device_id"), row.getString("label"),
                row.getBoolean("enabled"), row.getString("configured_by"), instant(row.getTimestamp("configured_at")),
                instant(row.getTimestamp("last_received_at")), instant(row.getTimestamp("last_observed_at"))), code);
        RouteLink route = route(code);
        var forwards = jdbc.query("""
            SELECT forward_status, received_at, attempts FROM container_device_packet
            WHERE container_code = ? AND received_at >=
                (SELECT configured_at FROM container_device_connection WHERE container_code = ?)
                ORDER BY received_at DESC LIMIT 1
            """, (row,index) -> new Forward(row.getString(1),instant(row.getTimestamp(2)),row.getInt(3)),code,code);
        String issue = container.getAssignedShipmentId() == null ? "Chưa liên kết ID vận đơn; mã vận đơn hiển thị chưa đủ để gắn định tuyến."
            : container.getAssignedVehicleId() == null || container.getAssignedDriverId() == null ? "Chưa liên kết đủ xe và tài xế."
            : route == null ? "Chưa có chuyến EN_ROUTE/DELAYED với tuyến hiệu lực khớp phân công." : null;
        return new State(connections.isEmpty() ? null : connections.get(0),route,
            forwards.isEmpty() ? null : forwards.get(0),issue);
    }

    @Transactional
    public Configured configure(String code, Configure request, String actor) {
        var container = containers.findForControlUpdate(code)
            .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));
        if (Boolean.TRUE.equals(container.getIsDeleted())) throw new AppException(ErrorCode.CONTAINER_NOT_FOUND);
        if (Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM container_device_connection WHERE device_id = ? AND container_code <> ?)
            """,Boolean.class,request.deviceId(),code))) {
            throw bad("Mã thiết bị đã được gắn cho container khác.");
        }
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        String key = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        jdbc.update("""
            INSERT INTO container_device_connection(container_code,device_id,label,key_hash,configured_by)
            VALUES (?,?,?,?,?)
            ON CONFLICT(container_code) DO UPDATE SET device_id=excluded.device_id,label=excluded.label,
              key_hash=excluded.key_hash,enabled=true,configured_by=excluded.configured_by,
              configured_at=now(),last_received_at=null,last_observed_at=null
            """,code,request.deviceId(),request.label().trim(),hash(key),actor);
        jdbc.update("""
            INSERT INTO container_dispatch_note(container_code,category,content,created_by)
            VALUES (?,'DEVICE',?,?)
            """,code,"Cấu hình thiết bị " + request.deviceId() + ". Lý do: " + request.reason().trim(),actor);
        return new Configured(state(code),key,"/api/v1/assets/device-ingest/" + request.deviceId());
    }

    public record LinkTrip(@NotNull UUID tripId, @NotBlank @Size(max=500) String reason) {}

    @Transactional
    public State linkTrip(String code, LinkTrip request, String actor) {
        var container=containers.findForControlUpdate(code).filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
            .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));
        if(!"IN_TRANSIT".equals(container.getStatus().name())) {
            throw bad("Chỉ đối soát liên kết cho container đang vận chuyển. Chuyến mới cần dùng bước Phân công.");
        }
        var trips=jdbc.queryForList("""
            SELECT t.shipment_id,t.vehicle_id,t.driver_id,s.container_id,s.shipment_code,s.origin_name,s.destination_name,
                   v.plate_number,d.full_name,d.phone
            FROM trip t JOIN shipment s ON s.id=t.shipment_id JOIN vehicle v ON v.id=t.vehicle_id
              JOIN driver d ON d.id=t.driver_id
              JOIN route_version r ON r.id=t.active_route_version_id AND r.shipment_id=t.shipment_id AND r.is_active
            WHERE t.id=? AND NOT t.is_deleted AND NOT s.is_deleted AND NOT v.is_deleted AND NOT d.is_deleted
              AND t.status IN ('EN_ROUTE','DELAYED') AND v.status='IN_TRANSIT' AND d.status='ON_TRIP'
              AND r.route_geometry IS NOT NULL
            FOR NO KEY UPDATE OF t
            """,request.tripId());
        if(trips.size()!=1) throw bad("Chưa có chuyến đang chạy với xe, tài xế và tuyến hiệu lực hợp lệ.");
        var trip=trips.get(0);
        String assignedCode=container.getAssignedShipmentCode();
        if ((container.getAssignedShipmentId()==null && assignedCode!=null && !assignedCode.isBlank()
                && !assignedCode.trim().equalsIgnoreCase((String)trip.get("shipment_code")))
            || (trip.get("container_id")!=null && !trip.get("container_id").equals(container.getId()))) {
            throw bad("Chuyến không khớp vận đơn hoặc vận đơn đã gắn với container khác.");
        }
        if((container.getAssignedShipmentId()!=null && !container.getAssignedShipmentId().equals(trip.get("shipment_id")))
            || (container.getAssignedVehicleId()!=null && !container.getAssignedVehicleId().equals(trip.get("vehicle_id")))
            || (container.getAssignedDriverId()!=null && !container.getAssignedDriverId().equals(trip.get("driver_id")))) {
            throw bad("Chuyến không khớp ID đã phân công. Cần xử lý đổi phân công theo nghiệp vụ trước khi liên kết.");
        }
        if(Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM container WHERE container_code<>? AND NOT is_deleted
                AND status IN ('ASSIGNED','IN_TRANSIT') AND assigned_shipment_id=?
                AND assigned_vehicle_id=? AND assigned_driver_id=?)
            """,Boolean.class,code,trip.get("shipment_id"),trip.get("vehicle_id"),trip.get("driver_id")))) {
            throw bad("Chuyến đã gắn với container đang hoạt động khác.");
        }
        container.setAssignedShipmentId((UUID)trip.get("shipment_id"));
        container.setAssignedShipmentCode((String)trip.get("shipment_code"));
        container.setAssignedVehicleId((UUID)trip.get("vehicle_id"));
        container.setVehicleLicensePlate((String)trip.get("plate_number"));
        container.setAssignedDriverId((UUID)trip.get("driver_id"));
        container.setDriverName((String)trip.get("full_name"));
        container.setDriverPhone((String)trip.get("phone"));
        container.setOriginName((String)trip.get("origin_name"));
        container.setDestinationName((String)trip.get("destination_name"));
        containers.saveAndFlush(container);
        jdbc.update("""
            INSERT INTO container_dispatch_note(container_code,category,content,created_by)
            VALUES (?,'OPERATIONS',?,?)
            """,code,"Đối soát ID chuyến " + request.tripId() + ". Lý do: " + request.reason().trim(),actor);
        return state(code);
    }

    @Transactional
    public State disable(String code, String actor) {
        jdbc.update("UPDATE container_device_connection SET enabled=false WHERE container_code=?",code);
        jdbc.update("""
            INSERT INTO container_dispatch_note(container_code,category,content,created_by)
            VALUES (?,'DEVICE','Đã thu hồi khóa nhận dữ liệu thiết bị',?)
            """,code,actor);
        return state(code);
    }

    @Transactional
    public Receipt receive(String deviceId, String key, Packet packet) {
        // Same lock order as dispatch/profile: container first, device configuration second.
        var codes = jdbc.query("SELECT container_code FROM container_device_connection WHERE device_id=?",
            (row,index)->row.getString(1),deviceId);
        if (codes.size()!=1 || key==null || key.length()>128) throw unauthenticated();
        var container = containers.findForControlUpdate(codes.get(0))
            .orElseThrow(this::unauthenticated);
        var credentials = jdbc.query("""
            SELECT key_hash FROM container_device_connection WHERE device_id=? AND container_code=? AND enabled FOR UPDATE
            """,(row,index)->row.getString(1),deviceId,container.getContainerCode());
        if (credentials.size()!=1 || !MessageDigest.isEqual(hash(key).getBytes(StandardCharsets.UTF_8),
                credentials.get(0).getBytes(StandardCharsets.UTF_8)) || Boolean.TRUE.equals(container.getIsDeleted())) {
            throw unauthenticated();
        }
        String code=container.getContainerCode();
        var existing = jdbc.query("""
            SELECT container_code,device_id,payload::text,forward_status FROM container_device_packet WHERE event_id=?
            """,(row,index)->Map.of("code",row.getString(1),"device",row.getString(2),"payload",row.getString(3),"status",row.getString(4)),packet.eventId());
        String payload;
        try { payload=json.writeValueAsString(packet); } catch(Exception error) { throw bad("Gói tin không hợp lệ."); }
        if(!existing.isEmpty()) {
            var old=existing.get(0);
            try {
                if(!old.get("code").equals(code) || !old.get("device").equals(deviceId)
                    || !json.readTree(old.get("payload")).equals(json.readTree(payload))) {
                    throw bad("eventId đã dùng cho dữ liệu khác.");
                }
            } catch(com.fasterxml.jackson.core.JsonProcessingException error) { throw bad("Không đọc được gói tin cũ."); }
            return new Receipt(packet.eventId(),true,old.get("status"));
        }
        Instant now=Instant.now();
        if(packet.observedAt().isBefore(now.minusSeconds(600)) || packet.observedAt().isAfter(now.plusSeconds(30))) {
            throw bad("Thời điểm GPS phải trong 10 phút gần nhất và không vượt quá 30 giây tương lai.");
        }
        var previous=jdbc.query("SELECT last_observed_at FROM container_device_connection WHERE container_code=?",
            (row,index)->Optional.ofNullable(instant(row.getTimestamp(1))),code);
        if(!previous.isEmpty() && previous.get(0).isPresent() && !packet.observedAt().isAfter(previous.get(0).get())) {
            throw bad("Gói tin GPS cũ hoặc trùng thời điểm. Dùng lại eventId cũ khi gửi lại.");
        }
        RouteLink route=route(code);
        String status=route==null?"CONTAINER_ONLY":"PENDING";
        jdbc.update("""
            INSERT INTO container_device_packet(event_id,container_code,device_id,observed_at,trip_id,vehicle_id,payload,forward_status)
            VALUES (?,?,?,?,?,?,?::jsonb,?)
            """,packet.eventId(),code,deviceId,java.sql.Timestamp.from(packet.observedAt()),
            route==null?null:route.tripId(),route==null?null:container.getAssignedVehicleId(),payload,status);
        containerService.updateTelemetry(code, ContainerTelemetryUpdateRequest.builder()
            .lastLatitude(packet.latitude())
            .lastLongitude(packet.longitude())
            .speedKmh(packet.speedKmh())
            .supplyAirTempC(packet.supplyAirTempC())
            .returnAirTempC(packet.returnAirTempC())
            .reeferSetPointTempC(packet.reeferSetPointTempC())
            .reeferTemperatureAlarmStatus(packet.reeferTemperatureAlarmStatus())
            .humidityPct(packet.humidityPct())
            .shockG(packet.shockG())
            .batteryPct(packet.batteryPct())
            .eSealStatus(packet.eSealStatus())
            .eSealIntegrityPct(packet.eSealIntegrityPct())
            .build(), packet.observedAt());
        jdbc.update("""
            UPDATE container_device_connection SET last_received_at=now(),last_observed_at=? WHERE container_code=?
            """,java.sql.Timestamp.from(packet.observedAt()),code);
        return new Receipt(packet.eventId(),false,status);
    }

    private RouteLink route(String code) {
        var links=jdbc.query("""
            SELECT t.id,t.active_route_version_id,t.status FROM trip t
            JOIN container c ON c.assigned_shipment_id=t.shipment_id AND c.assigned_vehicle_id=t.vehicle_id
                AND c.assigned_driver_id=t.driver_id
            JOIN route_version r ON r.id=t.active_route_version_id AND r.shipment_id=t.shipment_id AND r.is_active
            WHERE c.container_code=? AND NOT t.is_deleted AND t.status IN ('EN_ROUTE','DELAYED')
                AND r.route_geometry IS NOT NULL
            ORDER BY t.created_at DESC LIMIT 2
            """,(row,index)->new RouteLink(row.getObject(1,UUID.class),row.getObject(2,UUID.class),row.getString(3)),code);
        return links.size()==1?links.get(0):null;
    }

    private Instant instant(java.sql.Timestamp timestamp) { return timestamp==null?null:timestamp.toInstant(); }
    private String hash(String key) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private AppException bad(String message) { return new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,message); }
    private AppException unauthenticated() { return new AppException(ErrorCode.UNAUTHENTICATED); }
}
