package com.ccadro.notification.controller;

import com.ccadro.notification.dto.ApiResponse;
import com.ccadro.notification.dto.request.ManualBroadcastRequest;
import com.ccadro.notification.dto.request.NotificationAcknowledgeRequest;
import com.ccadro.notification.dto.response.EmergencyNotificationResponse;
import com.ccadro.notification.event.EmergencyNotificationEvent;
import com.ccadro.notification.service.EmergencyNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Emergency Notification Service", description = "Hệ thống thông báo sự cố khẩn cấp đa kênh (Apache Kafka + Real-time SSE + Dispatcher ACK)")
public class EmergencyNotificationController {

    EmergencyNotificationService notificationService;

    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo sự cố khẩn cấp (lọc theo status, targetRole, tripId, broadcastType)")
    public ApiResponse<List<EmergencyNotificationResponse>> getNotifications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String targetRole,
            @RequestParam(required = false) UUID tripId,
            @RequestParam(required = false) String broadcastType) {
        return ApiResponse.<List<EmergencyNotificationResponse>>builder()
                .result(notificationService.getAllNotifications(status, targetRole, tripId, broadcastType))
                .build();
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Đếm số lượng thông báo khẩn cấp chưa đọc (UNREAD)")
    public ApiResponse<Map<String, Long>> getUnreadCount() {
        return ApiResponse.<Map<String, Long>>builder()
                .result(Map.of("unreadCount", notificationService.getUnreadCount()))
                .build();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Kênh Real-time SSE (Server-Sent Events) đẩy cảnh báo khẩn cấp trực tiếp lên Bản đồ React Leaflet")
    public SseEmitter streamNotifications() {
        return notificationService.subscribeRealTimeStream();
    }

    @PostMapping("/dispatch")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Phát hành thông báo sự cố khẩn cấp tự động (có chống spam trùng lặp 300s & phát sóng SSE)")
    public ApiResponse<EmergencyNotificationResponse> dispatchNotification(
            @Valid @RequestBody EmergencyNotificationEvent event) {
        return ApiResponse.<EmergencyNotificationResponse>builder()
                .message("Emergency notification dispatched")
                .result(notificationService.dispatchEmergencyNotification(event))
                .build();
    }

    @PostMapping("/broadcast")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Phát lệnh cảnh báo khẩn cấp thủ công từ Safety Manager / Dispatcher (Human-Driven Administrative Broadcast)")
    public ApiResponse<EmergencyNotificationResponse> broadcastManualNotification(
            @Valid @RequestBody ManualBroadcastRequest request) {
        return ApiResponse.<EmergencyNotificationResponse>builder()
                .message("Đã phát thanh lệnh cảnh báo khẩn cấp thành công")
                .result(notificationService.broadcastManualEmergency(request))
                .build();
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Đánh dấu thông báo đã đọc (READ)")
    public ApiResponse<EmergencyNotificationResponse> markAsRead(@PathVariable UUID id) {
        return ApiResponse.<EmergencyNotificationResponse>builder()
                .message("Notification marked as READ")
                .result(notificationService.markAsRead(id))
                .build();
    }

    @PutMapping("/{id}/acknowledge")
    @Operation(summary = "Điều phối viên xác nhận đã tiếp nhận xử lý sự cố khẩn cấp (ACK - Human-in-the-Loop)")
    public ApiResponse<EmergencyNotificationResponse> acknowledgeNotification(
            @PathVariable UUID id,
            @Valid @RequestBody NotificationAcknowledgeRequest request) {
        return ApiResponse.<EmergencyNotificationResponse>builder()
                .message("Emergency notification acknowledged by dispatcher")
                .result(notificationService.acknowledgeNotification(id, request))
                .build();
    }
}

