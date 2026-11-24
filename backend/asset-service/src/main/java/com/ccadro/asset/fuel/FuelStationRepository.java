package com.ccadro.asset.fuel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface FuelStationRepository extends JpaRepository<FuelStation, UUID> {
    Optional<FuelStation> findByStationCode(String stationCode);
}

