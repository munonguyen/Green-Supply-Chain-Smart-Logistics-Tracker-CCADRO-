package com.ccadro.payment.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Data;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmPaymentRequest {
    private String paymentMethod;
    private String gatewayReference;
    private String payerName;
    private String cardLast4;
    private String notes;
}

