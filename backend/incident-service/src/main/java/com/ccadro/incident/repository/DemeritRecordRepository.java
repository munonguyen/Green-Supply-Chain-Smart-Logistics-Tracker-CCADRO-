package com.ccadro.incident.repository;

import com.ccadro.incident.entity.DemeritRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DemeritRecordRepository extends JpaRepository<DemeritRecord, UUID> {
    List<DemeritRecord> findByDriverId(UUID driverId);
}

