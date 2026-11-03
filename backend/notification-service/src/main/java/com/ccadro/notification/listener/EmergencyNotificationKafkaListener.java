package com.ccadro.notification.listener;

import com.ccadro.notification.event.EmergencyNotificationEvent;
import com.ccadro.notification.service.EmergencyNotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class EmergencyNotificationKafkaListener {

    EmergencyNotificationService notificationService;
    ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${ccadro.kafka.emergency-topic:ccadro.emergency.notifications}",
            groupId = "${spring.kafka.consumer.group-id:notification-service-group}"
    )
    public void onEmergencyEventMessage(String rawJsonPayload) {
        try {
            log.info("Nhận sự kiện khẩn cấp từ Kafka topic [ccadro.emergency.notifications]: {}", rawJsonPayload);
            EmergencyNotificationEvent event = objectMapper.readValue(rawJsonPayload, EmergencyNotificationEvent.class);
            notificationService.dispatchEmergencyNotification(event);
        } catch (Exception ex) {
            log.error("Không thể xử lý bản tin Kafka sự cố khẩn cấp: {}", ex.getMessage(), ex);
        }
    }
}

