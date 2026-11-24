package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ContainerSafetyInspectionRequest;
import com.ccadro.asset.dto.response.ContainerSafetyInspectionResponse;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.ContainerControlRound;
import com.ccadro.asset.entity.ContainerSafetyInspection;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.ContainerType;
import com.ccadro.asset.entity.enums.ContainerSafetyStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.repository.ContainerControlRoundRepository;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.ContainerSafetyInspectionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ContainerSafetyInspectionServiceTest {
    @Test
    void templatesCoverEveryContainerTypeWithSpecificOperationalChecks() {
        var registry = new ContainerSafetyTemplateRegistry();
        for (ContainerType type : ContainerType.values()) {
            var items = registry.forType(type);
            assertTrue(items.size() >= 7, type.name());
            assertEquals(items.size(), items.stream().map(item -> item.key()).distinct().count(), type.name());
            assertTrue(items.stream().allMatch(ContainerSafetyInspectionResponse.TemplateItem::critical));
        }
        assertTrue(registry.forType(ContainerType.REEFER_40FT).stream().anyMatch(item -> item.key().equals("reefer_setpoint_test")));
        assertTrue(registry.forType(ContainerType.FLAT_RACK).stream().anyMatch(item -> item.key().equals("flat_lashing_points")));
        assertTrue(registry.forType(ContainerType.OPEN_TOP).stream().anyMatch(item -> item.key().equals("open_top_roof")));
        assertFalse(registry.forType(ContainerType.DRY_40FT).stream().anyMatch(item -> item.key().startsWith("reefer_")));
        assertFalse(registry.forType(ContainerType.FLAT_RACK).stream().anyMatch(item -> item.key().equals("walls_roof") || item.key().equals("doors_locking")));
    }

    @Test
    void inspectionCanBeCompletedInWarehouseWithoutShipmentOrControlRound() {
        var f = new Fixture();
        var result = f.submit(f.request(true));
        assertEquals("PASSED", result.inspection().status());
        assertEquals(1, result.inspection().inspectionNumber());
        assertEquals(0, result.inspection().roundNumber());
        assertNull(f.saved.get(0).getControlRoundId());
        assertEquals(ContainerStatus.AVAILABLE, f.container.getStatus());
        verifyNoInteractions(f.rounds);
        assertNotNull(f.service.latestPassedFor(f.container, f.round));
    }

    @Test
    void savedDraftResumesAndIncompleteAssessmentCannotBeFinalized() {
        var f = new Fixture();
        var draft = f.request(false); draft.setChecks(draft.getChecks().subList(0, 1));
        var result = f.submit(draft);
        assertEquals("DRAFT", result.inspection().status());
        assertEquals(1, result.inspection().checkedItemsCount());
        assertNull(result.inspection().inspectedAt());
        assertNull(f.service.latestPassedFor(f.container, f.round));
        var finish = f.request(true); finish.setInspectionId(result.inspection().id()); finish.setRevision(result.inspection().revision());
        finish.setChecks(finish.getChecks().subList(0, 1));
        assertThrows(AppException.class, () -> f.submit(finish));
        finish.setChecks(f.request(true).getChecks());
        result = f.submit(finish);
        assertEquals("PASSED", result.inspection().status());
        assertEquals(1, result.history().size());
        assertEquals(result.template().size(), result.inspection().checkedItemsCount());
    }

    @Test
    void newerDraftOrFailureRevokesOldPassAndHistoryRemainsSeparate() {
        var f = new Fixture();
        f.submit(f.request(true));
        var draft = f.request(false); draft.setChecks(List.of());
        var result = f.submit(draft);
        assertNull(f.service.latestPassedFor(f.container, f.round));
        var failure = f.request(true); failure.setInspectionId(result.inspection().id()); failure.setRevision(result.inspection().revision());
        failure.getChecks().get(0).setStatus("FAIL"); failure.getChecks().get(0).setNotes("Khung bị nứt cần sửa chữa.");
        result = f.submit(failure);
        assertEquals("BLOCKED", result.inspection().status());
        assertEquals(1, result.inspection().failedItemsCount());
        assertNull(f.service.latestPassedFor(f.container, f.round));
        result = f.submit(f.request(true));
        assertEquals(3, result.history().size());
        assertEquals(List.of("PASSED", "BLOCKED", "PASSED"), result.history().stream().map(ContainerSafetyInspectionResponse.Inspection::status).toList());
        assertNotNull(f.service.latestPassedFor(f.container, f.round));
    }

    @Test
    void completedRecordsAndStaleDraftRevisionsCannotBeOverwritten() {
        var f = new Fixture();
        var draft = f.submit(f.request(false));
        var update = f.request(false); update.setInspectionId(draft.inspection().id()); update.setRevision(draft.inspection().revision() - 1);
        assertThrows(AppException.class, () -> f.submit(update));
        assertThrows(AppException.class, () -> f.submit(f.request(false)), "Do not create two open drafts");
        update.setRevision(draft.inspection().revision()); update.setComplete(true);
        f.submit(update);
        update.setRevision(f.saved.get(0).getRevision());
        assertThrows(AppException.class, () -> f.submit(update));
        assertEquals(1, f.saved.size());
    }

    @Test
    void rejectsMissingFailureNotesDuplicateKeysWrongTemplateAndMovingContainer() {
        var f = new Fixture();
        var failed = f.request(true); failed.getChecks().get(0).setStatus("FAIL");
        assertThrows(AppException.class, () -> f.submit(failed));
        var wrong = f.request(true); wrong.setTemplateVersion("old");
        assertThrows(AppException.class, () -> f.submit(wrong));
        var duplicate = f.request(true); duplicate.getChecks().get(1).setKey(duplicate.getChecks().get(0).getKey());
        assertThrows(AppException.class, () -> f.submit(duplicate));
        f.container.setStatus(ContainerStatus.IN_TRANSIT);
        assertThrows(AppException.class, () -> f.submit(f.request(false)));
        assertTrue(f.saved.isEmpty());
    }

    @Test
    void expiredOrWrongTypeOrWrongVersionCannotAuthorizeDeparture() {
        var f = new Fixture(); f.submit(f.request(true)); var record = f.saved.get(0);
        record.setInspectedAt(Instant.now().minusSeconds(90000));
        assertNull(f.service.latestPassedFor(f.container, f.round));
        record.setInspectedAt(Instant.now()); record.setContainerType(ContainerType.REEFER_20FT);
        assertNull(f.service.latestPassedFor(f.container, f.round));
        record.setContainerType(f.container.getContainerType()); record.setTemplateVersion("OLD");
        assertNull(f.service.latestPassedFor(f.container, f.round));
    }

    @Test
    void templatesProvideDetailedStandardsObjectivesCriteriaAndFailureReasons() {
        var registry = new ContainerSafetyTemplateRegistry();
        for (ContainerType type : ContainerType.values()) {
            for (var item : registry.forType(type)) {
                assertNotNull(item.standardRef(), item.key());
                assertNotNull(item.objective(), item.key());
                assertFalse(item.criteria().isEmpty(), item.key());
                assertFalse(item.failureReasons().isEmpty(), item.key());
            }
        }
    }

    @Test
    void rejectsPassWhenCriterionFailsAndPersistsStructuredMeasurementsAndReasons() {
        var f = new Fixture();
        var inconsistent = f.request(true);
        inconsistent.getChecks().get(0).setCriteriaResults(Map.of("top_rail_bow", "FAIL"));
        assertThrows(AppException.class, () -> f.submit(inconsistent));

        var detailedFail = f.request(true);
        var check = detailedFail.getChecks().get(0);
        check.setStatus("FAIL");
        check.setCriteriaResults(Map.of("top_rail_bow", "FAIL", "weld_corrosion", "PASS"));
        check.setMeasurements(Map.of("top_rail_bow", "36"));
        check.setSelectedReasons(List.of("Xà dọc trên cong/võng vượt ngưỡng 30 mm (IICL-6)"));
        var savedResp = f.submit(detailedFail);
        assertEquals("BLOCKED", savedResp.inspection().status());
        var persistedCheck = savedResp.inspection().checks().get(0);
        assertEquals("36", persistedCheck.measurements().get("top_rail_bow"));
        assertEquals("FAIL", persistedCheck.criteriaResults().get("top_rail_bow"));
        assertEquals(List.of("Xà dọc trên cong/võng vượt ngưỡng 30 mm (IICL-6)"), persistedCheck.selectedReasons());
    }

    @Test
    void overviewShowsPersistedProgressAndRejectsUnauthorizedReaders() {
        var f = new Fixture(); var request = f.request(false); request.setChecks(request.getChecks().subList(0, 2)); f.submit(request);
        var summaries = f.service.overview("ROLE_DISPATCHER");
        assertEquals(1, summaries.size()); assertEquals("DRAFT", summaries.get(0).status()); assertEquals(2, summaries.get(0).checkedItemsCount());
        assertThrows(AppException.class, () -> f.service.overview("ROLE_DRIVER"));
        assertThrows(AppException.class, () -> f.service.submit("TEST-01", f.request(true), "driver", "ROLE_DRIVER"));
    }

    private static class Fixture {
        final ContainerRepository containers = mock(ContainerRepository.class);
        final ContainerControlRoundRepository rounds = mock(ContainerControlRoundRepository.class);
        final ContainerSafetyInspectionRepository inspections = mock(ContainerSafetyInspectionRepository.class);
        final ContainerSafetyInspectionService service = new ContainerSafetyInspectionService(containers, rounds, inspections,
            new ContainerSafetyTemplateRegistry(), new ObjectMapper().findAndRegisterModules());
        final Container container = Container.builder().id(UUID.randomUUID()).containerCode("TEST-01").containerType(ContainerType.DRY_20FT).status(ContainerStatus.AVAILABLE).build();
        final ContainerControlRound round = ContainerControlRound.builder().id(UUID.randomUUID()).startedAt(Instant.now()).build();
        final List<ContainerSafetyInspection> saved = new ArrayList<>();
        Fixture() {
            when(containers.findForControlUpdate("TEST-01")).thenReturn(Optional.of(container));
            when(containers.findByContainerCode("TEST-01")).thenReturn(Optional.of(container));
            when(containers.findAll()).thenReturn(List.of(container));
            when(inspections.findFirstByContainerIdOrderByInspectionNumberDesc(container.getId())).thenAnswer(c -> saved.stream().max(Comparator.comparingInt(ContainerSafetyInspection::getInspectionNumber)));
            when(inspections.findByContainerIdOrderByInspectionNumberDesc(container.getId())).thenAnswer(c -> saved.stream().sorted(Comparator.comparingInt(ContainerSafetyInspection::getInspectionNumber).reversed()).toList());
            when(inspections.findLatestForAllContainers()).thenAnswer(c -> saved.isEmpty() ? List.of() : List.of(saved.get(saved.size() - 1)));
            when(inspections.saveAndFlush(any())).thenAnswer(c -> {
                var record = c.<ContainerSafetyInspection>getArgument(0);
                if (record.getId() == null) { record.setId(UUID.randomUUID()); saved.add(record); }
                record.setRevision(record.getRevision() + 1); record.setUpdatedAt(Instant.now()); return record;
            });
        }
        ContainerSafetyInspectionResponse submit(ContainerSafetyInspectionRequest request) { return service.submit("TEST-01", request, "dispatcher", "ROLE_DISPATCHER"); }
        ContainerSafetyInspectionRequest request(boolean complete) {
            var request = new ContainerSafetyInspectionRequest(); request.setComplete(complete); request.setTemplateVersion(ContainerSafetyTemplateRegistry.VERSION);
            request.setChecks(new ContainerSafetyTemplateRegistry().forType(container.getContainerType()).stream().map(item -> {
                var check = new ContainerSafetyInspectionRequest.CheckResult(); check.setKey(item.key()); check.setStatus("PASS"); return check;
            }).toList()); return request;
        }
    }
}
