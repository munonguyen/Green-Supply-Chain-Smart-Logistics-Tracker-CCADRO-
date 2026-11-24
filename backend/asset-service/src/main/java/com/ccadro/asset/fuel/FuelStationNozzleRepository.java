package com.ccadro.asset.fuel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FuelStationNozzleRepository extends JpaRepository<FuelStationNozzle, UUID> {
    List<FuelStationNozzle> findByStationIdOrderByNozzleCodeAsc(UUID stationId);
    Optional<FuelStationNozzle> findByStationIdAndNozzleCode(UUID stationId, String nozzleCode);
}

