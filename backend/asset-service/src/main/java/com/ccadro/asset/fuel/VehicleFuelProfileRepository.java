package com.ccadro.asset.fuel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface VehicleFuelProfileRepository extends JpaRepository<VehicleFuelProfile, UUID> {}
