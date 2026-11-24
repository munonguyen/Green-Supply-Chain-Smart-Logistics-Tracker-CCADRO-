package com.ccadro.hubshipper.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "hub_shipper_cod_remittance")
public class HubShipperCodRemittance {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "receipt_code", nullable = false, unique = true, length = 50)
    String receiptCode;

    @Column(name = "hub_code", nullable = false, length = 40)
    String hubCode;

    @Column(name = "shipper_code", nullable = false, length = 40)
    String shipperCode;

    @Column(name = "shipper_name", nullable = false, length = 150)
    String shipperName;

    @Column(name = "remitted_amount_vnd", nullable = false)
    Long remittedAmountVnd;

    @Column(name = "payment_channel", nullable = false, length = 40)
    @Builder.Default
    String paymentChannel = "HUB_CASHIER";

    @Column(name = "cashier_confirmed_by", length = 100)
    String cashierConfirmedBy;

    @Column(name = "item_codes_csv", columnDefinition = "TEXT")
    String itemCodesCsv;

    @Column(name = "note", length = 300)
    String note;

    @Column(name = "remitted_at", nullable = false)
    @Builder.Default
    Instant remittedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();
}

