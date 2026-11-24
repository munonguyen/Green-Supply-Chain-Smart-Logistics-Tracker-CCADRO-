package com.ccadro.payment.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Data;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefundPaymentRequest {
    private String reason;
    private String actor;
}

