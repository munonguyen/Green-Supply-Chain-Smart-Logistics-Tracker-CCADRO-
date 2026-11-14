package com.ccadro.payment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "transaction_code", nullable = false, unique = true, length = 48)
    private String transactionCode;

    @Column(name = "invoice_number", nullable = false, unique = true, length = 48)
    private String invoiceNumber;

    @Column(name = "shipment_code", nullable = false, length = 64)
    private String shipmentCode;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "created_by_username", length = 100)
    private String createdByUsername;

    @Column(name = "origin_name", length = 200)
    private String originName;

    @Column(name = "destination_name", length = 200)
    private String destinationName;

    @Column(name = "container_code", length = 40)
    private String containerCode;

    @Column(name = "vehicle_type", length = 140)
    private String vehicleType;

    @Column(name = "powertrain_type", length = 40)
    @Builder.Default
    private String powertrainType = "EV";

    @Column(name = "payment_method", nullable = false, length = 40)
    private String paymentMethod;

    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "base_freight_vnd", nullable = false)
    private Long baseFreightVnd;

    @Column(name = "green_esg_discount_vnd", nullable = false)
    @Builder.Default
    private Long greenEsgDiscountVnd = 0L;

    @Column(name = "vat_amount_vnd", nullable = false)
    @Builder.Default
    private Long vatAmountVnd = 0L;

    @Column(name = "total_amount_vnd", nullable = false)
    private Long totalAmountVnd;

    @Column(name = "co2_saved_kg")
    @Builder.Default
    private Double co2SavedKg = 0.0;

    @Column(name = "payment_status", nullable = false, length = 32)
    @Builder.Default
    private String paymentStatus = "PENDING";

    @Column(name = "gateway_provider", length = 80)
    private String gatewayProvider;

    @Column(name = "gateway_reference", length = 120)
    private String gatewayReference;

    @Column(name = "qr_payload", columnDefinition = "TEXT")
    private String qrPayload;

    @Column(name = "bank_code", length = 32)
    private String bankCode;

    @Column(name = "bank_account_no", length = 64)
    private String bankAccountNo;

    @Column(name = "card_last4", length = 8)
    private String cardLast4;

    @Column(name = "payer_name", length = 160)
    private String payerName;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "due_at")
    private Instant dueAt;
}

