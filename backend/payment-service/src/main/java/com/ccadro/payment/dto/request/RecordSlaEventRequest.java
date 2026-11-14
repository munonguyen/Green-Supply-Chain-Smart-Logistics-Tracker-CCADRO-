package com.ccadro.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RecordSlaEventRequest {

    @NotBlank(message = "Loại sự kiện SLA (eventType) không được để trống")
    private String eventType; // TEMP_BREACH | CORRIDOR_DEVIATION | DELAY_BREACH | SLA_ON_TIME_OK

    private String severity; // INFO | WARNING | BREACH
    private Long penaltyAmountVnd;
    private String recordedBy;
    private String description;
}

