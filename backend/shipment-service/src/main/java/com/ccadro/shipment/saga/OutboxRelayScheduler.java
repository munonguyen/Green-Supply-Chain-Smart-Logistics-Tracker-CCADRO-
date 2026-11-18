package com.ccadro.shipment.saga;

import com.ccadro.shipment.entity.OutboxEvent;
import com.ccadro.shipment.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Outbox Relay định kỳ đọc các bản ghi PENDING trong outbox_event và phát tiếp sang notification-service,
 * tránh tình trạng lưu Outbox rồi bỏ quên (Dead Outbox).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxRelayScheduler {

    private static final int MAX_RETRIES = 5;

    private final OutboxEventRepository outboxEventRepository;

    @Value("${services.notification.url:http://localhost:8087}")
    private String notificationServiceUrl = "http://localhost:8087";

    @Value("${ccadro.outbox.relay-enabled:true}")
    private boolean relayEnabled = true;

    @Scheduled(fixedDelayString = "${ccadro.outbox.poll-interval-ms:15000}")
    @Transactional
    public void processPendingOutboxEvents() {
        if (!relayEnabled) {
            return;
        }
        List<OutboxEvent> pendingEvents = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        if (pendingEvents.isEmpty()) {
            return;
        }

        RestClient client = RestClient.builder().baseUrl(notificationServiceUrl).build();
        for (OutboxEvent ev : pendingEvents) {
            try {
                boolean isCompensated = "SAGA_COMPENSATED".equalsIgnoreCase(ev.getEventType());
                client.post()
                        .uri("/api/v1/notifications/dispatch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "eventType", ev.getEventType(),
                                "severity", isCompensated ? "CRITICAL" : "INFO",
                                "sourceService", "shipment-service",
                                "targetRole", "DISPATCHER",
                                "referenceId", ev.getAggregateId(),
                                "title", isCompensated
                                        ? "[SAGA ROLLBACK UC06] Giao dịch điều phối bị hoàn tác"
                                        : "[SAGA DISPATCH UC06] Đơn vận tải đã xuất bến",
                                "message", "Outbox Event " + ev.getEventType() + " (" + ev.getKafkaTopic() + ")",
                                "metadataJson", ev.getPayloadJson()
                        ))
                        .retrieve()
                        .toBodilessEntity();

                ev.setStatus("PUBLISHED");
                ev.setPublishedAt(Instant.now());
            } catch (Exception ex) {
                int retries = (ev.getRetryCount() != null ? ev.getRetryCount() : 0) + 1;
                ev.setRetryCount(retries);
                if (retries >= MAX_RETRIES) {
                    ev.setStatus("FAILED_DLQ");
                }
                log.debug("Outbox relay chưa kết nối được notification-service cho event {}: {}",
                        ev.getId(), ex.getMessage());
            }
        }
        outboxEventRepository.saveAll(pendingEvents);
    }
}

