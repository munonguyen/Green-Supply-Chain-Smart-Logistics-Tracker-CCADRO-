package com.ccadro.payment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "payment_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentAuditLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "transaction_code", nullable = false, length = 48)
    private String transactionCode;

    @Column(name = "event_type", nullable = false, length = 48)
    private String eventType;

    @Column(name = "previous_status", length = 32)
    private String previousStatus;

    @Column(name = "new_status", nullable = false, length = 32)
    private String newStatus;

    @Column(name = "actor", nullable = false, length = 120)
    private String actor;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;
}

