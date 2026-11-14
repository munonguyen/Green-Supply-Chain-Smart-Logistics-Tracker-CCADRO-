package com.ccadro.payment.repository;

import com.ccadro.payment.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findTopByShipmentCodeOrderByCreatedAtDesc(String shipmentCode);

    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();

    List<PaymentTransaction> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<PaymentTransaction> findByCustomerIdAndPaymentStatusOrderByCreatedAtDesc(
            String customerId, String paymentStatus);

    List<PaymentTransaction> findByPaymentStatusOrderByCreatedAtDesc(String paymentStatus);
}

