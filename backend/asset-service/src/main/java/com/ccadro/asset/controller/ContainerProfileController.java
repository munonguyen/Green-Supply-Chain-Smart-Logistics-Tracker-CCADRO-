package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.dto.request.ContainerProfileUpdateRequest;
import com.ccadro.asset.dto.response.ContainerResponse;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.ContainerMapper;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.service.ContainerControlService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/assets/containers")
@RequiredArgsConstructor
@Slf4j
public class ContainerProfileController {
    private final ContainerRepository containers;
    private final ContainerMapper mapper;
    private final ContainerControlService control;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    @PutMapping("/{code}/profile")
    @Transactional
    public ApiResponse<ContainerResponse> update(@PathVariable String code,
            @Valid @RequestBody ContainerProfileUpdateRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope,
            @RequestHeader(value = "X-Auth-Username", required = false) String username) {
        Set<String> roles = scope == null ? Set.of() : new HashSet<>(Arrays.asList(scope.trim().split("\\s+")));
        if (username == null || username.isBlank() || Collections.disjoint(roles,
                Set.of("ROLE_ADMIN", "ROLE_DISPATCHER", "ROLE_SAFETY_MANAGER"))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        var container = containers.findForControlUpdate(code)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));
        if (Boolean.TRUE.equals(container.getIsDeleted())) throw new AppException(ErrorCode.CONTAINER_NOT_FOUND);
        String status = container.getStatus().name();
        boolean protectedFieldsLocked = !Set.of("AVAILABLE", "MAINTENANCE", "ASSIGNED").contains(status)
                || (control.hasActiveRound(code) && control.isConfirmed(code, "PREPARATION"));
        Map<String,String> current = Map.of(
                "responsibleCompanyId", container.getResponsibleCompanyId() == null ? "" : container.getResponsibleCompanyId().toString(),
                "ownerName", text(container.getOwnerName()), "isoType", text(container.getIsoType()),
                "telematicsModel", text(container.getTelematicsModel()), "sealNumber", text(container.getESealNumber()));
        Map<String,String> desired = Map.of(
                "responsibleCompanyId", request.getResponsibleCompanyId() == null ? "" : request.getResponsibleCompanyId().toString(),
                "ownerName", text(request.getOwnerName()), "isoType", text(request.getIsoType()),
                "telematicsModel", text(request.getTelematicsModel()), "sealNumber", text(request.getSealNumber()));
        if (protectedFieldsLocked && (!Objects.equals(current.get("isoType"), desired.get("isoType"))
                || !Objects.equals(current.get("sealNumber"), desired.get("sealNumber")))) {
            throw new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT,
                    "Mã ISO và số niêm phong đã khóa theo chuyến. Các thông tin hồ sơ khác vẫn được cập nhật.");
        }
        if (!current.equals(request.getPreviousValues())) {
            throw new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT,
                    "Hồ sơ đã được người khác cập nhật. Tải lại dữ liệu trước khi lưu.");
        }
        if (!Objects.equals(request.getResponsibleCompanyId(), container.getResponsibleCompanyId())) {
            if (request.getResponsibleCompanyId() == null) {
                throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Cần chọn đơn vị phụ trách hợp lệ");
            }
            var companies = jdbc.query("""
                    SELECT company_code, company_name FROM companies WHERE id = ? AND NOT is_deleted
                    """, (row, index) -> Map.of("code", row.getString(1), "name", row.getString(2)),
                    request.getResponsibleCompanyId());
            if (companies.size() != 1) throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Đơn vị không còn hoạt động");
            container.setResponsibleCompanyId(request.getResponsibleCompanyId());
            container.setResponsibleCompanyCode(companies.get(0).get("code"));
            container.setResponsibleCompanyName(companies.get(0).get("name"));
        }
        container.setOwnerName(desired.get("ownerName"));
        container.setIsoType(desired.get("isoType"));
        container.setTelematicsModel(desired.get("telematicsModel"));
        container.setESealNumber(desired.get("sealNumber"));
        var saved = containers.save(container);
        jdbc.update("""
                INSERT INTO container_dispatch_note(container_code, category, content, created_by)
                VALUES (?, 'OPERATIONS', ?, ?)
                """, code, "Cập nhật hồ sơ: " + String.join(", ", desired.keySet().stream()
                    .filter(key -> !Objects.equals(current.get(key), desired.get(key))).toList())
                    + ". Lý do: " + request.getReason().trim(), username);
        // Configuring a device never stamps telemetry or marks the device online.
        log.info("Container profile changed code={} actor={} changedFields={} reason={}", code, username,
                desired.keySet().stream().filter(key -> !Objects.equals(current.get(key), desired.get(key))).toList(),
                request.getReason().replaceAll("[\\r\\n]", " "));
        return ApiResponse.success("Đã lưu hồ sơ container", mapper.toResponse(saved));
    }

    private String text(String value) { return value == null ? "" : value.trim(); }
}
