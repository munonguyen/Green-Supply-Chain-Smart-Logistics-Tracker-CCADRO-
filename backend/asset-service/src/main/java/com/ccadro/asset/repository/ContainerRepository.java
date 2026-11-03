package com.ccadro.asset.repository;

import com.ccadro.asset.entity.Container;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ContainerRepository extends JpaRepository<Container, UUID> {
    Optional<Container> findByContainerCode(String containerCode);
}
