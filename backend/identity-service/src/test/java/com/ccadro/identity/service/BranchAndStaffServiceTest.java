package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.BranchRequest;
import com.ccadro.identity.dto.request.StaffProfileRequest;
import com.ccadro.identity.dto.request.StaffVerificationRequest;
import com.ccadro.identity.dto.response.BranchResponse;
import com.ccadro.identity.dto.response.RoleStaffSummaryResponse;
import com.ccadro.identity.dto.response.StaffProfileResponse;
import com.ccadro.identity.entity.Branch;
import com.ccadro.identity.entity.StaffProfile;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.mapper.BranchMapper;
import com.ccadro.identity.mapper.StaffProfileMapper;
import com.ccadro.identity.repository.BranchRepository;
import com.ccadro.identity.repository.StaffProfileRepository;
import com.ccadro.identity.validate.StaffComplianceValidator;
import com.ccadro.identity.validate.StaffOrganizationValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BranchAndStaffServiceTest {

    @Mock
    BranchRepository branchRepository;

    @Mock
    StaffProfileRepository staffProfileRepository;

    BranchService branchService;
    StaffProfileService staffProfileService;

    @BeforeEach
    void setUp() {
        BranchMapper branchMapper = Mappers.getMapper(BranchMapper.class);
        StaffProfileMapper staffMapper = Mappers.getMapper(StaffProfileMapper.class);
        StaffComplianceValidator complianceValidator = new StaffComplianceValidator();
        StaffOrganizationValidator organizationValidator = new StaffOrganizationValidator(branchRepository, staffProfileRepository);
        branchService = new BranchService(branchMapper, branchRepository, staffProfileRepository);
        staffProfileService = new StaffProfileService(staffMapper, staffProfileRepository, complianceValidator, organizationValidator);
    }

    @Test
    void branchCrud_shouldCreateUpdatePropagateCodeAndSoftDeleteSafely() {
        UUID brId = UUID.randomUUID();
        Map<UUID, Branch> db = new LinkedHashMap<>();

        when(branchRepository.existsByBranchCodeIgnoreCase("BR-CT-01")).thenReturn(false);
        when(branchRepository.save(any(Branch.class))).thenAnswer(inv -> {
            Branch b = inv.getArgument(0);
            if (b.getId() == null) b.setId(brId);
            db.put(b.getId(), b);
            return b;
        });
        when(branchRepository.findById(brId)).thenAnswer(inv -> Optional.ofNullable(db.get(brId)));
        when(branchRepository.findAll()).thenAnswer(inv -> new ArrayList<>(db.values()));

        StaffProfile linkedStaff = StaffProfile.builder()
                .id(UUID.randomUUID())
                .employeeCode("NV-DSP-900")
                .fullName("Lê Hoàng Điều Phối")
                .email("dieuphoi@ccadro.vn")
                .roleCode("DISPATCHER")
                .department("NOC")
                .jobTitle("Điều phối")
                .branchId(brId)
                .branchCode("BR-CT-01")
                .isDeleted(false)
                .build();
        when(staffProfileRepository.findByBranchId(brId)).thenReturn(List.of(linkedStaff));
        when(staffProfileRepository.findAll()).thenReturn(List.of(linkedStaff));
        when(staffProfileRepository.save(any(StaffProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        BranchResponse created = branchService.createBranch(BranchRequest.builder()
                .branchCode("br-ct-01")
                .branchName("Chi Nhánh Cần Thơ")
                .region("MIEN_NAM")
                .branchType("REGIONAL_HUB")
                .city("Cần Thơ")
                .vehicleCapacity(35)
                .monthlyRevenueTargetVnd(720_000_000L)
                .build());
        assertEquals("BR-CT-01", created.getBranchCode());
        assertEquals("ACTIVE", created.getStatus());

        when(branchRepository.existsByBranchCodeIgnoreCase("BR-CT-HUB")).thenReturn(false);
        BranchResponse updated = branchService.updateBranch(brId, BranchRequest.builder()
                .branchCode("BR-CT-HUB")
                .branchName("Chi Nhánh Cần Thơ • ĐBSCL Hub")
                .city("TP. Cần Thơ")
                .monthlyRevenueTargetVnd(950_000_000L)
                .build());
        assertEquals("BR-CT-HUB", updated.getBranchCode());
        assertEquals("BR-CT-HUB", linkedStaff.getBranchCode());
        assertEquals(1L, updated.getActiveStaffCount());

        BranchResponse deleted = branchService.softDeleteBranch(brId, "admin");
        assertTrue(Boolean.TRUE.equals(deleted.getIsDeleted()));
        assertEquals("INACTIVE", deleted.getStatus());
        assertTrue(branchService.getBranches(null, null, false).isEmpty());
        assertEquals(1, branchService.getBranches(null, null, true).size());

        BranchResponse restored = branchService.restoreBranch(brId);
        assertFalse(Boolean.TRUE.equals(restored.getIsDeleted()));
        assertEquals("ACTIVE", restored.getStatus());
    }

    @Test
    void staffCrud_shouldResolveBranchGroupByRoleAndEnforceValidRole() {
        UUID brId = UUID.randomUUID();
        Branch hq = Branch.builder()
                .id(brId)
                .branchCode("BR-HCM-HQ")
                .branchName("Trụ Sở Chính Cát Lái")
                .region("MIEN_NAM")
                .city("TP. HCM")
                .build();

        Map<UUID, StaffProfile> staffDb = new LinkedHashMap<>();
        when(branchRepository.findById(brId)).thenReturn(Optional.of(hq));
        when(branchRepository.findAll()).thenReturn(List.of(hq));
        when(staffProfileRepository.existsByEmployeeCodeIgnoreCase(any())).thenReturn(false);
        when(staffProfileRepository.save(any(StaffProfile.class))).thenAnswer(inv -> {
            StaffProfile s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            staffDb.put(s.getId(), s);
            return s;
        });
        when(staffProfileRepository.findAll()).thenAnswer(inv -> new ArrayList<>(staffDb.values()));

        assertThrows(AppException.class, () -> staffProfileService.createStaff(StaffProfileRequest.builder()
                .employeeCode("NV-BAD-01")
                .fullName("Invalid Role User")
                .email("invalid@ccadro.vn")
                .roleCode("INVALID_ROLE")
                .department("Ops")
                .jobTitle("Staff")
                .build()));

        StaffProfileResponse created = staffProfileService.createStaff(StaffProfileRequest.builder()
                .employeeCode("nv-drv-88")
                .fullName("Trần Văn Minh")
                .username("driver_minh")
                .email("minh.driver@ccadro.vn")
                .roleCode("driver")
                .department("Đội Xe Đầu Kéo Điện")
                .jobTitle("Tài xế Hạng FC")
                .branchId(brId)
                .baseSalaryVnd(22_000_000L)
                .build());

        assertEquals("NV-DRV-88", created.getEmployeeCode());
        assertEquals("DRIVER", created.getRoleCode());
        assertEquals("BR-HCM-HQ", created.getBranchCode());
        assertEquals("Trụ Sở Chính Cát Lái", created.getBranchName());

        List<RoleStaffSummaryResponse> summaries = staffProfileService.getRoleSummaries();
        assertEquals(1, summaries.size());
        assertEquals("DRIVER", summaries.get(0).getRoleCode());
        assertEquals(22_000_000L, summaries.get(0).getTotalPayrollVnd());

        when(staffProfileRepository.findById(created.getId())).thenAnswer(inv -> Optional.ofNullable(staffDb.get(created.getId())));
        StaffProfileResponse deleted = staffProfileService.softDeleteStaff(created.getId(), "admin");
        assertTrue(Boolean.TRUE.equals(deleted.getIsDeleted()));
        assertTrue(staffProfileService.getStaff(null, "DRIVER", null, null, false).isEmpty());

        StaffProfileResponse restored = staffProfileService.restoreStaff(created.getId());
        assertFalse(Boolean.TRUE.equals(restored.getIsDeleted()));
        assertEquals("ACTIVE", restored.getStatus());
    }

    @Test
    void verifyStaff_shouldEnforceComplianceChecklistForDriversAndControllers() {
        UUID hqId = UUID.randomUUID();
        Branch hq = Branch.builder()
                .id(hqId)
                .branchCode("BR-HCM-HQ")
                .branchName("Trụ Sở Chính Cát Lái")
                .region("MIEN_NAM")
                .city("TP. HCM")
                .build();

        Map<UUID, StaffProfile> staffDb = new LinkedHashMap<>();
        when(branchRepository.findById(hqId)).thenReturn(Optional.of(hq));
        when(branchRepository.findAll()).thenReturn(List.of(hq));
        when(staffProfileRepository.existsByEmployeeCodeIgnoreCase(any())).thenReturn(false);
        when(staffProfileRepository.save(any(StaffProfile.class))).thenAnswer(inv -> {
            StaffProfile s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            staffDb.put(s.getId(), s);
            return s;
        });
        when(staffProfileRepository.findById(any(UUID.class)))
                .thenAnswer(inv -> Optional.ofNullable(staffDb.get(inv.getArgument(0))));
        when(staffProfileRepository.findAll()).thenAnswer(inv -> new ArrayList<>(staffDb.values()));

        // 1. Tạo tài xế thiếu khám sức khỏe -> chưa thể APPROVED
        StaffProfileResponse driver = staffProfileService.createStaff(StaffProfileRequest.builder()
                .employeeCode("NV-DRV-501")
                .fullName("Lê Hoàng Tài Xế")
                .email("tai.driver@ccadro.vn")
                .roleCode("DRIVER")
                .department("Đội Xe Đầu Kéo")
                .jobTitle("Tài xế Container FC")
                .branchId(hqId)
                .backgroundCheckPassed(true)
                .licenseNumber("790145111222")
                .licenseClass("FC")
                .licenseExpiryDate(java.time.LocalDate.now().plusYears(2))
                .healthCheckPassed(false)
                .safetyTrainingCertified(true)
                .build());

        assertEquals("DRIVER_FLEET", driver.getStaffCategory());
        assertEquals("PENDING_REVIEW", driver.getVerificationStatus());

        assertThrows(AppException.class, () -> staffProfileService.verifyStaff(driver.getId(),
                StaffVerificationRequest.builder()
                        .verificationStatus("APPROVED")
                        .verificationNotes("Thử duyệt thiếu giấy khám sức khỏe")
                        .build(),
                "safety"));

        // Bổ sung khám sức khỏe đạt chuẩn -> duyệt APPROVED thành công
        StaffProfileResponse approvedDriver = staffProfileService.verifyStaff(driver.getId(),
                StaffVerificationRequest.builder()
                        .verificationStatus("APPROVED")
                        .healthCheckPassed(true)
                        .healthCheckDate(java.time.LocalDate.now())
                        .verificationNotes("Đạt GPLX FC, CCCD & khám sức khỏe Q4.")
                        .build(),
                "safety");
        assertEquals("APPROVED", approvedDriver.getVerificationStatus());
        assertEquals("safety", approvedDriver.getVerifiedBy());

        // 2. Tạo nhân viên kiểm soát SAFETY_MANAGER chưa có quyền ký -> chặn APPROVED, cấp xong duyệt OK
        StaffProfileResponse controller = staffProfileService.createStaff(StaffProfileRequest.builder()
                .employeeCode("NV-SAF-502")
                .fullName("Phạm Minh Kiểm Soát")
                .email("minh.safety@ccadro.vn")
                .roleCode("SAFETY_MANAGER")
                .department("Phòng An Toàn HSE")
                .jobTitle("Kiểm Định Viên Pre-Trip")
                .branchId(hqId)
                .backgroundCheckPassed(true)
                .certificationCode("HSE-2026-502")
                .certificateExpiryDate(java.time.LocalDate.now().plusYears(3))
                .inspectionScope("PRE_TRIP_UC01, DEMERIT_BRULE18")
                .canSignOffCompliance(false)
                .build());

        assertEquals("CONTROL_AUDIT", controller.getStaffCategory());

        assertThrows(AppException.class, () -> staffProfileService.verifyStaff(controller.getId(),
                StaffVerificationRequest.builder()
                        .verificationStatus("APPROVED")
                        .build(),
                "admin"));

        StaffProfileResponse approvedController = staffProfileService.verifyStaff(controller.getId(),
                StaffVerificationRequest.builder()
                        .verificationStatus("APPROVED")
                        .canSignOffCompliance(true)
                        .verificationNotes("Đã xác minh chứng chỉ HSE & cấp quyền ký kiểm định.")
                        .build(),
                "admin");
        assertEquals("APPROVED", approvedController.getVerificationStatus());
        assertTrue(Boolean.TRUE.equals(approvedController.getCanSignOffCompliance()));

        // 3. Kiểm tra filter theo staffCategory & verificationStatus
        assertEquals(1, staffProfileService.getStaff(null, null, "DRIVER_FLEET", "APPROVED", null, null, false).size());
        assertEquals(1, staffProfileService.getStaff(null, null, "CONTROL_AUDIT", "APPROVED", null, null, false).size());
    }
}
