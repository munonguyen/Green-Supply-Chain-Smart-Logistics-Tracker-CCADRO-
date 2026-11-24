package com.ccadro.asset.fuel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FuelPumpTransactionRepository extends JpaRepository<FuelPumpTransaction, UUID> {
    Optional<FuelPumpTransaction> findByTransactionRef(String transactionRef);
    List<FuelPumpTransaction> findTop100ByOrderByPumpedAtDesc();
    Optional<FuelPumpTransaction> findFirstByAssetKindAndAssetCodeAndValidationStatusOrderByPumpedAtDesc(
        String assetKind, String assetCode, String validationStatus);
}

