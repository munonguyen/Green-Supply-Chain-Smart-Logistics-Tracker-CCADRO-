package com.ccadro.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSummaryResponse {
    private String customerId;
    private long totalTransactions;
    private long paidCount;
    private long pendingCount;
    private long net30Count;
    private long refundedCount;
    private long totalPaidVnd;
    private long totalPendingVnd;
    private long totalNet30Vnd;
    private long totalGreenDiscountVnd;
    private double totalCo2SavedKg;
}

