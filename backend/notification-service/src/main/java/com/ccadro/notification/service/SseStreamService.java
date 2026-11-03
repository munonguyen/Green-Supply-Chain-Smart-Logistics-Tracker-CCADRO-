package com.ccadro.notification.service;

import com.ccadro.notification.dto.response.EmergencyNotificationResponse;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Dịch vụ phát luồng SSE (Server-Sent Events) thời gian thực:
 * Quản lý vòng đời kết nối Emitter, dọn dẹp kết nối timeout/lỗi và broadcast thông báo khẩn cấp tới Dispatcher.
 */
@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SseStreamService {

    CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @NonFinal
    @Value("${ccadro.notification.sseTimeoutMs:1800000}")
    long sseTimeoutMs;

    public SseEmitter subscribeRealTimeStream() {
        SseEmitter emitter = new SseEmitter(sseTimeoutMs);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(ex -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("{\"status\":\"CONNECTED\",\"service\":\"notification-service\",\"port\":8087}"));
        } catch (IOException ex) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    public void broadcastEvent(String eventName, EmergencyNotificationResponse payload) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            } catch (IOException ex) {
                emitters.remove(emitter);
            }
        }
    }

    public int getActiveSubscribersCount() {
        return emitters.size();
    }
}

