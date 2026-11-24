package com.ccadro.asset.fuel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ContainerFuelUnitRepository extends JpaRepository<ContainerFuelUnit, UUID> {
    Optional<ContainerFuelUnit> findByGensetCode(String gensetCode);
    Optional<ContainerFuelUnit> findByRfidTag(String rfidTag);
}

