package com.ccadro.asset.repository;

import com.ccadro.asset.entity.ContainerSafetyInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContainerSafetyInspectionRepository extends JpaRepository<ContainerSafetyInspection, UUID> {
    Optional<ContainerSafetyInspection> findFirstByContainerIdOrderByInspectionNumberDesc(UUID containerId);
    List<ContainerSafetyInspection> findByContainerIdOrderByInspectionNumberDesc(UUID containerId);
    @Query("select i from ContainerSafetyInspection i where i.inspectionNumber = (select max(j.inspectionNumber) from ContainerSafetyInspection j where j.containerId = i.containerId)")
    List<ContainerSafetyInspection> findLatestForAllContainers();
    List<ContainerSafetyInspection> findByContainerIdAndControlRoundIdOrderByInspectedAtDescCreatedAtDesc(UUID containerId, UUID roundId);
    List<ContainerSafetyInspection> findByContainerIdOrderByInspectedAtDescCreatedAtDesc(UUID containerId);
    Optional<ContainerSafetyInspection> findFirstByContainerIdAndControlRoundIdOrderByInspectedAtDescCreatedAtDesc(UUID containerId, UUID roundId);
}
