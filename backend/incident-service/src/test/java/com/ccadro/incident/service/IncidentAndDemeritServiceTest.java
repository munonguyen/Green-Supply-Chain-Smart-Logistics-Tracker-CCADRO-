package com.ccadro.incident.service;

import com.ccadro.incident.client.EmergencyNotificationPublisher;
import com.ccadro.incident.configuration.CcadroProperties;
import com.ccadro.incident.dto.request.ExceptionResolutionRequest;
import com.ccadro.incident.dto.request.FieldIncidentCreateRequest;
import com.ccadro.incident.dto.response.DriverDemeritSummaryResponse;
import com.ccadro.incident.dto.response.FieldIncidentResponse;
import com.ccadro.incident.entity.DemeritRecord;
import com.ccadro.incident.entity.ExceptionResolution;
import com.ccadro.incident.entity.FieldIncident;
import com.ccadro.incident.exception.AppException;
import com.ccadro.incident.exception.ErrorCode;
import com.ccadro.incident.mapper.FieldIncidentMapper;
import com.ccadro.incident.repository.DemeritRecordRepository;
import com.ccadro.incident.repository.ExceptionResolutionRepository;
import com.ccadro.incident.repository.FieldIncidentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentAndDemeritServiceTest {

    @Mock
    FieldIncidentRepository fieldIncidentRepository;
    @Mock
    ExceptionResolutionRepository exceptionResolutionRepository;
    @Mock
    DemeritRecordRepository demeritRecordRepository;
    @Mock
    FieldIncidentMapper fieldIncidentMapper;
    @Mock
    EmergencyNotificationPublisher notificationPublisher;

    @Test
    void fieldIncidentAndResolution_shouldNeverAutoPenalizeAndShouldEscalateOnlyOnHumanDecision() {
        CcadroProperties props = new CcadroProperties();
        DemeritGovernanceService demeritService = new DemeritGovernanceService(demeritRecordRepository, props);
        ExceptionResolutionService resolutionService = new ExceptionResolutionService(
                fieldIncidentRepository,
                exceptionResolutionRepository,
                demeritService,
                fieldIncidentMapper
        );
        FieldIncidentService incidentService = new FieldIncidentService(
                fieldIncidentRepository,
                fieldIncidentMapper,
                notificationPublisher,
                resolutionService,
                demeritService
        );

        UUID driverId = UUID.randomUUID();
        UUID tripId = UUID.randomUUID();
        UUID incidentId = UUID.randomUUID();

        // 1. BRULE-17: Reporting an incident notifies Dispatcher without issuing demerits
        FieldIncident entity = new FieldIncident();
        entity.setId(incidentId);
        entity.setDriverId(driverId);
        entity.setTripId(tripId);
        entity.setIncidentType("ROAD_FLOOD");
        entity.setSeverity("CRITICAL");
        entity.setDescription("Ngập sâu quốc lộ 1A");
        entity.setStatus("PENDING_REVIEW");

        when(fieldIncidentMapper.toEntity(any())).thenReturn(entity);
        when(fieldIncidentRepository.findByIncidentCode("INC-2026-01")).thenReturn(Optional.empty());
        when(fieldIncidentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(fieldIncidentMapper.toResponse(any())).thenAnswer(inv -> {
            FieldIncident fi = inv.getArgument(0);
            FieldIncidentResponse resp = new FieldIncidentResponse();
            resp.setId(fi.getId());
            resp.setIncidentCode(fi.getIncidentCode());
            resp.setStatus(fi.getStatus());
            return resp;
        });

        FieldIncidentResponse created = incidentService.createIncident(FieldIncidentCreateRequest.builder()
                .incidentCode("INC-2026-01")
                .tripId(tripId)
                .driverId(driverId)
                .incidentType("ROAD_FLOOD")
                .severity("CRITICAL")
                .description("Ngập sâu quốc lộ 1A")
                .build());

        assertEquals("INC-2026-01", created.getIncidentCode());
        verifyNoInteractions(demeritRecordRepository);

        // 2. Escalating to demerit transitions incident and accumulates points to WARNING (>= 10)
        DemeritRecord prior = new DemeritRecord();
        prior.setPoints(6);
        prior.setStatus("RECORDED");
        when(fieldIncidentRepository.findById(incidentId)).thenReturn(Optional.of(entity));
        when(exceptionResolutionRepository.findByIncidentId(incidentId)).thenReturn(Optional.empty());
        when(demeritRecordRepository.findByDriverId(driverId)).thenReturn(List.of(prior));
        when(demeritRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(fieldIncidentMapper.toResolutionEntity(eq(incidentId), any())).thenReturn(new ExceptionResolution());
        when(exceptionResolutionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ExceptionResolution resolution = incidentService.resolveIncident(incidentId, ExceptionResolutionRequest.builder()
                .reviewedBy("safety_mgr_01")
                .decision("ESCALATE_TO_DEMERIT")
                .demeritPoints(5)
                .reviewNotes("Đi sai tuyến không báo trước")
                .build());

        assertEquals("RESOLVED", entity.getStatus());
        assertEquals("ESCALATE_TO_DEMERIT", resolution.getDecision());
        verify(demeritRecordRepository).save(argThat(d -> "WARNING".equals(d.getStatus()) && d.getPoints() == 5));

        // 3. Re-resolving a closed incident must fail with RESOLUTION_ALREADY_CLOSED
        AppException dupEx = assertThrows(AppException.class, () ->
                incidentService.resolveIncident(incidentId, ExceptionResolutionRequest.builder()
                        .reviewedBy("safety_mgr_01")
                        .decision("APPROVED_EXCUSED")
                        .build()));
        assertEquals(ErrorCode.RESOLUTION_ALREADY_CLOSED, dupEx.getErrorCode());
    }

    @Test
    void demeritGovernance_shouldRequireHumanReviewAtTwentyPointsWithoutAutoBlacklisting() {
        CcadroProperties props = new CcadroProperties();
        DemeritGovernanceService service = new DemeritGovernanceService(demeritRecordRepository, props);
        UUID driverId = UUID.randomUUID();

        DemeritRecord r1 = new DemeritRecord();
        r1.setPoints(12);
        r1.setStatus("WARNING");
        DemeritRecord r2 = new DemeritRecord();
        r2.setPoints(10);
        r2.setStatus("REVIEW_REQUIRED");
        DemeritRecord dismissed = new DemeritRecord();
        dismissed.setPoints(50);
        dismissed.setStatus("DISMISSED");

        when(demeritRecordRepository.findByDriverId(driverId)).thenReturn(List.of(r1, r2, dismissed));

        DriverDemeritSummaryResponse summary = service.getDriverDemeritSummary(driverId);
        // Dismissed points excluded (12 + 10 = 22 >= 20 -> REVIEW_REQUIRED, not BLACKLISTED)
        assertEquals(22, summary.getTotalActivePoints());
        assertEquals("REVIEW_REQUIRED", summary.getGovernanceStatus());
    }
}

