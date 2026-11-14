package com.ccadro.payment.dto.request;

import lombok.Data;

@Data
public class RefundPaymentRequest {
    private String reason;
    private String actor;
}

