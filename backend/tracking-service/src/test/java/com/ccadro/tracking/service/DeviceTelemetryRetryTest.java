package com.ccadro.tracking.service;

import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.entity.TelemetryEvent;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.mapper.TrackingMapper;
import com.ccadro.tracking.repository.TelemetryEventRepository;
import com.ccadro.tracking.repository.TripRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DeviceTelemetryRetryTest {
    @Test
    void retryReturnsOriginalPointWithoutAddingDistanceOrAlerts() {
        var events=mock(TelemetryEventRepository.class);
        var trips=mock(TripRepository.class);
        var mapper=mock(TrackingMapper.class);
        var deviation=mock(DeviationDetectionService.class);
        var reroute=mock(RerouteProposalService.class);
        var service=new TelemetryIngestionService(events,trips,mapper,mock(CcadroProperties.class),deviation,reroute);
        var request=new IngestTelemetryRequest();
        request.setTripId(UUID.randomUUID()); request.setExternalEventId(UUID.randomUUID());
        var existing=new TelemetryEvent(); existing.setTripId(request.getTripId());
        when(trips.findForDeviceTelemetry(request.getTripId())).thenReturn(Optional.of(new Trip()));
        when(events.findByExternalEventId(request.getExternalEventId())).thenReturn(Optional.of(existing));
        assertSame(existing,service.ingestTelemetry(request));
        verify(events,never()).save(any());
        verifyNoInteractions(mapper,deviation,reroute);
    }
    @Test
    void externalPacketIdCannotBeReusedOnAnotherTrip() {
        var events=mock(TelemetryEventRepository.class);
        var trips=mock(TripRepository.class);
        var service=new TelemetryIngestionService(events,trips,mock(TrackingMapper.class),mock(CcadroProperties.class),
            mock(DeviationDetectionService.class),mock(RerouteProposalService.class));
        var request=new IngestTelemetryRequest();
        request.setTripId(UUID.randomUUID());request.setExternalEventId(UUID.randomUUID());
        var existing=new TelemetryEvent();existing.setTripId(UUID.randomUUID());
        when(trips.findForDeviceTelemetry(request.getTripId())).thenReturn(Optional.of(new Trip()));
        when(events.findByExternalEventId(request.getExternalEventId())).thenReturn(Optional.of(existing));
        assertThrows(AppException.class,()->service.ingestTelemetry(request));
        verify(events,never()).save(any());
    }
}
