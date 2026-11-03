package com.ccadro.incident.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class EmergencyNotificationPublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;
    RestClient restClient = RestClient.create();

    @NonFinal
    @Value("${ccadro.kafka.emergency-topic:ccadro.emergency.notifications}")
    String emergencyTopic;

    @NonFinal
    @Value("${ccadro.notification.service-url:http://localhost:8087}")
    String notificationServiceUrl;

    public void publishEmergencyEvent(
            String eventType,
            String severity,
            String targetRole,
            UUID tripId,
            UUID referenceId,
            String title,
            String message,
            Double latitude,
            Double longitude,
            String metadataJson) {
        CompletableFuture.runAsync(() -> {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("eventType", eventType);
            payload.put("severity", severity);
            payload.put("sourceService", "incident-service");
            payload.put("targetRole", targetRole);
            payload.put("tripId", tripId);
            payload.put("referenceId", referenceId);
            payload.put("title", title);
            payload.put("message", message);
            payload.put("latitude", latitude);
            payload.put("longitude", longitude);
            payload.put("metadataJson", metadataJson != null ? metadataJson : "{}");

            try {
                String json = objectMapper.writeValueAsString(payload);
                String key = tripId != null ? tripId.toString() : UUID.randomUUID().toString();
                kafkaTemplate.send(emergencyTopic, key, json).get();
                log.info("Đã phát sự kiện khẩn cấp [{}] lên Kafka topic {}", eventType, emergencyTopic);
            } catch (Exception kafkaEx) {
                log.debug("Kafka broker không khả dụng ({}), chuyển sang gọi trực tiếp notification-service (:8087)",
                        kafkaEx.getMessage());
                try {
                    restClient.post()
                            .uri(notificationServiceUrl + "/api/v1/notifications/dispatch")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(payload)
                            .retrieve()
                            .toBodilessEntity();
                } catch (Exception restEx) {
                    log.debug("Bỏ qua gửi thông báo dự phòng: {}", restEx.getMessage());
                }
            }
        });
    }
}

