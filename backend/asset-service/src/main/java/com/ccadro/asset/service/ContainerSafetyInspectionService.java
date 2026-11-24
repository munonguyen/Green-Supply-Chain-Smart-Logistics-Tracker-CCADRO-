package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ContainerSafetyInspectionRequest;
import com.ccadro.asset.dto.response.ContainerSafetyInspectionResponse;
import com.ccadro.asset.dto.response.ContainerSafetyInspectionResponse.*;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.ContainerSafetyInspection;
import com.ccadro.asset.entity.ContainerControlRound;
import com.ccadro.asset.entity.enums.ContainerSafetyStatus;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.ContainerControlRoundRepository;
import com.ccadro.asset.repository.ContainerSafetyInspectionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContainerSafetyInspectionService {
    private static final Set<String> INSPECTOR_ROLES = Set.of("ADMIN", "DISPATCHER", "SAFETY_MANAGER");
    private final ContainerRepository containers;
    private final ContainerControlRoundRepository rounds;
    private final ContainerSafetyInspectionRepository inspections;
    private final ContainerSafetyTemplateRegistry templates;
    private final ObjectMapper json;

    public ContainerSafetyInspectionResponse get(String code, String scope) {
        requireRole(scope);
        Container container = requireContainer(code, false);
        List<ContainerSafetyInspection> history = inspections.findByContainerIdOrderByInspectionNumberDesc(container.getId());
        var latest = history.isEmpty() ? null : history.get(0);
        return new ContainerSafetyInspectionResponse(code, container.getContainerType().name(),
            latest == null ? 0 : latest.getRoundNumber(), ContainerSafetyTemplateRegistry.VERSION,
            templates.forType(container.getContainerType()), latest == null ? null : toResponse(latest),
            history.stream().map(this::toResponse).toList());
    }

    public List<Summary> overview(String scope) {
        requireRole(scope);
        Map<UUID, ContainerSafetyInspection> latest = inspections.findLatestForAllContainers().stream()
            .collect(Collectors.toMap(ContainerSafetyInspection::getContainerId, item -> item));
        return containers.findAll().stream().filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
            .sorted(Comparator.comparing(Container::getContainerCode)).map(c -> {
                var item = latest.get(c.getId());
                String status = item == null ? "NOT_STARTED" : item.getStatus().name();
                if (item != null && item.getStatus() == ContainerSafetyStatus.PASSED
                    && (item.getContainerType() != c.getContainerType()
                        || !ContainerSafetyTemplateRegistry.VERSION.equals(item.getTemplateVersion())
                        || item.getInspectedAt() == null
                        || item.getInspectedAt().isBefore(Instant.now().minus(java.time.Duration.ofHours(24))))) status = "EXPIRED";
                return new Summary(c.getContainerCode(), c.getContainerType().name(), c.getStatus().name(), c.getOwnerName(),
                    status, item == null ? 0 : item.getInspectionNumber(), item == null ? 0 : item.getCheckedItemsCount(),
                    templates.forType(c.getContainerType()).size(), item == null ? 0 : item.getFailedItemsCount(),
                    item == null ? null : item.getInspectedBy(), item == null ? null : item.getInspectedAt(),
                    item == null ? null : item.getUpdatedAt());
            }).toList();
    }

    @Transactional
    public ContainerSafetyInspectionResponse submit(String code, ContainerSafetyInspectionRequest request,
                                                     String actor, String scope) {
        String role = requireRole(scope);
        if (actor == null || actor.isBlank()) throw invalid("Thiếu người thực hiện kiểm tra.");
        Container container = requireContainer(code, true);
        if (container.getStatus() == ContainerStatus.IN_TRANSIT)
            throw invalid("Container đang vận chuyển; chỉ ghi nhận kiểm tra trực tiếp sau khi đã dừng chuyến.");
        ContainerControlRound round = null;
        if (request.getRoundNumber() != null) {
            round = rounds.findFirstByContainerCodeOrderByRoundNumberDesc(code)
                .orElseThrow(() -> invalid("Đợt kiểm soát không còn tồn tại; tải lại hồ sơ."));
            if (round.getCompletedAt() != null || round.getRoundNumber() != request.getRoundNumber())
                throw invalid("Đợt kiểm soát đã thay đổi; tải lại trước khi gửi biên bản.");
        }
        ContainerSafetyInspection previous = inspections.findFirstByContainerIdOrderByInspectionNumberDesc(container.getId()).orElse(null);
        ContainerSafetyInspection entity;
        if (request.getInspectionId() != null) {
            if (previous == null || !request.getInspectionId().equals(previous.getId())
                || previous.getStatus() != ContainerSafetyStatus.DRAFT
                || request.getRevision() == null || request.getRevision() != previous.getRevision())
                throw invalid("Hồ sơ đã được cập nhật hoặc hoàn tất; tải lại trước khi lưu.");
            entity = previous;
        } else {
            if (previous != null && previous.getStatus() == ContainerSafetyStatus.DRAFT)
                throw invalid("Đã có lần kiểm tra đang thực hiện. Tải lại để tiếp tục hồ sơ đó.");
            entity = ContainerSafetyInspection.builder().containerId(container.getId()).containerCode(code)
                .inspectionNumber(previous == null ? 1 : previous.getInspectionNumber() + 1)
                .controlRoundId(round == null ? null : round.getId()).roundNumber(round == null ? 0 : round.getRoundNumber()).build();
        }
        if (!ContainerSafetyTemplateRegistry.VERSION.equals(request.getTemplateVersion()))
            throw invalid("Checklist đã cập nhật phiên bản; tải lại trước khi gửi.");
        List<TemplateItem> definition = templates.forType(container.getContainerType());
        Map<String, TemplateItem> expected = definition.stream().collect(Collectors.toMap(TemplateItem::key, item -> item));
        Set<String> submitted = new HashSet<>();
        for (var check : request.getChecks()) {
            if (check == null || check.getStatus() == null || !Set.of("PASS", "FAIL").contains(check.getStatus()))
                throw invalid("Mỗi mục cần có kết quả Đạt hoặc Không đạt.");
            if (!submitted.add(check.getKey()) || !expected.containsKey(check.getKey()))
                throw invalid("Checklist không khớp với loại container hoặc có mục bị lặp.");
            boolean hasFailedCriterion = check.getCriteriaResults() != null
                && check.getCriteriaResults().values().stream().anyMatch("FAIL"::equals);
            if ("PASS".equals(check.getStatus()) && hasFailedCriterion)
                throw invalid("Không thể kết luận Đạt khi còn tiêu chí thành phần ở trạng thái Không đạt.");
            boolean hasStructuredReasons = check.getSelectedReasons() != null
                && check.getSelectedReasons().stream().anyMatch(r -> r != null && !r.isBlank());
            if ("FAIL".equals(check.getStatus()) && !hasStructuredReasons
                && (check.getNotes() == null || check.getNotes().trim().length() < 5))
                throw invalid("Ghi rõ hiện trạng hoặc chọn lý do cho từng mục không đạt (tối thiểu 5 ký tự).");
        }
        if (Boolean.TRUE.equals(request.getComplete()) && !submitted.equals(expected.keySet())) throw invalid("Cần kiểm tra đủ mọi mục bắt buộc của loại container này.");
        int failed = (int) request.getChecks().stream().filter(check -> "FAIL".equals(check.getStatus())).count();
        entity.setContainerType(container.getContainerType());
        entity.setTemplateVersion(ContainerSafetyTemplateRegistry.VERSION);
        entity.setStatus(!Boolean.TRUE.equals(request.getComplete()) ? ContainerSafetyStatus.DRAFT
            : failed == 0 ? ContainerSafetyStatus.PASSED : ContainerSafetyStatus.BLOCKED);
        entity.setFailedItemsCount(failed);
        entity.setCheckedItemsCount(request.getChecks().size());
        entity.setTotalItemsCount(definition.size());
        entity.setInspectedBy(actor);
        entity.setInspectorRole(role);
        entity.setInspectedAt(Boolean.TRUE.equals(request.getComplete()) ? Instant.now() : null);
        entity.setChecklistJson(encode(request.getChecks()));
        entity.setSummaryNotes(trimToNull(request.getSummaryNotes()));
        inspections.saveAndFlush(entity);
        return get(code, scope);
    }

    public ContainerSafetyInspection latestPassedFor(Container container, ContainerControlRound round) {
        if (container == null || round == null) return null;
        ContainerSafetyInspection latest = inspections.findFirstByContainerIdOrderByInspectionNumberDesc(container.getId()).orElse(null);
        if (latest == null || latest.getStatus() != ContainerSafetyStatus.PASSED
            || latest.getContainerType() != container.getContainerType()
            || !ContainerSafetyTemplateRegistry.VERSION.equals(latest.getTemplateVersion())
            || latest.getInspectedAt() == null
            || latest.getInspectedAt().isBefore(Instant.now().minus(java.time.Duration.ofHours(24)))) return null;
        return latest;
    }

    private Container requireContainer(String code, boolean lock) {
        Container container = (lock ? containers.findForControlUpdate(code) : containers.findByContainerCode(code))
            .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container."));
        if (Boolean.TRUE.equals(container.getIsDeleted())) throw new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container.");
        if (container.getContainerType() == null) throw invalid("Container chưa khai báo loại container.");
        return container;
    }

    private String requireRole(String scope) {
        if (scope != null) for (String role : INSPECTOR_ROLES) {
            if (Arrays.asList(scope.trim().split("\\s+")).contains("ROLE_" + role)) return role;
        }
        throw new AppException(ErrorCode.UNAUTHORIZED, "Chỉ điều phối hoặc an toàn được lập biên bản kiểm tra.");
    }

    private String encode(List<ContainerSafetyInspectionRequest.CheckResult> checks) {
        try { return json.writeValueAsString(checks); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Cannot persist container safety checklist", error); }
    }

    private Inspection toResponse(ContainerSafetyInspection item) {
        try {
            var checks = json.readValue(item.getChecklistJson(), new TypeReference<List<CheckResult>>() {});
            return new Inspection(item.getId(), item.getRoundNumber(), item.getStatus().name(), item.getFailedItemsCount(), item.getInspectedBy(),
                item.getInspectorRole(), item.getInspectedAt(), item.getSummaryNotes(), item.getTemplateVersion(),
                item.getContainerType().name(), checks, item.getInspectionNumber(), item.getCheckedItemsCount(),
                item.getTotalItemsCount(), item.getRevision(), item.getUpdatedAt());
        } catch (JsonProcessingException error) { throw new IllegalStateException("Invalid saved container checklist", error); }
    }

    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private AppException invalid(String message) { return new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, message); }
}
