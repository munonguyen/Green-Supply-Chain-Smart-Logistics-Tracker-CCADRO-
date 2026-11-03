package com.ccadro.asset.repository;

import com.ccadro.asset.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
    Optional<Vehicle> findByVehicleCode(String vehicleCode);
    Optional<Vehicle> findByPlateNumber(String plateNumber);
}
