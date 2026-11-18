package com.ccadro.hubshipper.repository;

import com.ccadro.hubshipper.entity.HubTaskRangeAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HubTaskRangeAssignmentRepository extends JpaRepository<HubTaskRangeAssignment, UUID> {
    List<HubTaskRangeAssignment> findByHubCodeOrderByAssignedAtDesc(String hubCode);
    List<HubTaskRangeAssignment> findByShipperCodeOrderByAssignedAtDesc(String shipperCode);
}

