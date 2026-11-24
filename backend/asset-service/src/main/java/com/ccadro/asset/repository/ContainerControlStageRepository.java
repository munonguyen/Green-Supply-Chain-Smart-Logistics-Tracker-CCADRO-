package com.ccadro.asset.repository;

import com.ccadro.asset.entity.ContainerControlStage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ContainerControlStageRepository extends JpaRepository<ContainerControlStage, UUID> {
    List<ContainerControlStage> findByRoundIdOrderByCompletedAtAsc(UUID roundId);
    boolean existsByRoundIdAndStage(UUID roundId, String stage);
}
