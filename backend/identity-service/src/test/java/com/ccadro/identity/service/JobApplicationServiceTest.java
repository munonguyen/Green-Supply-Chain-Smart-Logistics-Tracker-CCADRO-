package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.JobApplicationDecisionRequest;
import com.ccadro.identity.dto.request.JobApplicationStageRequest;
import com.ccadro.identity.dto.request.JobApplicationSubmitRequest;
import com.ccadro.identity.dto.response.BranchResponse;
import com.ccadro.identity.dto.response.JobApplicationApproveResponse;
import com.ccadro.identity.dto.response.JobApplicationPublicStatusResponse;
import com.ccadro.identity.dto.response.JobApplicationResponse;
import com.ccadro.identity.entity.*;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.mapper.BranchMapper;
import com.ccadro.identity.mapper.JobApplicationMapper;
import com.ccadro.identity.mapper.StaffProfileMapper;
import com.ccadro.identity.repository.*;
import com.ccadro.identity.validate.JobApplicationValidator;
import com.ccadro.identity.validate.StaffComplianceValidator;
import com.ccadro.identity.validate.StaffOrganizationValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

    @Mock JobApplicationRepository jobApplicationRepository;
    @Mock BranchRepository branchRepository;
    @Mock StaffProfileRepository staffProfileRepository;
    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock HubIamAccountRepository hubIamAccountRepository;
    @Mock HubAuthAuditLogRepository hubAuthAuditLogRepository;

    JobApplicationService jobApplicationService;
    Map<UUID, JobApplication> appDb;
    Map<UUID, StaffProfile> staffDb;
    Map<String, User> userDb;
    UUID hqId;

    @BeforeEach
    void setUp() {
        appDb = new LinkedHashMap<>();
        staffDb = new LinkedHashMap<>();
        userDb = new LinkedHashMap<>();
        hqId = UUID.randomUUID();
        Branch hq = Branch.builder().id(hqId).branchCode("BR-HCM-HQ").branchName("Trụ Sở Chính Cát Lái").status("ACTIVE").build();

        lenient().when(branchRepository.findById(hqId)).thenReturn(Optional.of(hq));
        lenient().when(branchRepository.findAll()).thenReturn(List.of(hq));
        lenient().when(staffProfileRepository.findAll()).thenAnswer(inv -> new ArrayList<>(staffDb.values()));
        lenient().when(staffProfileRepository.existsByEmployeeCodeIgnoreCase(any())).thenReturn(false);
        lenient().when(staffProfileRepository.save(any(StaffProfile.class))).thenAnswer(inv -> {
            StaffProfile s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            staffDb.put(s.getId(), s);
            return s;
        });

        lenient().when(jobApplicationRepository.findAll()).thenAnswer(inv -> new ArrayList<>(appDb.values()));
        lenient().when(jobApplicationRepository.findById(any(UUID.class))).thenAnswer(inv -> Optional.ofNullable(appDb.get(inv.getArgument(0))));
        lenient().when(jobApplicationRepository.findByApplicationCodeIgnoreCase(any())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return appDb.values().stream().filter(a -> code.equalsIgnoreCase(a.getApplicationCode())).findFirst();
        });
        lenient().when(jobApplicationRepository.findByEmailIgnoreCase(any())).thenAnswer(inv -> {
            String mail = inv.getArgument(0);
            return appDb.values().stream().filter(a -> mail.equalsIgnoreCase(a.getEmail())).toList();
        });
        lenient().when(jobApplicationRepository.findByNationalId(any())).thenAnswer(inv -> {
            String nid = inv.getArgument(0);
            return appDb.values().stream().filter(a -> nid.equals(a.getNationalId())).toList();
        });
        lenient().when(jobApplicationRepository.existsByApplicationCodeIgnoreCase(any())).thenReturn(false);
        lenient().when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication a = inv.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            appDb.put(a.getId(), a);
            return a;
        });

        lenient().when(userRepository.existsByEmail(any())).thenAnswer(inv ->
                userDb.values().stream().anyMatch(u -> inv.getArgument(0).toString().equalsIgnoreCase(u.getEmail())));
        lenient().when(userRepository.existsByUsername(any())).thenAnswer(inv -> userDb.containsKey(inv.getArgument(0).toString()));
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            userDb.put(u.getUsername(), u);
            return u;
        });

        lenient().when(roleRepository.findById(any())).thenAnswer(inv ->
                Optional.of(Role.builder().name(inv.getArgument(0)).description("Role").build()));

        BranchService branchService = new BranchService(Mappers.getMapper(BranchMapper.class), branchRepository, staffProfileRepository);
        StaffComplianceValidator complianceValidator = new StaffComplianceValidator();
        StaffOrganizationValidator orgValidator = new StaffOrganizationValidator(branchRepository, staffProfileRepository);
        StaffProfileService staffService = new StaffProfileService(
                Mappers.getMapper(StaffProfileMapper.class), staffProfileRepository, complianceValidator, orgValidator);
        JobApplicationValidator appValidator = new JobApplicationValidator(
                jobApplicationRepository, userRepository, staffProfileRepository, complianceValidator);
        PasswordEncoder encoder = new BCryptPasswordEncoder();

        jobApplicationService = new JobApplicationService(
                Mappers.getMapper(JobApplicationMapper.class),
                jobApplicationRepository,
                appValidator,
                orgValidator,
                branchService,
                staffService,
                userRepository,
                roleRepository,
                hubIamAccountRepository,
                hubAuthAuditLogRepository,
                encoder
        );
    }

    @Test
    void submitApplication_shouldBlockAdminEscalationAndDuplicateOpenSubmissions() {
        assertThrows(AppException.class, () -> jobApplicationService.submitPublicApplication(
                JobApplicationSubmitRequest.builder()
                        .fullName("Hacker Escalator")
                        .email("hacker@test.vn")
                        .phone("0900111222")
                        .nationalId("079090999888")
                        .appliedRoleCode("ADMIN")
                        .build()));

        Map<String, Object> submitted = jobApplicationService.submitPublicApplication(
                JobApplicationSubmitRequest.builder()
                        .fullName("Nguyễn Hữu Tín")
                        .email("tin.driver@ccadro.vn")
                        .phone("0908771223")
                        .nationalId("079093004411")
                        .appliedRoleCode("driver")
                        .preferredBranchId(hqId)
                        .licenseNumber("790155667788")
                        .licenseClass("FC")
                        .licenseExpiryDate(LocalDate.now().plusYears(3))
                        .healthCheckDeclared(true)
                        .safetyTrainingDeclared(true)
                        .experienceYears(5)
                        .build());

        JobApplicationResponse dto = (JobApplicationResponse) submitted.get("application");
        String pin = (String) submitted.get("lookupPin");
        assertNotNull(dto.getApplicationCode());
        assertEquals("DRIVER", dto.getAppliedRoleCode());
        assertEquals("SUBMITTED", dto.getApplicationStatus());

        JobApplicationPublicStatusResponse status = jobApplicationService.lookupPublicStatus(dto.getApplicationCode(), pin);
        assertEquals("SUBMITTED", status.getApplicationStatus());
        assertThrows(AppException.class, () -> jobApplicationService.lookupPublicStatus(dto.getApplicationCode(), "wrong-pin"));

        // Duplicate email blocked while open
        assertThrows(AppException.class, () -> jobApplicationService.submitPublicApplication(
                JobApplicationSubmitRequest.builder()
                        .fullName("Duplicate Applicant")
                        .email("tin.driver@ccadro.vn")
                        .phone("0908000111")
                        .nationalId("079093009999")
                        .appliedRoleCode("DRIVER")
                        .licenseNumber("790155667799")
                        .licenseClass("FC")
                        .build()));
    }

    @Test
    void approveAndOnboard_shouldEnforceComplianceGuardThenProvisionUserAndStaffProfile() {
        Map<String, Object> submitted = jobApplicationService.submitPublicApplication(
                JobApplicationSubmitRequest.builder()
                        .fullName("Phan Văn Lộc")
                        .email("loc.shipper@ccadro.vn")
                        .phone("0974331890")
                        .nationalId("027097008812")
                        .appliedRoleCode("HUB_SHIPPER")
                        .preferredBranchId(hqId)
                        .preferredHubCode("HUB-DINHBANG-BN")
                        .licenseNumber("270197004455")
                        .licenseClass("A1")
                        .licenseExpiryDate(LocalDate.now().plusYears(2))
                        .healthCheckDeclared(true)
                        .safetyTrainingDeclared(true)
                        .build());
        UUID appId = ((JobApplicationResponse) submitted.get("application")).getId();

        // Missing drive test -> onboarding blocked
        assertThrows(AppException.class, () -> jobApplicationService.approveAndOnboard(appId,
                JobApplicationDecisionRequest.builder().build(), "admin"));

        // Pass screening + drive test -> advance stage
        JobApplicationResponse staged = jobApplicationService.advanceStage(appId,
                JobApplicationStageRequest.builder()
                        .applicationStatus("COMPLIANCE_CHECKING")
                        .interviewScore(90)
                        .driveTestPassed(true)
                        .screeningNotes("Đạt sát hạch giao hàng xe máy điện")
                        .build(),
                "safety");
        assertEquals("COMPLIANCE_CHECKING", staged.getApplicationStatus());
        assertTrue(Boolean.TRUE.equals(staged.getDriveTestPassed()));

        // Approve & Onboard -> provisions User (mustChangePassword=true), HubIamAccount & StaffProfile
        JobApplicationApproveResponse approved = jobApplicationService.approveAndOnboard(appId,
                JobApplicationDecisionRequest.builder()
                        .username("loc_hub01")
                        .assignedHubCode("HUB-DINHBANG-BN")
                        .assignedShipperCode("SHP-BN-009")
                        .assignedVehiclePlate("99B1-EV99")
                        .approvedSalaryVnd(17_500_000L)
                        .build(),
                "admin");

        assertEquals("APPROVED_ONBOARDED", approved.getApplication().getApplicationStatus());
        assertEquals("loc_hub01", approved.getOnboardedUsername());
        assertTrue(Boolean.TRUE.equals(approved.getMustChangePassword()));
        assertEquals("APPROVED", approved.getCreatedStaff().getVerificationStatus());
        assertEquals("HUB_SHIPPER", approved.getCreatedStaff().getRoleCode());
        assertTrue(userDb.containsKey("loc_hub01"));
        assertTrue(Boolean.TRUE.equals(userDb.get("loc_hub01").getMustChangePassword()));
        verify(hubIamAccountRepository, times(1)).save(any(HubIamAccount.class));
        verify(hubAuthAuditLogRepository, times(1)).save(any(HubAuthAuditLog.class));

        List<BranchResponse> openings = jobApplicationService.getPublicOpenings().get(0).getActiveBranches();
        assertEquals(1, openings.size());
    }
}

