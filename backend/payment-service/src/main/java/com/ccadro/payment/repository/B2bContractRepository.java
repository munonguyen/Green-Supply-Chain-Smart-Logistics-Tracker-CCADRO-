package com.ccadro.payment.repository;

import com.ccadro.payment.entity.B2bContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface B2bContractRepository extends JpaRepository<B2bContract, UUID> {

    Optional<B2bContract> findByContractNumber(String contractNumber);

    Optional<B2bContract> findTopByShipmentCodeOrderByCreatedAtDesc(String shipmentCode);

    Optional<B2bContract> findTopByCustomerIdAndContractTypeAndContractStatusOrderByCreatedAtDesc(
            String customerId, String contractType, String contractStatus);

    List<B2bContract> findAllByOrderByCreatedAtDesc();

    List<B2bContract> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<B2bContract> findByCustomerIdAndContractStatusOrderByCreatedAtDesc(
            String customerId, String contractStatus);
}

