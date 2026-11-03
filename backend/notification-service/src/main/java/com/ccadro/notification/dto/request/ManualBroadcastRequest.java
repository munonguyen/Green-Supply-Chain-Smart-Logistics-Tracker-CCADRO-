package com.ccadro.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

/**
 * Yêu cầu phát lệnh cảnh báo khẩn cấp thủ công từ Safety Manager / Dispatcher / Admin:
 * - Hỗ trợ phân luồng người nhận mục tiêu (targetAudience).
 * - Cung cấp chỉ đạo xử lý tức thời (actionDirective).
 * - Tọa độ và bán kính ảnh hưởng địa lý (Geofence radius).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ManualBroadcastRequest {

    @NotBlank(message = "Tiêu đề cảnh báo không được để trống")
    String title;

    @NotBlank(message = "Nội dung cảnh báo không được để trống")
    String message;

    @Builder.Default
    String severity = "WARNING"; // CRITICAL, HIGH, WARNING, INFO

    @Builder.Default
    String eventType = "MANUAL_SAFETY_BROADCAST";

    @Builder.Default
    String targetAudience = "ALL_DRIVERS"; // ALL_DRIVERS, CORRIDOR_DRIVERS, SPECIFIC_TRIP, SHIPPERS, ALL_ROLES

    String targetRole; // DRIVER, DISPATCHER, SHIPPER, ALL

    UUID tripId;

    String targetCorridor;

    Double latitude;

    Double longitude;

    Double radiusMeters;

    String actionDirective;

    String senderUsername;

    String senderRole; // SAFETY_MANAGER, DISPATCHER, ADMIN
}

