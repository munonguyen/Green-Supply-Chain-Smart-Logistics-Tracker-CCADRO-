package com.ccadro.tracking.client;

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

    public void publishDeviationEmergency(
            UUID tripId,
            UUID alertId,
            String severity,
            Double distanceMeters,
            Double latitude,
            Double longitude) {
        CompletableFuture.runAsync(() -> {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("eventType", "DEVIATION_" + severity);
            payload.put("severity", "RED".equalsIgnoreCase(severity) ? "CRITICAL" : "WARNING");
            payload.put("sourceService", "tracking-service");
            payload.put("targetRole", "DISPATCHER");
            payload.put("tripId", tripId);
            payload.put("referenceId", alertId);
            payload.put("title", "[BÁO ĐỘNG ĐỎ UC09] Xe lệch hành lang " + Math.round(distanceMeters != null ? distanceMeters : 0) + "m (> 200m)");
            payload.put("message", "Phát hiện 3 điểm GPS hợp lệ liên tiếp vượt ngưỡng an toàn. Đã kích hoạt đánh giá đổi tuyến động (UC10).");
            payload.put("latitude", latitude);
            payload.put("longitude", longitude);
            payload.put("metadataJson", "{\"deviationMeters\":" + (distanceMeters != null ? distanceMeters : 0) + ",\"severity\":\"" + severity + "\"}");

            try {
                String json = objectMapper.writeValueAsString(payload);
                String key = tripId != null ? tripId.toString() : UUID.randomUUID().toString();
                kafkaTemplate.send(emergencyTopic, key, json).get();
                log.info("Đã phát cảnh báo lệch tuyến [{}] lên Kafka topic {}", severity, emergencyTopic);
            } catch (Exception kafkaEx) {
                try {
                    restClient.post()
                            .uri(notificationServiceUrl + "/api/v1/notifications/dispatch")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(payload)
                            .retrieve()
                            .toBodilessEntity();
                } catch (Exception restEx) {
                    log.debug("Bỏ qua gửi thông báo lệch tuyến dự phòng: {}", restEx.getMessage());
                }
            }
        });
    }
}

