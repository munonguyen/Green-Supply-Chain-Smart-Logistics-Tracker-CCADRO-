package com.ccadro.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentWebhookCallbackRequest {

    @NotBlank(message = "transactionCode là bắt buộc")
    private String transactionCode;

    private String gatewayReference;
    private String signature;
    private Long paidAmountVnd;
    private String payerName;
}

