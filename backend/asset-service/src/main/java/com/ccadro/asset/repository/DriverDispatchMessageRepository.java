package com.ccadro.asset.repository;

import com.ccadro.asset.entity.DriverDispatchMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DriverDispatchMessageRepository extends JpaRepository<DriverDispatchMessage, UUID> {
    List<DriverDispatchMessage> findByDriverIdOrderByCreatedAtDesc(UUID driverId);

    List<DriverDispatchMessage> findByDriverIdOrderByCreatedAtAsc(UUID driverId);
}

