package com.ccadro.payment.dto.request;

import lombok.Data;

@Data
public class SignContractRequest {
    private String signedByUsername;
    private String signerTitle;
    private String notes;
}

