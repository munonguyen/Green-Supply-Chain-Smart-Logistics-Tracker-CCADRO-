package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.StaffProfileRequest;
import com.ccadro.identity.dto.request.StaffVerificationRequest;
import com.ccadro.identity.dto.response.RoleStaffSummaryResponse;
import com.ccadro.identity.dto.response.StaffProfileResponse;
import com.ccadro.identity.entity.StaffProfile;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.MapperTextUtils;
import com.ccadro.identity.mapper.StaffProfileMapper;
import com.ccadro.identity.repository.StaffProfileRepository;
import com.ccadro.identity.validate.StaffComplianceValidator;
import com.ccadro.identity.validate.StaffOrganizationValidator;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffProfileService {

    StaffProfileMapper staffProfileMapper;
    StaffProfileRepository staffProfileRepository;
    StaffComplianceValidator staffComplianceValidator;
    StaffOrganizationValidator staffOrganizationValidator;

    public List<StaffProfileResponse> getStaff(
            String q,
            String roleCode,
            UUID branchId,
            String status,
            boolean includeDeleted) {
        return getStaff(q, roleCode, null, null, branchId, status, includeDeleted);
    }

    public List<StaffProfileResponse> getStaff(
            String q,
            String roleCode,
            String staffCategory,
            String verificationStatus,
            UUID branchId,
            String status,
            boolean includeDeleted) {
        String normalizedRole = MapperTextUtils.normalizeFilter(roleCode);
        String normalizedCategory = MapperTextUtils.normalizeFilter(staffCategory);
        String normalizedVerification = MapperTextUtils.normalizeFilter(verificationStatus);
        String normalizedStatus = MapperTextUtils.normalizeFilter(status);

        List<StaffProfile> filtered = staffProfileRepository.findAll().stream()
                .filter(s -> includeDeleted || !Boolean.TRUE.equals(s.getIsDeleted()))
                .filter(s -> normalizedRole == null || normalizedRole.equalsIgnoreCase(s.getRoleCode()))
                .filter(s -> normalizedCategory == null
                        || normalizedCategory.equalsIgnoreCase(MapperTextUtils.resolveStaffCategory(s.getRoleCode(), s.getStaffCategory())))
                .filter(s -> normalizedVerification == null
                        || normalizedVerification.equalsIgnoreCase(s.getVerificationStatus() != null ? s.getVerificationStatus() : "PENDING_REVIEW"))
                .filter(s -> branchId == null || branchId.equals(s.getBranchId()))
                .filter(s -> normalizedStatus == null || normalizedStatus.equalsIgnoreCase(s.getStatus()))
                .toList();

        List<StaffProfile> ranked = ElasticSearchSupport.filterAndRank(filtered, q, s -> List.of(
                new ElasticSearchSupport.WeightedField(s.getEmployeeCode(), 5.0),
                new ElasticSearchSupport.WeightedField(s.getFullName(), 4.5),
                new ElasticSearchSupport.WeightedField(s.getRoleCode(), 4.0),
                new ElasticSearchSupport.WeightedField(s.getUsername(), 3.5),
                new ElasticSearchSupport.WeightedField(s.getEmail(), 3.0),
                new ElasticSearchSupport.WeightedField(s.getPhone(), 2.5),
                new ElasticSearchSupport.WeightedField(s.getDepartment(), 2.5),
                new ElasticSearchSupport.WeightedField(s.getJobTitle(), 2.5),
                new ElasticSearchSupport.WeightedField(s.getBranchCode(), 3.0),
                new ElasticSearchSupport.WeightedField(s.getLicenseNumber(), 3.5),
                new ElasticSearchSupport.WeightedField(s.getAssignedVehiclePlate(), 3.5),
                new ElasticSearchSupport.WeightedField(s.getCertificationCode(), 3.5),
                new ElasticSearchSupport.WeightedField(s.getInspectionScope(), 2.5),
                new ElasticSearchSupport.WeightedField(s.getVerificationStatus(), 2.0)
        ));

        Map<UUID, String> branchNameMap = staffOrganizationValidator.buildBranchNameMap();
        return ranked.stream()
                .map(s -> staffProfileMapper.toResponse(s, staffOrganizationValidator.resolveBranchName(s, branchNameMap)))
                .toList();
    }

    public List<RoleStaffSummaryResponse> getRoleSummaries() {
        Map<String, List<StaffProfile>> byRole = new LinkedHashMap<>();
        for (StaffProfile s : staffProfileRepository.findAll()) {
            if (!Boolean.TRUE.equals(s.getIsDeleted())) {
                byRole.computeIfAbsent(s.getRoleCode(), k -> new ArrayList<>()).add(s);
            }
        }
        return byRole.entrySet().stream()
                .map(e -> {
                    List<StaffProfile> list = e.getValue();
                    long active = list.stream().filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus())).count();
                    long onLeave = list.stream().filter(s -> "ON_LEAVE".equalsIgnoreCase(s.getStatus())).count();
                    long payroll = list.stream().mapToLong(s -> s.getBaseSalaryVnd() != null ? s.getBaseSalaryVnd() : 0L).sum();
                    return RoleStaffSummaryResponse.builder()
                            .roleCode(e.getKey())
                            .totalCount(list.size())
                            .activeCount(active)
                            .onLeaveCount(onLeave)
                            .totalPayrollVnd(payroll)
                            .build();
                })
                .toList();
    }

    public StaffProfileResponse getStaffById(UUID id) {
        StaffProfile s = findStaffOrThrow(id);
        return mapWithResolvedBranch(s);
    }

    @Transactional
    public StaffProfileResponse createStaff(StaffProfileRequest req) {
        staffOrganizationValidator.validateUniqueEmployeeCode(req.getEmployeeCode(), null);
        staffOrganizationValidator.validateSystemRole(req.getRoleCode());

        StaffProfile entity = staffProfileMapper.toEntity(req);
        staffOrganizationValidator.resolveAndAssignBranch(entity, req.getBranchId(), req.getBranchCode());
        Instant now = Instant.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        return mapWithResolvedBranch(staffProfileRepository.save(entity));
    }

    @Transactional
    public StaffProfileResponse updateStaff(UUID id, StaffProfileRequest req) {
        StaffProfile existing = findStaffOrThrow(id);

        if (req.getEmployeeCode() != null && !req.getEmployeeCode().isBlank()) {
            String nextCode = staffOrganizationValidator.validateUniqueEmployeeCode(
                    req.getEmployeeCode(), existing.getEmployeeCode());
            existing.setEmployeeCode(nextCode);
        }
        if (req.getRoleCode() != null && !req.getRoleCode().isBlank()) {
            staffOrganizationValidator.validateSystemRole(req.getRoleCode());
        }

        staffProfileMapper.updateEntity(existing, req);
        if (req.getBranchId() != null || (req.getBranchCode() != null && !req.getBranchCode().isBlank())) {
            staffOrganizationValidator.resolveAndAssignBranch(existing, req.getBranchId(), req.getBranchCode());
        }
        existing.setUpdatedAt(Instant.now());

        return mapWithResolvedBranch(staffProfileRepository.save(existing));
    }

    @Transactional
    public StaffProfileResponse softDeleteStaff(UUID id, String callerUsername) {
        StaffProfile existing = findStaffOrThrow(id);
        if ("admin".equalsIgnoreCase(existing.getUsername())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể xóa mềm hồ sơ Root Admin.");
        }

        Instant now = Instant.now();
        existing.setIsDeleted(true);
        existing.setDeletedAt(now);
        existing.setDeletedBy(callerUsername != null && !callerUsername.isBlank() ? callerUsername : "ADMIN");
        existing.setStatus("INACTIVE");
        existing.setUpdatedAt(now);

        return mapWithResolvedBranch(staffProfileRepository.save(existing));
    }

    @Transactional
    public StaffProfileResponse restoreStaff(UUID id) {
        StaffProfile existing = findStaffOrThrow(id);

        existing.setIsDeleted(false);
        existing.setDeletedAt(null);
        existing.setDeletedBy(null);
        existing.setStatus("ACTIVE");
        existing.setUpdatedAt(Instant.now());

        return mapWithResolvedBranch(staffProfileRepository.save(existing));
    }

    @Transactional
    public StaffProfileResponse verifyStaff(UUID id, StaffVerificationRequest req, String approverUsername) {
        StaffProfile existing = findStaffOrThrow(id);

        String nextVerification = staffComplianceValidator.validateVerificationStatus(req.getVerificationStatus());
        staffProfileMapper.applyVerification(existing, req);
        existing.setVerificationStatus(nextVerification);

        if ("APPROVED".equals(nextVerification)) {
            staffComplianceValidator.enforceApprovalComplianceRules(existing);
        }

        Instant now = Instant.now();
        existing.setVerifiedBy(approverUsername != null && !approverUsername.isBlank() ? approverUsername : "ADMIN");
        existing.setVerifiedAt(now);
        existing.setUpdatedAt(now);

        return mapWithResolvedBranch(staffProfileRepository.save(existing));
    }

    private StaffProfile findStaffOrThrow(UUID id) {
        return staffProfileRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED, "Không tìm thấy hồ sơ nhân viên: " + id));
    }

    private StaffProfileResponse mapWithResolvedBranch(StaffProfile staff) {
        return staffProfileMapper.toResponse(
                staff,
                staffOrganizationValidator.resolveBranchName(staff, staffOrganizationValidator.buildBranchNameMap())
        );
    }
}
