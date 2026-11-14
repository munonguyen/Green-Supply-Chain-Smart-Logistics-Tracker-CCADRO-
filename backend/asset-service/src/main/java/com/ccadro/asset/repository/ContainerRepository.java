package com.ccadro.asset.repository;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.enums.ContainerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContainerRepository extends JpaRepository<Container, UUID> {
    Optional<Container> findByContainerCode(String containerCode);
    List<Container> findByStatus(ContainerStatus status);
    List<Container> findByAssignedDriverId(UUID driverId);
    List<Container> findByAssignedShipmentCode(String assignedShipmentCode);
    List<Container> findByStatusAndAssignedDriverId(ContainerStatus status, UUID driverId);
}
