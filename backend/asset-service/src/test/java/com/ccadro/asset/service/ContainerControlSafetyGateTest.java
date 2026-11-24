package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ContainerControlStageRequest;
import com.ccadro.asset.entity.*;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.ContainerType;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.repository.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ContainerControlSafetyGateTest {
    @Test
    void dispatcherCannotConfirmDepartureWithoutPassedInspectionForThisContainerAndRound() {
        var containers = mock(ContainerRepository.class);
        var rounds = mock(ContainerControlRoundRepository.class);
        var stages = mock(ContainerControlStageRepository.class);
        var cargo = mock(ContainerCargoManifestItemRepository.class);
        var drivers = mock(DriverRepository.class);
        var vehicles = mock(VehicleRepository.class);
        var vehiclePreTrip = mock(PreTripInspectionRepository.class);
        var containerPreTrip = mock(ContainerSafetyInspectionService.class);
        var eligibility = mock(DriverDispatchEligibility.class);
        var evidence = mock(ContainerControlEvidence.class);
        var service = new ContainerControlService(containers, rounds, stages, cargo, drivers, vehicles,
            vehiclePreTrip, containerPreTrip, eligibility, evidence);
        UUID vehicleId=UUID.randomUUID(), driverId=UUID.randomUUID(), shipmentId=UUID.randomUUID(), roundId=UUID.randomUUID();
        var container=Container.builder().id(UUID.randomUUID()).containerCode("DRY-01").containerType(ContainerType.DRY_20FT)
            .status(ContainerStatus.ASSIGNED).assignedVehicleId(vehicleId).assignedDriverId(driverId)
            .assignedShipmentId(shipmentId).assignedShipmentCode("SHIP-01").originName("Cảng A").destinationName("Kho B")
            .maxPayloadTons(BigDecimal.valueOf(20)).build();
        var round=ContainerControlRound.builder().id(roundId).containerCode("DRY-01").roundNumber(1)
            .startedAt(Instant.now().minusSeconds(30)).build();
        var preparation=ContainerControlStage.builder().roundId(roundId).stage("PREPARATION").checkedKeys("identity_condition")
            .completedAt(Instant.now().minusSeconds(10)).build();
        var item=ContainerCargoManifestItem.builder().containerCode("DRY-01").shipmentCode("SHIP-01")
            .itemCode("ITEM-01").cargoName("Hàng").weightKg(1000.0).isDeleted(false).build();
        when(containers.findForControlUpdate("DRY-01")).thenReturn(Optional.of(container));
        when(rounds.findFirstByContainerCodeOrderByRoundNumberDesc("DRY-01")).thenReturn(Optional.of(round));
        when(stages.findByRoundIdOrderByCompletedAtAsc(roundId)).thenReturn(List.of(preparation));
        when(cargo.findByContainerCodeOrderByItemCodeAsc("DRY-01")).thenReturn(List.of(item));
        when(containerPreTrip.latestPassedFor(container, round)).thenReturn(null);
        var request=new ContainerControlStageRequest(); request.setRoundNumber(1);
        request.setCheckedKeys(List.of("vehicle_driver", "seal_verified", "route_handover"));
        request.setNotes("Đã đối chiếu hành trình và chứng từ.");
        assertThrows(AppException.class, () -> service.complete("DRY-01", "DEPARTURE", request, "dispatcher", "ROLE_DISPATCHER"));
        verify(stages, never()).save(any());
        verifyNoInteractions(drivers, vehicles, vehiclePreTrip);
    }
}
