package com.ccadro.hubshipper.service;

import com.ccadro.hubshipper.dto.HubAuthContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Real-time SSE broadcaster for Hub-and-Spoke & Last-Mile Shipper operations.
 * Enforces strict Hub & Shipper RBAC scoping on every pushed event.
 */
@Component
@Slf4j
public class HubShipperRealtimeBroadcaster {

    private record Subscriber(
            String id,
            HubAuthContext auth,
            String requestedHubCode,
            SseEmitter emitter
    ) {}

    private final Map<String, Subscriber> subscribers = new ConcurrentHashMap<>();

    public SseEmitter subscribe(HubAuthContext auth, String requestedHubCode) {
        String subId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(0L);
        Subscriber sub = new Subscriber(subId, auth, requestedHubCode, emitter);
        subscribers.put(subId, sub);

        emitter.onCompletion(() -> subscribers.remove(subId));
        emitter.onTimeout(() -> subscribers.remove(subId));
        emitter.onError(ex -> subscribers.remove(subId));

        try {
            emitter.send(SseEmitter.event()
                    .name("hub-stream-connected")
                    .data(Map.of(
                            "subscriberId", subId,
                            "hubCode", auth.assignedHubCode() != null ? auth.assignedHubCode() : (requestedHubCode != null ? requestedHubCode : "ALL"),
                            "shipperCode", auth.assignedShipperCode() != null ? auth.assignedShipperCode() : "",
                            "connectedAt", Instant.now().toString()
                    ), MediaType.APPLICATION_JSON));
        } catch (IOException ex) {
            subscribers.remove(subId);
        }
        return emitter;
    }

    public void broadcastMutation(String hubCode, String shipperCode, String eventType, String referenceCode) {
        if (subscribers.isEmpty()) return;
        Map<String, Object> payload = Map.of(
                "eventType", eventType,
                "hubCode", hubCode != null ? hubCode : "",
                "shipperCode", shipperCode != null ? shipperCode : "",
                "referenceCode", referenceCode != null ? referenceCode : "",
                "occurredAt", Instant.now().toString()
        );

        subscribers.forEach((id, sub) -> {
            if (!canReceive(sub, hubCode, shipperCode)) return;
            try {
                sub.emitter().send(SseEmitter.event()
                        .name("hub-workspace-update")
                        .data(payload, MediaType.APPLICATION_JSON));
            } catch (Exception ex) {
                subscribers.remove(id);
            }
        });
    }

    @Scheduled(fixedRate = 20000)
    public void sendHeartbeat() {
        if (subscribers.isEmpty()) return;
        Map<String, String> ping = Map.of("ts", Instant.now().toString());
        subscribers.forEach((id, sub) -> {
            try {
                sub.emitter().send(SseEmitter.event()
                        .name("hub-heartbeat")
                        .data(ping, MediaType.APPLICATION_JSON));
            } catch (Exception ex) {
                subscribers.remove(id);
            }
        });
    }

    private boolean canReceive(Subscriber sub, String eventHubCode, String eventShipperCode) {
        HubAuthContext auth = sub.auth();
        if (auth == null || !auth.isAuthenticated()) return false;
        if (auth.isAdmin()) {
            return sub.requestedHubCode() == null || sub.requestedHubCode().isBlank()
                    || "ALL".equalsIgnoreCase(sub.requestedHubCode())
                    || sub.requestedHubCode().equalsIgnoreCase(eventHubCode);
        }
        if (auth.assignedHubCode() == null || !auth.assignedHubCode().equalsIgnoreCase(eventHubCode)) {
            return false;
        }
        if (auth.isShipperScoped() && auth.assignedShipperCode() != null && !auth.assignedShipperCode().isBlank()) {
            return eventShipperCode == null || eventShipperCode.isBlank()
                    || auth.assignedShipperCode().equalsIgnoreCase(eventShipperCode);
        }
        return true;
    }
}

