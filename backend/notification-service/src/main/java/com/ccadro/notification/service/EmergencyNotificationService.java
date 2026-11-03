package com.ccadro.notification.service;

import com.ccadro.notification.dto.request.ManualBroadcastRequest;
import com.ccadro.notification.dto.request.NotificationAcknowledgeRequest;
import com.ccadro.notification.dto.response.EmergencyNotificationResponse;
import com.ccadro.notification.entity.EmergencyNotification;
import com.ccadro.notification.event.EmergencyNotificationEvent;
import com.ccadro.notification.exception.AppException;
import com.ccadro.notification.exception.ErrorCode;
import com.ccadro.notification.mapper.EmergencyNotificationMapper;
import com.ccadro.notification.repository.EmergencyNotificationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản lý vòng đời thông báo khẩn cấp (Emergency Notification Domain Service):
 * - Hỗ trợ cả 2 kênh: Tự động (Automated Alerts) & Thủ công (Manual Broadcast).
 * - Chống bão thông báo (Deduplication Window 300s).
 * - Lưu trữ bền vững vào PostgreSQL (emergency_notification).
 * - Phối hợp cùng SseStreamService để broadcast thời gian thực tới các vai trò mục tiêu.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class EmergencyNotificationService {

    EmergencyNotificationRepository notificationRepository;
    EmergencyNotificationMapper notificationMapper;
    SseStreamService sseStreamService;

    @NonFinal
    @Value("${ccadro.notification.deduplicationWindowSeconds:300}")
    long deduplicationWindowSeconds;

    public List<EmergencyNotificationResponse> getAllNotifications(String status, String targetRole, UUID tripId) {
        return getAllNotifications(status, targetRole, tripId, null);
    }

    public List<EmergencyNotificationResponse> getAllNotifications(String status, String targetRole, UUID tripId, String broadcastType) {
        if (tripId != null) {
            return notificationMapper.toResponseList(notificationRepository.findByTripIdOrderByCreatedAtDesc(tripId));
        }
        if (broadcastType != null && !broadcastType.isBlank()) {
            return notificationMapper.toResponseList(
                    notificationRepository.findByBroadcastTypeOrderByCreatedAtDesc(broadcastType.trim().toUpperCase()));
        }
        if (status != null && !status.isBlank()) {
            return notificationMapper.toResponseList(
                    notificationRepository.findByStatusOrderByCreatedAtDesc(status.trim().toUpperCase()));
        }
        if (targetRole != null && !targetRole.isBlank()) {
            return notificationMapper.toResponseList(
                    notificationRepository.findByTargetRoleOrderByCreatedAtDesc(targetRole.trim().toUpperCase()));
        }
        return notificationMapper.toResponseList(notificationRepository.findAllByOrderByCreatedAtDesc());
    }

    public long getUnreadCount() {
        return notificationRepository.countByStatus("UNREAD");
    }

    /**
     * Xử lý sự kiện khẩn cấp từ Apache Kafka hoặc REST:
     * 1. Chống bão cảnh báo (Deduplication Window 300s) theo bộ (eventType + tripId + severity).
     * 2. Lưu bền vững vào PostgreSQL (emergency_notification).
     * 3. Phát sóng Real-time SSE tới toàn bộ màn hình bản đồ Leaflet của Dispatcher đang kết nối.
     */
    @Transactional
    public EmergencyNotificationResponse dispatchEmergencyNotification(EmergencyNotificationEvent event) {
        String severity = (event.getSeverity() != null && !event.getSeverity().isBlank())
                ? event.getSeverity().trim().toUpperCase()
                : "CRITICAL";
        String eventType = event.getEventType().trim().toUpperCase();

        // 1. Chống spam thông báo trùng lặp trong cửa sổ 300s cho cùng chuyến xe & loại sự cố
        if (event.getTripId() != null) {
            Instant windowStart = Instant.now().minusSeconds(deduplicationWindowSeconds);
            Optional<EmergencyNotification> duplicate = notificationRepository
                    .findFirstByEventTypeAndTripIdAndSeverityAndCreatedAtAfterOrderByCreatedAtDesc(
                            eventType, event.getTripId(), severity, windowStart);
            if (duplicate.isPresent() && "UNREAD".equalsIgnoreCase(duplicate.get().getStatus())) {
                log.info("Chặn thông báo trùng lặp trong cửa sổ {}s cho trip {} ({})",
                        deduplicationWindowSeconds, event.getTripId(), eventType);
                return notificationMapper.toResponse(duplicate.get());
            }
        }

        EmergencyNotification entity = notificationMapper.toEntity(event);
        entity.setEventType(eventType);
        entity.setSeverity(severity);
        if (entity.getNotificationCode() == null || entity.getNotificationCode().isBlank()) {
            entity.setNotificationCode("NOTIF-" + eventType.substring(0, Math.min(3, eventType.length()))
                    + "-" + System.currentTimeMillis());
        }
        if (entity.getSourceService() == null || entity.getSourceService().isBlank()) {
            entity.setSourceService("incident-service");
        }
        if (entity.getTargetRole() == null || entity.getTargetRole().isBlank()) {
            entity.setTargetRole("DISPATCHER");
        }
        if (entity.getMetadataJson() == null || entity.getMetadataJson().isBlank()) {
            entity.setMetadataJson("{}");
        }

        EmergencyNotification saved = notificationRepository.save(entity);
        EmergencyNotificationResponse response = notificationMapper.toResponse(saved);

        // 3. Push Real-time SSE tới trình duyệt của Điều phối viên
        sseStreamService.broadcastEvent("emergency-alert", response);
        return response;
    }

    /**
     * Kênh phát lệnh khẩn cấp thủ công từ Safety Manager / Dispatcher / Admin (Human-Driven Administrative Broadcast):
     * 1. Chuẩn hóa mã cảnh báo MANUAL-***.
     * 2. Phân loại đối tượng nhận mục tiêu (targetAudience: ALL_DRIVERS, CORRIDOR_DRIVERS, SPECIFIC_TRIP, SHIPPERS, ALL_ROLES).
     * 3. Lưu bền vững vào PostgreSQL (emergency_notification).
     * 4. Phát sóng thời gian thực qua Server-Sent Events (SSE) tới toàn bộ các bên liên quan.
     */
    @Transactional
    public EmergencyNotificationResponse broadcastManualEmergency(ManualBroadcastRequest request) {
        String severity = (request.getSeverity() != null && !request.getSeverity().isBlank())
                ? request.getSeverity().trim().toUpperCase()
                : "WARNING";

        String audience = (request.getTargetAudience() != null && !request.getTargetAudience().isBlank())
                ? request.getTargetAudience().trim().toUpperCase()
                : "ALL_DRIVERS";

        EmergencyNotification entity = notificationMapper.toEntity(request);
        entity.setSeverity(severity);
        entity.setTargetAudience(audience);
        entity.setBroadcastType("MANUAL_BROADCAST");

        // Gán targetRole tương ứng theo đối tượng nhận
        if (entity.getTargetRole() == null || entity.getTargetRole().isBlank()) {
            if ("ALL_DRIVERS".equalsIgnoreCase(audience) || "CORRIDOR_DRIVERS".equalsIgnoreCase(audience)) {
                entity.setTargetRole("DRIVER");
            } else if ("SHIPPERS".equalsIgnoreCase(audience)) {
                entity.setTargetRole("SHIPPER");
            } else if ("ALL_ROLES".equalsIgnoreCase(audience)) {
                entity.setTargetRole("ALL");
            } else {
                entity.setTargetRole("DISPATCHER");
            }
        }

        if (entity.getSenderRole() == null || entity.getSenderRole().isBlank()) {
            entity.setSenderRole("SAFETY_MANAGER");
        }
        if (entity.getSenderUsername() == null || entity.getSenderUsername().isBlank()) {
            entity.setSenderUsername("safety");
        }

        entity.setNotificationCode("MANUAL-" + severity.substring(0, Math.min(3, severity.length()))
                + "-" + System.currentTimeMillis());

        EmergencyNotification saved = notificationRepository.save(entity);
        EmergencyNotificationResponse response = notificationMapper.toResponse(saved);

        // Phát sóng Real-time SSE thông báo khẩn cấp
        sseStreamService.broadcastEvent("emergency-alert", response);
        sseStreamService.broadcastEvent("manual-broadcast", response);
        log.info("Đã phát lệnh khẩn cấp thủ công [{}] tới audience [{}], mã {}",
                severity, audience, saved.getNotificationCode());

        return response;
    }

    @Transactional
    public EmergencyNotificationResponse markAsRead(UUID id) {
        EmergencyNotification notification = findOrThrow(id);
        if ("UNREAD".equalsIgnoreCase(notification.getStatus())) {
            notification.setStatus("READ");
        }
        return notificationMapper.toResponse(notification);
    }

    /**
     * Dispatcher Human-in-the-Loop Acknowledgment (ACK):
     * Điều phối viên xác nhận đã tiếp nhận xử lý sự cố khẩn cấp.
     */
    @Transactional
    public EmergencyNotificationResponse acknowledgeNotification(UUID id, NotificationAcknowledgeRequest request) {
        EmergencyNotification notification = findOrThrow(id);
        notification.setStatus("ACKNOWLEDGED");
        notification.setAcknowledgedBy(request.getAcknowledgedBy().trim());
        notification.setAcknowledgedAt(Instant.now());
        notification.setActionNotes(request.getActionNotes());

        EmergencyNotificationResponse response = notificationMapper.toResponse(notification);
        sseStreamService.broadcastEvent("emergency-acknowledged", response);
        return response;
    }

    public SseEmitter subscribeRealTimeStream() {
        return sseStreamService.subscribeRealTimeStream();
    }

    private EmergencyNotification findOrThrow(UUID id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
    }
}
