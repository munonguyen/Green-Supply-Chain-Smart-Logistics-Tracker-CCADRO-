package com.ccadro.asset.repository;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.enums.ContainerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContainerRepository extends JpaRepository<Container, UUID> {
    Optional<Container> findByContainerCode(String containerCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Container c where c.containerCode = :code")
    Optional<Container> findForControlUpdate(@Param("code") String containerCode);
    List<Container> findByStatus(ContainerStatus status);
    List<Container> findByAssignedDriverId(UUID driverId);
    List<Container> findByAssignedShipmentCode(String assignedShipmentCode);
    List<Container> findByStatusAndAssignedDriverId(ContainerStatus status, UUID driverId);
    List<Container> findByStatusAndAssignedVehicleId(ContainerStatus status, UUID vehicleId);
}
