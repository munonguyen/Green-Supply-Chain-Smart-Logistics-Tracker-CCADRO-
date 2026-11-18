package com.ccadro.tracking.service;

import com.ccadro.tracking.dto.response.LiveFleetTelemetryResponse;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Luồng phát Telemetry GPS đội xe thời gian thực qua Server-Sent Events (SSE)
 * trên `/api/v1/tracking/stream`.
 */
@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FleetTelemetryStreamService {

    CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @NonFinal
    @Value("${ccadro.tracking.sseTimeoutMs:1800000}")
    long sseTimeoutMs = 1800000L;

    public SseEmitter subscribe(List<LiveFleetTelemetryResponse> initialSnapshot) {
        SseEmitter emitter = new SseEmitter(sseTimeoutMs);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(ex -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("fleet-snapshot")
                    .data(initialSnapshot));
        } catch (IOException ex) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    public void broadcastUpdate(LiveFleetTelemetryResponse telemetry) {
        if (telemetry == null) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("fleet-telemetry-update")
                        .data(telemetry));
            } catch (IOException ex) {
                emitters.remove(emitter);
            }
        }
    }

    public int getActiveSubscriberCount() {
        return emitters.size();
    }
}

