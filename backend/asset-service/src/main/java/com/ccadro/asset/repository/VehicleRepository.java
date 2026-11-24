package com.ccadro.asset.repository;

import com.ccadro.asset.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM vehicle WHERE id = :id FOR NO KEY UPDATE", nativeQuery = true)
    Optional<Vehicle> findForAssignment(@org.springframework.data.repository.query.Param("id") UUID id);

    Optional<Vehicle> findByVehicleCode(String vehicleCode);
    Optional<Vehicle> findByPlateNumber(String plateNumber);
}
