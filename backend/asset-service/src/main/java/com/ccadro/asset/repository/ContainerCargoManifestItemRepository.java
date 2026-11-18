package com.ccadro.asset.repository;

import com.ccadro.asset.entity.ContainerCargoManifestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContainerCargoManifestItemRepository extends JpaRepository<ContainerCargoManifestItem, UUID> {
    List<ContainerCargoManifestItem> findAllByOrderByItemCodeAsc();
    List<ContainerCargoManifestItem> findByHubCodeOrderByItemCodeAsc(String hubCode);
    List<ContainerCargoManifestItem> findByContainerCodeOrderByItemCodeAsc(String containerCode);
    Optional<ContainerCargoManifestItem> findByItemCode(String itemCode);
}

