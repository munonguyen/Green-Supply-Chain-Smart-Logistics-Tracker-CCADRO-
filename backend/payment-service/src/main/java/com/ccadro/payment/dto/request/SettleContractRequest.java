package com.ccadro.payment.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Data;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SettleContractRequest {
    private String epodSignerName;
    private String paymentMethod;
    private Boolean triggerPaymentInvoice;
    private String notes;
}

