package com.ccadro.identity.validate;

import com.ccadro.identity.entity.Branch;
import com.ccadro.identity.entity.StaffProfile;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.MapperTextUtils;
import com.ccadro.identity.repository.BranchRepository;
import com.ccadro.identity.repository.StaffProfileRepository;
import com.ccadro.identity.service.RoleService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Shared validator & reference resolver for roles, employee codes, and operating branches across identity workflows.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffOrganizationValidator {

    BranchRepository branchRepository;
    StaffProfileRepository staffProfileRepository;

    public String validateSystemRole(String roleCode) {
        String normalized = MapperTextUtils.normalizeUpper(roleCode);
        if (normalized == null || !RoleService.SYSTEM_FIXED_ROLES.contains(normalized)) {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND, "Vai trò nhân viên không hợp lệ: " + roleCode);
        }
        return normalized;
    }

    public String validateUniqueEmployeeCode(String rawCode, String existingCode) {
        String nextCode = MapperTextUtils.normalizeUpper(rawCode);
        if (nextCode == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã nhân viên không được để trống");
        }
        if ((existingCode == null || !nextCode.equalsIgnoreCase(existingCode))
                && staffProfileRepository.existsByEmployeeCodeIgnoreCase(nextCode)) {
            throw new AppException(ErrorCode.USER_EXISTED, "Mã nhân viên đã tồn tại: " + nextCode);
        }
        return nextCode;
    }

    public void resolveAndAssignBranch(StaffProfile staff, UUID branchId, String branchCode) {
        Branch resolved = null;
        if (branchId != null) {
            resolved = branchRepository.findById(branchId).orElse(null);
        }
        if (resolved == null && branchCode != null && !branchCode.isBlank()) {
            resolved = branchRepository.findByBranchCodeIgnoreCase(branchCode.trim()).orElse(null);
        }
        if (resolved != null) {
            staff.setBranchId(resolved.getId());
            staff.setBranchCode(resolved.getBranchCode());
        } else {
            staff.setBranchId(branchId);
            staff.setBranchCode(MapperTextUtils.normalizeUpper(branchCode));
        }
    }

    public Map<UUID, String> buildBranchNameMap() {
        Map<UUID, String> map = new HashMap<>();
        for (Branch b : branchRepository.findAll()) {
            map.put(b.getId(), b.getBranchName());
        }
        return map;
    }

    public String resolveBranchName(StaffProfile staff, Map<UUID, String> branchNameMap) {
        if (staff.getBranchId() != null && branchNameMap.containsKey(staff.getBranchId())) {
            return branchNameMap.get(staff.getBranchId());
        }
        return staff.getBranchCode();
    }
}

