package com.ccadro.payment.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Data;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignContractRequest {
    private String signedByUsername;
    private String signerTitle;
    private String notes;
}

