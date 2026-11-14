package com.ccadro.payment.dto.request;

import lombok.Data;

@Data
public class ConfirmPaymentRequest {
    private String paymentMethod;
    private String gatewayReference;
    private String payerName;
    private String cardLast4;
    private String notes;
}

