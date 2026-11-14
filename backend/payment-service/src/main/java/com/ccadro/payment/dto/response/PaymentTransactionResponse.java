package com.ccadro.payment.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PaymentTransactionResponse {
    private UUID id;
    private String transactionCode;
    private String invoiceNumber;
    private String shipmentCode;
    private String customerId;
    private String customerName;
    private String createdByUsername;
    private String originName;
    private String destinationName;
    private String containerCode;
    private String vehicleType;
    private String powertrainType;
    private String paymentMethod;
    private String currency;
    private Long baseFreightVnd;
    private Long greenEsgDiscountVnd;
    private Long vatAmountVnd;
    private Long totalAmountVnd;
    private Double co2SavedKg;
    private String paymentStatus;
    private String gatewayProvider;
    private String gatewayReference;
    private String qrPayload;
    private String bankCode;
    private String bankAccountNo;
    private String cardLast4;
    private String payerName;
    private String notes;
    private Instant paidAt;
    private Instant dueAt;
    private Instant createdAt;
    private Instant updatedAt;
}

