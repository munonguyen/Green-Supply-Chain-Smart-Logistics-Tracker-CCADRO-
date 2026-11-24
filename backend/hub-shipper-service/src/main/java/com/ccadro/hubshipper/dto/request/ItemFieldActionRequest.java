package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ItemFieldActionRequest {
    /**
     * PICKUP_DEPART, LOG_CALL, CHECKIN_ARRIVAL, REPORT_ON_HOLD, REPORT_NDR,
     * REPORT_RETURN_TO_HUB, SCAN_HUB_RETURN, RETRY_NDR
     */
    @NotBlank(message = "Loại thao tác hiện trường không được để trống")
    String action;

    String reason;

    String packageCondition;

    String evidenceImageUrl;

    Double currentLat;

    Double currentLng;
}

