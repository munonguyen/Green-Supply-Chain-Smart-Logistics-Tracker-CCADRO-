package com.ccadro.carbon.repository;

import com.ccadro.carbon.entity.FuelPriceCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FuelPriceCatalogRepository extends JpaRepository<FuelPriceCatalog, UUID> {
    Optional<FuelPriceCatalog> findByFuelType(String fuelType);
    List<FuelPriceCatalog> findAllByIsActiveTrue();
}

