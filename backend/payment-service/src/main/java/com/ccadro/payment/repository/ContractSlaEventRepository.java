package com.ccadro.payment.repository;

import com.ccadro.payment.entity.ContractSlaEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContractSlaEventRepository extends JpaRepository<ContractSlaEvent, UUID> {

    List<ContractSlaEvent> findByContractNumberOrderByCreatedAtDesc(String contractNumber);
}

