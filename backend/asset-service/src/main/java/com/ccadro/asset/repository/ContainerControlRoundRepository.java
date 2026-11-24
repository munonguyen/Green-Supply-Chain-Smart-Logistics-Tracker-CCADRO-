package com.ccadro.asset.repository;

import com.ccadro.asset.entity.ContainerControlRound;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ContainerControlRoundRepository extends JpaRepository<ContainerControlRound, UUID> {
    Optional<ContainerControlRound> findFirstByContainerCodeOrderByRoundNumberDesc(String containerCode);
    List<ContainerControlRound> findByContainerCodeOrderByRoundNumberDesc(String containerCode);
}
