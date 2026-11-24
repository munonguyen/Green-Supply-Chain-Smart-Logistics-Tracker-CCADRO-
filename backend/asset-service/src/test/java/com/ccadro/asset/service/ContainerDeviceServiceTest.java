package com.ccadro.asset.service;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.ContainerRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ContainerDeviceServiceTest {
    @Test
    void configuringDeviceDuringTransitStoresOnlyKeyHashAndDoesNotInventGps() {
        var jdbc=mock(JdbcTemplate.class);
        var containers=mock(ContainerRepository.class);
        var telemetry=mock(ContainerService.class);
        var container=Container.builder().containerCode("TEST01").status(ContainerStatus.IN_TRANSIT).build();
        when(containers.findForControlUpdate("TEST01")).thenReturn(Optional.of(container));
        when(containers.findByContainerCode("TEST01")).thenReturn(Optional.of(container));
        when(containers.findForControlUpdate("TEST01")).thenReturn(Optional.of(container));
        var service=new ContainerDeviceService(jdbc,containers,telemetry,new ObjectMapper());
        var result=service.configure("TEST01",new ContainerDeviceService.Configure("IMEI001","GPS","Đối soát"),"dispatcher");
        assertNotNull(result.deviceKey());
        assertTrue(result.deviceKey().length()>=40);
        var hash=ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(contains("INSERT INTO container_device_connection"),
            eq("TEST01"),eq("IMEI001"),eq("GPS"),hash.capture(),eq("dispatcher"));
        assertNotEquals(result.deviceKey(),hash.getValue());
        assertEquals(64,hash.getValue().length());
        assertNull(container.getLastTelemetryReceivedAt());
        verifyNoInteractions(telemetry);
    }

    @Test
    void devicePacketCarriesObservedAtIntoContainerPosition() {
        var jdbc=mock(JdbcTemplate.class);
        var containers=mock(ContainerRepository.class);
        var telemetry=mock(ContainerService.class);
        var container=Container.builder().containerCode("TEST01").status(ContainerStatus.IN_TRANSIT).build();
        when(containers.findByContainerCode("TEST01")).thenReturn(Optional.of(container));
        when(containers.findForControlUpdate("TEST01")).thenReturn(Optional.of(container));
        var service=new ContainerDeviceService(jdbc,containers,telemetry,new ObjectMapper().findAndRegisterModules());
        var keyHash = org.springframework.test.util.ReflectionTestUtils.invokeMethod(service, "hash", "device-key");
        when(jdbc.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class), any(Object[].class)))
            .thenAnswer(invocation -> {
                String sql = invocation.getArgument(0);
                if (sql.contains("SELECT container_code FROM container_device_connection")) return java.util.List.of("TEST01");
                if (sql.contains("SELECT key_hash FROM container_device_connection")) return java.util.List.of(keyHash);
                if (sql.contains("SELECT container_code,device_id,payload")) return java.util.List.of();
                if (sql.contains("SELECT last_observed_at FROM container_device_connection")) return java.util.List.of(java.util.Optional.empty());
                return java.util.List.of();
            });
        var observed=java.time.Instant.now().minusSeconds(30);
        var packet=new ContainerDeviceService.Packet(java.util.UUID.randomUUID(), observed,
            java.math.BigDecimal.valueOf(10.8),java.math.BigDecimal.valueOf(106.7),java.math.BigDecimal.valueOf(32),
            java.math.BigDecimal.valueOf(-18.2), java.math.BigDecimal.valueOf(-17.8), java.math.BigDecimal.valueOf(-18.0),
            "OK", java.math.BigDecimal.valueOf(62), java.math.BigDecimal.valueOf(0.8), 94, "SEALED", 100);
        assertDoesNotThrow(() -> service.receive("IMEI001","device-key",packet));
        var reqCaptor = ArgumentCaptor.forClass(com.ccadro.asset.dto.request.ContainerTelemetryUpdateRequest.class);
        verify(telemetry).updateTelemetry(eq("TEST01"), reqCaptor.capture(), eq(observed));
        assertEquals(java.math.BigDecimal.valueOf(-18.2), reqCaptor.getValue().getSupplyAirTempC());
        assertEquals("SEALED", reqCaptor.getValue().getESealStatus());
        assertEquals(94, reqCaptor.getValue().getBatteryPct());
    }

    @Test
    void missingDeviceCredentialCannotWriteGps() {
        var jdbc=mock(JdbcTemplate.class);
        var containers=mock(ContainerRepository.class);
        var telemetry=mock(ContainerService.class);
        var service=new ContainerDeviceService(jdbc,containers,telemetry,new ObjectMapper());
        var error=assertThrows(AppException.class,()->service.receive("IMEI001",null,null));
        assertEquals(ErrorCode.UNAUTHENTICATED,error.getErrorCode());
        verifyNoInteractions(containers,telemetry);
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
}
