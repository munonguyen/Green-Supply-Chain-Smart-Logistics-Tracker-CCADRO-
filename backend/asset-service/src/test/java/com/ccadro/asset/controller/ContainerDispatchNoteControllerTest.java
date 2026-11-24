package com.ccadro.asset.controller;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.repository.ContainerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ContainerDispatchNoteControllerTest {
    @Test
    void noteCanBeRecordedInTransitWithoutChangingTripOrTelemetry() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ContainerRepository containers = mock(ContainerRepository.class);
        Container container = Container.builder().containerCode("TEST01").status(ContainerStatus.IN_TRANSIT).build();
        when(containers.findForControlUpdate("TEST01")).thenReturn(Optional.of(container));
        var controller = new ContainerDispatchNoteController(jdbc, containers);
        var response = controller.create("TEST01",
                new ContainerDispatchNoteController.NoteRequest("DELAY","  Chờ cổng cảng xác nhận  "),
                "ROLE_DISPATCHER", "dispatcher");
        assertEquals("Chờ cổng cảng xác nhận", response.getResult().content());
        assertEquals("dispatcher", response.getResult().createdBy());
        assertNotNull(response.getResult().createdAt());
        assertEquals(ContainerStatus.IN_TRANSIT,container.getStatus());
        assertNull(container.getLastTelemetryReceivedAt());
        verify(jdbc).update(contains("INSERT INTO container_dispatch_note"), any(Object[].class));
        verify(containers,never()).save(any());
    }

    @Test
    void driverCannotReadOrCreateInternalDispatchNotes() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ContainerRepository containers = mock(ContainerRepository.class);
        var controller = new ContainerDispatchNoteController(jdbc, containers);
        assertThrows(AppException.class, () -> controller.list("TEST01","ROLE_DRIVER"));
        assertThrows(AppException.class, () -> controller.create("TEST01",
                new ContainerDispatchNoteController.NoteRequest("OPERATIONS","Test"),"ROLE_DRIVER","driver"));
        verifyNoInteractions(jdbc,containers);
    }
}
