package com.ccadro.carbon.repository;

import com.ccadro.carbon.entity.CarbonBenchmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CarbonBenchmarkRepository extends JpaRepository<CarbonBenchmark, UUID> {
    List<CarbonBenchmark> findByOriginZoneAndDestinationZone(String originZone, String destinationZone);
}
