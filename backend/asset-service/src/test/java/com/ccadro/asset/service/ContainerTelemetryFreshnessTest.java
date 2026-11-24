package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ContainerTelemetryUpdateRequest;
import com.ccadro.asset.dto.request.ContainerCscUpdateRequest;
import com.ccadro.asset.dto.response.ContainerResponse;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.mapper.ContainerMapper;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.DriverRepository;
import com.ccadro.asset.repository.VehicleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContainerTelemetryFreshnessTest {
    @Mock ContainerRepository containerRepository;
    @Mock DriverRepository driverRepository;
    @Mock VehicleRepository vehicleRepository;
    @Mock ContainerMapper containerMapper;
    @Mock ContainerControlService controlService;
    @InjectMocks ContainerService service;

    @Test
    void gpsAndTemperaturePartialPacketOnlyRefreshesTheFieldsItContains() {
        Instant old = Instant.parse("2025-01-01T00:00:00Z");
        Container container = Container.builder()
                .containerCode("REEFER-01")
                .lastTelemetryReceivedAt(old)
                .lastPositionReceivedAt(old)
                .lastSupplyAirTempAt(old)
                .lastReturnAirTempAt(old)
                .lastHumidityAt(old)
                .lastBatteryAt(old)
                .build();
        when(containerRepository.findForControlUpdate("REEFER-01")).thenReturn(Optional.of(container));
        when(containerRepository.save(any(Container.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(containerMapper.toResponse(any(Container.class))).thenReturn(ContainerResponse.builder().build());

        service.updateTelemetry("REEFER-01", ContainerTelemetryUpdateRequest.builder()
                .lastLatitude(BigDecimal.valueOf(10.75))
                .lastLongitude(BigDecimal.valueOf(106.67))
                .supplyAirTempC(BigDecimal.valueOf(-17.5))
                .build());

        assertNotEquals(old, container.getLastTelemetryReceivedAt());
        assertNotEquals(old, container.getLastPositionReceivedAt());
        assertNotEquals(old, container.getLastPositionObservedAt());
        assertNotEquals(old, container.getLastSupplyAirTempAt());
        assertEquals(old, container.getLastReturnAirTempAt());
        assertEquals(old, container.getLastHumidityAt());
        assertEquals(old, container.getLastBatteryAt());
    }

    @Test
    void devicePositionPreservesObservedTimeSeparatelyFromServerReceiptTime() {
        Instant observed = Instant.parse("2025-04-01T12:00:00Z");
        Container container = Container.builder().containerCode("DEVICE-01").build();
        when(containerRepository.findForControlUpdate("DEVICE-01")).thenReturn(Optional.of(container));
        when(containerRepository.save(any(Container.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(containerMapper.toResponse(any(Container.class))).thenReturn(ContainerResponse.builder().build());
        service.updateTelemetry("DEVICE-01", ContainerTelemetryUpdateRequest.builder()
            .lastLatitude(BigDecimal.valueOf(10.8)).lastLongitude(BigDecimal.valueOf(106.7)).build(), observed);
        assertEquals(observed, container.getLastPositionObservedAt());
        assertNotEquals(observed, container.getLastPositionReceivedAt());
    }

    @Test
    void reeferSetPointAndAlarmHaveIndependentReceiptTimes() {
        Instant old = Instant.parse("2025-01-01T00:00:00Z");
        Container container = Container.builder()
                .containerCode("REEFER-02")
                .lastReeferSetPointAt(old)
                .lastReeferAlarmAt(old)
                .build();
        when(containerRepository.findForControlUpdate("REEFER-02")).thenReturn(Optional.of(container));
        when(containerRepository.save(any(Container.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(containerMapper.toResponse(any(Container.class))).thenReturn(ContainerResponse.builder().build());

        service.updateTelemetry("REEFER-02", ContainerTelemetryUpdateRequest.builder()
                .reeferTemperatureAlarmStatus("HIGH_TEMP")
                .build());

        assertEquals(old, container.getLastReeferSetPointAt());
        assertNotEquals(old, container.getLastReeferAlarmAt());
    }

    @Test
    void cscUpdateNormalizesFieldsToTheSelectedInspectionScheme() {
        Container container = Container.builder()
                .containerCode("DRY-01")
                .cscAcepProgramNumber("OLD-ACEP")
                .cscNextExaminationDate(LocalDate.parse("2025-01-01"))
                .build();
        when(containerRepository.findForControlUpdate("DRY-01")).thenReturn(Optional.of(container));
        when(containerRepository.save(any(Container.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(containerMapper.toResponse(any(Container.class))).thenReturn(ContainerResponse.builder().build());

        service.updateCscData("DRY-01", ContainerCscUpdateRequest.builder()
                .cscApprovalCountry(" Vietnam ")
                .cscApprovalReference(" CSC-2026-01 ")
                .cscInspectionScheme("PERIODIC")
                .cscNextExaminationDate(LocalDate.parse("2028-01-01"))
                .cscAcepProgramNumber("IGNORED-ACEP")
                .build());

        assertEquals("Vietnam", container.getCscApprovalCountry());
        assertEquals("CSC-2026-01", container.getCscApprovalReference());
        assertEquals("PERIODIC", container.getCscInspectionScheme());
        assertEquals(LocalDate.parse("2028-01-01"), container.getCscNextExaminationDate());
        assertEquals(null, container.getCscAcepProgramNumber());
    }
}
