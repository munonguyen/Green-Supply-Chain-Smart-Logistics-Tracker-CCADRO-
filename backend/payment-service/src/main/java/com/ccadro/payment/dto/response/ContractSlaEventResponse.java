package com.ccadro.payment.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ContractSlaEventResponse {
    private UUID id;
    private String contractNumber;
    private String shipmentCode;
    private String eventType;
    private String severity;
    private Long penaltyAmountVnd;
    private String recordedBy;
    private String description;
    private Instant createdAt;
}

