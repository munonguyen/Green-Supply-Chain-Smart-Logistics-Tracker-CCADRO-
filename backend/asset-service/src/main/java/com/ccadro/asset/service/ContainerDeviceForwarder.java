package com.ccadro.asset.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import java.util.*;

@Component
public class ContainerDeviceForwarder {
    @Configuration
    @EnableScheduling
    static class Scheduling {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final RestClient tracking;
    private final ObjectMapper json;
    public ContainerDeviceForwarder(JdbcTemplate jdbc, PlatformTransactionManager manager, ObjectMapper json,
            @Value("${services.tracking.url:http://127.0.0.1:8084}") String trackingUrl) {
        this.jdbc=jdbc; this.json=json; this.transaction=new TransactionTemplate(manager);
        var factory=new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(1000); factory.setReadTimeout(3000);
        this.tracking=RestClient.builder().baseUrl(trackingUrl).requestFactory(factory).build();
    }

    @Scheduled(fixedDelayString="${ccadro.device.forward-delay-ms:3000}")
    public void forward() {
        for(int index=0; index<5; index++) {
            Boolean found=transaction.execute(status -> next());
            if(!Boolean.TRUE.equals(found)) break;
        }
    }

    private Boolean next() {
        var packets=jdbc.queryForList("""
            SELECT p.* FROM container_device_packet p WHERE p.forward_status IN ('PENDING','RETRYING')
             AND (p.last_attempt_at IS NULL OR p.last_attempt_at < now() - interval '10 seconds')
             AND NOT EXISTS (SELECT 1 FROM container_device_packet previous
                 WHERE previous.container_code=p.container_code AND previous.trip_id=p.trip_id
                   AND previous.forward_status IN ('PENDING','RETRYING')
                   AND (previous.received_at,previous.event_id) < (p.received_at,p.event_id))
             ORDER BY p.received_at,p.event_id LIMIT 1 FOR UPDATE OF p SKIP LOCKED
            """);
        if(packets.isEmpty()) return false;
        var packet=packets.get(0);
        Object id=packet.get("event_id");
        boolean eligible=Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM trip t JOIN container c ON c.assigned_shipment_id=t.shipment_id
                AND c.assigned_vehicle_id=t.vehicle_id AND c.assigned_driver_id=t.driver_id
                JOIN container_device_connection d ON d.container_code=c.container_code
             WHERE t.id=? AND t.vehicle_id=? AND NOT t.is_deleted AND t.status IN ('EN_ROUTE','DELAYED')
                AND c.container_code=? AND NOT c.is_deleted AND d.device_id=? AND d.enabled
                AND d.configured_at <= ?::timestamptz
                AND ?::timestamptz >= now() - interval '10 minutes')
            """,Boolean.class,packet.get("trip_id"),packet.get("vehicle_id"),packet.get("container_code"),
                packet.get("device_id"),packet.get("received_at"),packet.get("observed_at")));
        if(!eligible) {
            jdbc.update("UPDATE container_device_packet SET forward_status='OUTDATED',last_attempt_at=now() WHERE event_id=?",id);
            return true;
        }
        int attempts=((Number)packet.get("attempts")).intValue()+1;
        try {
            var source=json.readTree(packet.get("payload").toString());
            Map<String,Object> body=new LinkedHashMap<>();
            body.put("externalEventId",id);
            body.put("tripId",packet.get("trip_id")); body.put("vehicleId",packet.get("vehicle_id"));
            body.put("timestamp",source.get("observedAt").asText());
            body.put("latitude",source.get("latitude").decimalValue());
            body.put("longitude",source.get("longitude").decimalValue());
            body.put("speedKmh",source.get("speedKmh").decimalValue());
            body.put("rawPayload",json.writeValueAsString(Map.of("source","DEVICE_HTTP","deviceId",packet.get("device_id"))));
            Map<?,?> response=tracking.post().uri("/api/v1/tracking/telemetry").body(body).retrieve().body(Map.class);
            if(response==null || !Integer.valueOf(1000).equals(response.get("code"))) throw new IllegalStateException();
            jdbc.update("""
                UPDATE container_device_packet SET forward_status='SENT',attempts=?,last_attempt_at=now() WHERE event_id=?
                """,attempts,id);
        } catch(Exception error) {
            // Retry with the same externalEventId; Tracking deduplicates ambiguous responses.
            jdbc.update("""
                UPDATE container_device_packet SET forward_status=?,attempts=?,last_attempt_at=now() WHERE event_id=?
                """,attempts>=10?"FAILED":"RETRYING",attempts,id);
        }
        return true;
    }
}
