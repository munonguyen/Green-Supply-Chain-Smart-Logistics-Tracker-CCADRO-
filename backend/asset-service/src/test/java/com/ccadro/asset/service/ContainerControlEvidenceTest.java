package com.ccadro.asset.service;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.repository.ContainerCargoManifestItemRepository;
import com.ccadro.asset.repository.PreTripInspectionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContainerControlEvidenceTest {
    @Test
    void confirmationSnapshotRetainsOriginalAssignmentAfterProfileChanges() {
        var cargo = mock(ContainerCargoManifestItemRepository.class);
        var service = new ContainerControlEvidence(cargo, mock(PreTripInspectionRepository.class), mock(com.ccadro.asset.repository.ContainerSafetyInspectionRepository.class), new ObjectMapper());
        var container = Container.builder().containerCode("TEST").assignedShipmentCode("SHIP-A")
            .driverName("Original driver").status(ContainerStatus.ASSIGNED).build();
        when(cargo.findByContainerCodeOrderByItemCodeAsc("TEST")).thenReturn(List.of());
        String stored = service.capture(container, "PREPARATION");
        container.setDriverName("Replacement driver");
        container.setAssignedShipmentCode("SHIP-B");
        var original = service.read(stored);
        assertTrue(original.stream().anyMatch(field -> field.label().equals("Vận đơn") && field.value().equals("SHIP-A")));
        assertTrue(original.stream().anyMatch(field -> field.label().equals("Tài xế") && field.value().equals("Original driver")));
        assertFalse(original.stream().anyMatch(field -> field.value().equals("Replacement driver")));
    }

    @Test
    void oldConfirmationHasNoFabricatedEvidence() {
        var service = new ContainerControlEvidence(mock(ContainerCargoManifestItemRepository.class),
            mock(PreTripInspectionRepository.class), mock(com.ccadro.asset.repository.ContainerSafetyInspectionRepository.class), new ObjectMapper());
        assertTrue(service.read(null).isEmpty());
    }
}
