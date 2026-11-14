package com.ccadro.payment.dto.request;

import lombok.Data;

@Data
public class SettleContractRequest {
    private String epodSignerName;
    private String paymentMethod;
    private Boolean triggerPaymentInvoice;
    private String notes;
}

