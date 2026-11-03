package com.ccadro.carbon.repository;

import com.ccadro.carbon.entity.CarbonBenchmarkResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CarbonBenchmarkResultRepository extends JpaRepository<CarbonBenchmarkResult, UUID> {
    List<CarbonBenchmarkResult> findByTripId(UUID tripId);
}

