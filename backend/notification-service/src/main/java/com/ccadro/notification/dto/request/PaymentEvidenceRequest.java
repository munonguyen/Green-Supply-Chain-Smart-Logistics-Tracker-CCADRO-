package com.ccadro.notification.dto.request;

import jakarta.validation.constraints.*;

public record PaymentEvidenceRequest(
        @NotBlank @Email String recipientEmail,
        @NotBlank @Size(max = 300) String subject,
        @NotBlank @Size(max = 2000000) String snapshotJson,
        @Pattern(regexp = "[a-f0-9]{64}") @NotNull String snapshotSha256,
        @NotBlank @Size(max = 4000000) String htmlContent,
        @Pattern(regexp = "[a-f0-9]{64}") @NotNull String htmlSha256,
        @Size(max = 64) String contractNumber,
        @Size(max = 48) String transactionCode,
        String contractPdfBase64,
        @Pattern(regexp = "^$|^[a-f0-9]{64}$") String contractPdfSha256,
        String receiptPdfBase64,
        @Pattern(regexp = "^$|^[a-f0-9]{64}$") String receiptPdfSha256
) {
    public PaymentEvidenceRequest(
            String recipientEmail,
            String subject,
            String snapshotJson,
            String snapshotSha256,
            String htmlContent,
            String htmlSha256
    ) {
        this(recipientEmail, subject, snapshotJson, snapshotSha256, htmlContent, htmlSha256,
                null, null, null, null, null, null);
    }
}
