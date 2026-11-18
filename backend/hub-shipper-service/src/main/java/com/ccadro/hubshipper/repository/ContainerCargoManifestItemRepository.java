package com.ccadro.hubshipper.repository;

import com.ccadro.hubshipper.entity.ContainerCargoManifestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContainerCargoManifestItemRepository extends JpaRepository<ContainerCargoManifestItem, UUID> {
    List<ContainerCargoManifestItem> findByHubCodeOrderByItemCodeAsc(String hubCode);
    Optional<ContainerCargoManifestItem> findByItemCode(String itemCode);
}

