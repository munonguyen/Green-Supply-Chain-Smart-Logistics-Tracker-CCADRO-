package com.ccadro.asset.controller;

import com.ccadro.asset.dto.request.ContainerProfileUpdateRequest;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.ContainerMapper;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.service.ContainerControlService;
import org.junit.jupiter.api.Test;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContainerProfileControllerTest {
    final ContainerRepository containers = mock(ContainerRepository.class);
    final ContainerMapper mapper = mock(ContainerMapper.class);
    final ContainerControlService control = mock(ContainerControlService.class);
    final ContainerProfileController controller = new ContainerProfileController(containers, mapper, control, mock(org.springframework.jdbc.core.JdbcTemplate.class));

    private ContainerProfileUpdateRequest request() {
        var request = new ContainerProfileUpdateRequest();
        request.setOwnerName("New owner");
        request.setIsoType("45G1");
        request.setTelematicsModel("Device");
        request.setSealNumber("SEAL");
        request.setPreviousValues(Map.of("responsibleCompanyId", "", "ownerName","Old owner","isoType","45G1","telematicsModel","Device","sealNumber","SEAL"));
        request.setReason("Đối chiếu hồ sơ");
        return request;
    }

    private Container container(ContainerStatus status) {
        var container = Container.builder().containerCode("TEST01").status(status)
                .ownerName("Old owner").isoType("45G1").telematicsModel("Device").eSealNumber("SEAL").build();
        when(containers.findForControlUpdate("TEST01")).thenReturn(Optional.of(container));
        return container;
    }

    @Test
    void dispatcherCanUpdateProfileWithoutCreatingTelemetry() {
        Container container = container(ContainerStatus.AVAILABLE);
        when(containers.save(container)).thenReturn(container);
        controller.update("TEST01", request(), "ROLE_DISPATCHER", "dispatcher");
        assertEquals("New owner",container.getOwnerName());
        assertNull(container.getLastTelemetryReceivedAt());
        assertNull(container.getLastPositionReceivedAt());
        verify(containers).save(container);
    }

    @Test
    void staleProfileCannotOverwriteAnotherDispatchersChange() {
        Container container = container(ContainerStatus.AVAILABLE);
        container.setOwnerName("Changed by another dispatcher");
        var error = assertThrows(AppException.class, () -> controller.update("TEST01", request(), "ROLE_DISPATCHER", "dispatcher"));
        assertEquals(ErrorCode.CONTAINER_CONTROL_CONFLICT,error.getErrorCode());
        verify(containers,never()).save(any());
    }

    @Test
    void protectedFieldsAreLockedAfterPreparationAndDuringTransit() {
        container(ContainerStatus.ASSIGNED);
        when(control.hasActiveRound("TEST01")).thenReturn(true);
        when(control.isConfirmed("TEST01","PREPARATION")).thenReturn(true);
        var changedSeal = request();
        changedSeal.setSealNumber("NEW-SEAL");
        assertThrows(AppException.class, () -> controller.update("TEST01",changedSeal,"ROLE_DISPATCHER","dispatcher"));
        container(ContainerStatus.IN_TRANSIT);
        assertThrows(AppException.class, () -> controller.update("TEST01",changedSeal,"ROLE_DISPATCHER","dispatcher"));
        verify(containers,never()).save(any());
    }

    @Test
    void dispatcherCanCorrectOwnerDuringTransitWhileSealAndIsoStayLocked() {
        var container = container(ContainerStatus.IN_TRANSIT);
        when(containers.save(container)).thenReturn(container);
        controller.update("TEST01",request(),"ROLE_DISPATCHER","dispatcher");
        assertEquals("New owner",container.getOwnerName());
        assertEquals("SEAL",container.getESealNumber());
        assertNull(container.getLastTelemetryReceivedAt());
    }

    @Test
    void driverCannotEditContainerConfiguration() {
        var error = assertThrows(AppException.class, () -> controller.update("TEST01",request(),"ROLE_DRIVER","driver"));
        assertEquals(ErrorCode.UNAUTHORIZED,error.getErrorCode());
        verifyNoInteractions(containers);
    }
}
