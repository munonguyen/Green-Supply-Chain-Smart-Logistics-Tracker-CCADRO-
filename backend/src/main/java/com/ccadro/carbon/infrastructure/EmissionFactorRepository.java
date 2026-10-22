package com.ccadro.carbon.infrastructure;

import com.ccadro.carbon.domain.EmissionFactor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmissionFactorRepository extends JpaRepository<EmissionFactor, UUID> {
    Optional<EmissionFactor> findByFactorCode(String factorCode);
}
