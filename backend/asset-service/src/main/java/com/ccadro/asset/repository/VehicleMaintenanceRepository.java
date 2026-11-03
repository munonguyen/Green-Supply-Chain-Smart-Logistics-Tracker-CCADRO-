package com.ccadro.asset.repository;

import com.ccadro.asset.entity.VehicleMaintenance;
import com.ccadro.asset.entity.enums.MaintenanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleMaintenanceRepository extends JpaRepository<VehicleMaintenance, UUID> {

    boolean existsByVehicleIdAndStatus(UUID vehicleId, MaintenanceStatus maintenanceStatus);

    Optional<VehicleMaintenance> findFirstByVehicleIdAndStatus(UUID vehicleId, MaintenanceStatus maintenanceStatus);

    List<VehicleMaintenance> findByVehicleIdOrderByScheduledDateDesc(UUID vehicleId);
}
