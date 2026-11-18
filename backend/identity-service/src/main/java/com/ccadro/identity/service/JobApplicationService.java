package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.JobApplicationDecisionRequest;
import com.ccadro.identity.dto.request.JobApplicationStageRequest;
import com.ccadro.identity.dto.request.JobApplicationSubmitRequest;
import com.ccadro.identity.dto.request.StaffProfileRequest;
import com.ccadro.identity.dto.response.*;
import com.ccadro.identity.entity.*;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.JobApplicationMapper;
import com.ccadro.identity.mapper.MapperTextUtils;
import com.ccadro.identity.repository.*;
import com.ccadro.identity.validate.JobApplicationValidator;
import com.ccadro.identity.validate.StaffOrganizationValidator;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.*;

@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class JobApplicationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    JobApplicationMapper jobApplicationMapper;
    JobApplicationRepository jobApplicationRepository;
    JobApplicationValidator jobApplicationValidator;
    StaffOrganizationValidator staffOrganizationValidator;
    BranchService branchService;
    StaffProfileService staffProfileService;
    UserRepository userRepository;
    RoleRepository roleRepository;
    HubIamAccountRepository hubIamAccountRepository;
    HubAuthAuditLogRepository hubAuthAuditLogRepository;
    PasswordEncoder passwordEncoder;

    @NonFinal
    @Value("${services.asset.url:http://localhost:8081}")
    String assetServiceUrl = "http://localhost:8081";

    public JobApplicationService(
            JobApplicationMapper jobApplicationMapper,
            JobApplicationRepository jobApplicationRepository,
            JobApplicationValidator jobApplicationValidator,
            StaffOrganizationValidator staffOrganizationValidator,
            BranchService branchService,
            StaffProfileService staffProfileService,
            UserRepository userRepository,
            RoleRepository roleRepository,
            HubIamAccountRepository hubIamAccountRepository,
            HubAuthAuditLogRepository hubAuthAuditLogRepository,
            PasswordEncoder passwordEncoder) {
        this.jobApplicationMapper = jobApplicationMapper;
        this.jobApplicationRepository = jobApplicationRepository;
        this.jobApplicationValidator = jobApplicationValidator;
        this.staffOrganizationValidator = staffOrganizationValidator;
        this.branchService = branchService;
        this.staffProfileService = staffProfileService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.hubIamAccountRepository = hubIamAccountRepository;
        this.hubAuthAuditLogRepository = hubAuthAuditLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<CareerOpeningResponse> getPublicOpenings() {
        List<BranchResponse> activeBranches = branchService.getBranches(null, null, false).stream()
                .filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus()))
                .toList();
        return List.of(
                CareerOpeningResponse.builder()
                        .roleCode("DRIVER")
                        .roleTitle("Tài Xế Vận Tải Hành Lang Xanh (Container / Xe Điện EV)")
                        .category("DRIVER_FLEET")
                        .requirementsSummary("Yêu cầu GPLX hạng FC/C/B2 còn hạn, khám sức khỏe đạt chuẩn và vượt qua bài sát hạch an toàn.")
                        .activeBranches(activeBranches)
                        .build(),
                CareerOpeningResponse.builder()
                        .roleCode("HUB_SHIPPER")
                        .roleTitle("Nhân Viên Giao Hàng Chặng Cuối Tại Hub (Last-Mile Shipper)")
                        .category("DRIVER_FLEET")
                        .requirementsSummary("Yêu cầu GPLX A1/B2 còn hạn, thông thạo địa bàn KCN và quy trình chụp Photo POD.")
                        .activeBranches(activeBranches)
                        .build(),
                CareerOpeningResponse.builder()
                        .roleCode("SAFETY_MANAGER")
                        .roleTitle("Chuyên Viên / Quản Lý Kiểm Soát An Toàn Đội Xe (HSE)")
                        .category("CONTROL_AUDIT")
                        .requirementsSummary("Yêu cầu chứng chỉ thanh tra an toàn/HSE, thẩm định Pre-trip UC01 & điểm phạt BRULE-18.")
                        .activeBranches(activeBranches)
                        .build(),
                CareerOpeningResponse.builder()
                        .roleCode("ESG_AUDITOR")
                        .roleTitle("Kiểm Toán Viên Phát Thải Carbon Độc Lập (ISO 14083 / GLEC v3)")
                        .category("CONTROL_AUDIT")
                        .requirementsSummary("Yêu cầu chứng chỉ kiểm toán GHG / ISO 14083 còn hiệu lực và cam kết độc lập.")
                        .activeBranches(activeBranches)
                        .build(),
                CareerOpeningResponse.builder()
                        .roleCode("HUB_AUDITOR")
                        .roleTitle("Kiểm Tra Viên Chất Lượng & Ảnh POD Trụ Sở Hub")
                        .category("CONTROL_AUDIT")
                        .requirementsSummary("Yêu cầu kinh nghiệm kiểm soát SLA, chuỗi lạnh và đối soát chứng từ 3PL.")
                        .activeBranches(activeBranches)
                        .build(),
                CareerOpeningResponse.builder()
                        .roleCode("DISPATCHER")
                        .roleTitle("Điều Phối Viên Trung Tâm NOC 24/7")
                        .category("OPS_DISPATCH")
                        .requirementsSummary("Kinh nghiệm điều vận đội xe, tối ưu lộ trình Pareto và giám sát cảnh báo GPS.")
                        .activeBranches(activeBranches)
                        .build(),
                CareerOpeningResponse.builder()
                        .roleCode("HUB_MANAGER")
                        .roleTitle("Trưởng Trụ Sở Giao Nhận Nội Khu (Hub Manager)")
                        .category("OPS_DISPATCH")
                        .requirementsSummary("Kinh nghiệm quản lý kho trung chuyển, phân dải mã nhiệm vụ và điều phối đội ngũ Shipper.")
                        .activeBranches(activeBranches)
                        .build()
        );
    }

    @Transactional
    public Map<String, Object> submitPublicApplication(JobApplicationSubmitRequest request) {
        String role = jobApplicationValidator.validatePublicApplicableRole(request.getAppliedRoleCode());
        jobApplicationValidator.validateSubmitEligibility(request, role);

        JobApplication entity = jobApplicationMapper.toEntity(request);
        entity.setAppliedRoleCode(role);
        String code = generateUniqueApplicationCode();
        String pin = String.format("%06d", RANDOM.nextInt(1_000_000));
        entity.setApplicationCode(code);
        entity.setLookupPin(pin);

        Branch resolvedBranch = resolvePreferredBranch(request.getPreferredBranchId(), request.getPreferredBranchCode());
        if (resolvedBranch != null) {
            entity.setPreferredBranchId(resolvedBranch.getId());
            entity.setPreferredBranchCode(resolvedBranch.getBranchCode());
        }

        Instant now = Instant.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        JobApplication saved = jobApplicationRepository.save(entity);
        JobApplicationResponse dto = jobApplicationMapper.toResponse(
                saved, resolvedBranch != null ? resolvedBranch.getBranchName() : saved.getPreferredBranchCode());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("application", dto);
        payload.put("lookupPin", pin);
        payload.put("message", "Đã tiếp nhận đơn ứng tuyển " + code + ". Vui lòng lưu Mã hồ sơ và PIN để tra cứu tiến độ.");
        return payload;
    }

    public JobApplicationPublicStatusResponse lookupPublicStatus(String applicationCode, String emailOrPin) {
        String cleanCode = MapperTextUtils.normalizeUpper(applicationCode);
        if (cleanCode == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã hồ sơ ứng tuyển không được để trống");
        }
        JobApplication app = jobApplicationRepository.findByApplicationCodeIgnoreCase(cleanCode)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Không tìm thấy hồ sơ ứng tuyển: " + cleanCode));

        String credential = MapperTextUtils.trimOrNull(emailOrPin);
        boolean matchesPin = credential != null && credential.equals(app.getLookupPin());
        boolean matchesEmail = credential != null && credential.equalsIgnoreCase(app.getEmail());
        if (!matchesPin && !matchesEmail) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Email hoặc mã PIN tra cứu không khớp với hồ sơ.");
        }
        return jobApplicationMapper.toPublicStatusResponse(app);
    }

    public List<JobApplicationResponse> getApplications(String q, String roleCode, String status, UUID branchId) {
        String normRole = MapperTextUtils.normalizeFilter(roleCode);
        String normStatus = MapperTextUtils.normalizeFilter(status);

        List<JobApplication> filtered = jobApplicationRepository.findAll().stream()
                .filter(a -> normRole == null || normRole.equalsIgnoreCase(a.getAppliedRoleCode()))
                .filter(a -> normStatus == null || normStatus.equalsIgnoreCase(a.getApplicationStatus()))
                .filter(a -> branchId == null || branchId.equals(a.getPreferredBranchId()))
                .toList();

        List<JobApplication> ranked = ElasticSearchSupport.filterAndRank(filtered, q, a -> List.of(
                new ElasticSearchSupport.WeightedField(a.getApplicationCode(), 5.0),
                new ElasticSearchSupport.WeightedField(a.getFullName(), 4.5),
                new ElasticSearchSupport.WeightedField(a.getAppliedRoleCode(), 4.0),
                new ElasticSearchSupport.WeightedField(a.getEmail(), 3.5),
                new ElasticSearchSupport.WeightedField(a.getPhone(), 3.0),
                new ElasticSearchSupport.WeightedField(a.getPreferredBranchCode(), 3.0),
                new ElasticSearchSupport.WeightedField(a.getLicenseNumber(), 3.0),
                new ElasticSearchSupport.WeightedField(a.getCertificationCode(), 3.0),
                new ElasticSearchSupport.WeightedField(a.getApplicationStatus(), 2.5)
        ));

        Map<UUID, String> branchNameMap = staffOrganizationValidator.buildBranchNameMap();
        return ranked.stream()
                .map(a -> jobApplicationMapper.toResponse(
                        a,
                        a.getPreferredBranchId() != null
                                ? branchNameMap.getOrDefault(a.getPreferredBranchId(), a.getPreferredBranchCode())
                                : a.getPreferredBranchCode()))
                .toList();
    }

    @Transactional
    public JobApplicationResponse advanceStage(UUID id, JobApplicationStageRequest request, String actorUsername) {
        JobApplication app = findOrThrow(id);
        String nextStatus = jobApplicationValidator.validateStageStatus(app, request.getApplicationStatus());
        if ("APPROVED_ONBOARDED".equals(nextStatus)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Vui lòng sử dụng thao tác Phê duyệt Tiếp nhận (/approve) để cấp phát StaffProfile & Tài khoản IAM.");
        }

        app.setApplicationStatus(nextStatus);
        if (request.getScreeningNotes() != null) {
            app.setScreeningNotes(MapperTextUtils.trimOrNull(request.getScreeningNotes()));
        }
        if (request.getInterviewScheduledAt() != null) {
            app.setInterviewScheduledAt(MapperTextUtils.trimOrNull(request.getInterviewScheduledAt()));
        }
        if (request.getInterviewScore() != null) {
            app.setInterviewScore(Math.max(0, Math.min(100, request.getInterviewScore())));
        }
        if (request.getDriveTestPassed() != null) {
            app.setDriveTestPassed(request.getDriveTestPassed());
        }
        if (request.getHealthCheckDeclared() != null) {
            app.setHealthCheckDeclared(request.getHealthCheckDeclared());
        }
        if (request.getSafetyTrainingDeclared() != null) {
            app.setSafetyTrainingDeclared(request.getSafetyTrainingDeclared());
        }
        if ("REJECTED".equals(nextStatus) && request.getRejectionReason() != null) {
            app.setRejectionReason(MapperTextUtils.trimOrNull(request.getRejectionReason()));
        }
        app.setReviewedBy(actorUsername != null && !actorUsername.isBlank() ? actorUsername : "REVIEWER");
        app.setUpdatedAt(Instant.now());

        JobApplication saved = jobApplicationRepository.save(app);
        return mapToResponse(saved);
    }

    @Transactional
    public JobApplicationApproveResponse approveAndOnboard(
            UUID id,
            JobApplicationDecisionRequest decision,
            String approverUsername) {
        JobApplication app = findOrThrow(id);
        jobApplicationValidator.validateReadyForOnboarding(app, decision);

        String roleCode = app.getAppliedRoleCode();
        String generatedEmployeeCode = generateEmployeeCodeForRole(roleCode);
        String username = resolveUniqueUsername(
                decision != null ? decision.getUsername() : null,
                app.getFullName(),
                app.getEmail()
        );
        String rawTempPass = decision != null && decision.getTemporaryPassword() != null && !decision.getTemporaryPassword().isBlank()
                ? decision.getTemporaryPassword().trim()
                : ("Ccadro@" + (app.getLookupPin() != null ? app.getLookupPin() : "2026"));

        UUID branchId = decision != null && decision.getBranchId() != null ? decision.getBranchId() : app.getPreferredBranchId();
        String branchCode = decision != null && decision.getBranchCode() != null && !decision.getBranchCode().isBlank()
                ? decision.getBranchCode()
                : app.getPreferredBranchCode();
        String assignedHub = decision != null && decision.getAssignedHubCode() != null && !decision.getAssignedHubCode().isBlank()
                ? MapperTextUtils.normalizeUpper(decision.getAssignedHubCode())
                : MapperTextUtils.normalizeUpper(app.getPreferredHubCode());

        boolean bgPassed = decision != null && decision.getBackgroundCheckPassed() != null
                ? decision.getBackgroundCheckPassed()
                : Boolean.TRUE;
        boolean healthPassed = decision != null && decision.getHealthCheckPassed() != null
                ? decision.getHealthCheckPassed()
                : Boolean.TRUE.equals(app.getHealthCheckDeclared());
        boolean safetyCertified = decision != null && decision.getSafetyTrainingCertified() != null
                ? decision.getSafetyTrainingCertified()
                : (Boolean.TRUE.equals(app.getSafetyTrainingDeclared()) && Boolean.TRUE.equals(app.getDriveTestPassed()));
        boolean signOff = decision != null && decision.getCanSignOffCompliance() != null
                ? decision.getCanSignOffCompliance()
                : Boolean.TRUE;
        boolean approveComplianceNow = decision == null || !Boolean.FALSE.equals(decision.getApproveComplianceNow());

        // 1. Tạo User IAM (với cờ mustChangePassword = true)
        Role targetRole = roleRepository.findById(roleCode)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy role: " + roleCode));
        String[] nameParts = splitFullName(app.getFullName());
        String encodedPass = passwordEncoder.encode(rawTempPass);
        Instant now = Instant.now();

        User newUser = User.builder()
                .username(username)
                .password(encodedPass)
                .email(app.getEmail())
                .firstName(nameParts[1])
                .lastName(nameParts[0])
                .phoneNumber(app.getPhone())
                .nationalId(app.getNationalId())
                .department(resolveDepartment(roleCode, decision))
                .jobTitle(resolveJobTitle(roleCode, decision))
                .assignedHubCode(assignedHub)
                .assignedShipperCode(decision != null ? MapperTextUtils.normalizeUpper(decision.getAssignedShipperCode()) : null)
                .status("ACTIVE")
                .kycStatus("VERIFIED")
                .mustChangePassword(true)
                .roles(Set.of(targetRole))
                .passwordChangedAt(now)
                .createdAt(now)
                .updatedAt(now)
                .build();
        User savedUser = userRepository.save(newUser);

        if (("HUB_SHIPPER".equals(roleCode) || "HUB_AUDITOR".equals(roleCode) || "HUB_MANAGER".equals(roleCode))
                && assignedHub != null && !hubIamAccountRepository.existsByUsernameIgnoreCase(username)) {
            hubIamAccountRepository.save(HubIamAccount.builder()
                    .username(username)
                    .passwordHash(encodedPass)
                    .fullName(app.getFullName())
                    .email(app.getEmail())
                    .phone(app.getPhone())
                    .functionalRole(roleCode)
                    .assignedHubCode(assignedHub)
                    .assignedShipperCode(decision != null ? MapperTextUtils.normalizeUpper(decision.getAssignedShipperCode()) : null)
                    .status("ACTIVE")
                    .createdBy(approverUsername != null ? approverUsername : "ADMIN")
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }

        // 2. Tạo StaffProfile chính thức
        StaffProfileRequest staffReq = StaffProfileRequest.builder()
                .employeeCode(generatedEmployeeCode)
                .fullName(app.getFullName())
                .username(username)
                .email(app.getEmail())
                .phone(app.getPhone())
                .nationalId(app.getNationalId())
                .roleCode(roleCode)
                .department(resolveDepartment(roleCode, decision))
                .jobTitle(resolveJobTitle(roleCode, decision))
                .branchId(branchId)
                .branchCode(branchCode)
                .contractType(decision != null && decision.getContractType() != null ? decision.getContractType() : "FULL_TIME")
                .shiftName(decision != null && decision.getShiftName() != null ? decision.getShiftName() : "CA_HANH_CHINH")
                .baseSalaryVnd(decision != null && decision.getApprovedSalaryVnd() != null
                        ? decision.getApprovedSalaryVnd()
                        : app.getExpectedSalaryVnd())
                .hireDate(LocalDate.now())
                .status("ACTIVE")
                .verificationStatus(approveComplianceNow ? "APPROVED" : "PENDING_REVIEW")
                .verificationNotes(decision != null && decision.getApprovalNotes() != null
                        ? decision.getApprovalNotes()
                        : "Tiếp nhận từ đơn ứng tuyển " + app.getApplicationCode())
                .backgroundCheckPassed(bgPassed)
                .licenseNumber(app.getLicenseNumber())
                .licenseClass(app.getLicenseClass())
                .licenseExpiryDate(app.getLicenseExpiryDate())
                .healthCheckPassed(healthPassed)
                .healthCheckDate(decision != null && decision.getHealthCheckDate() != null
                        ? decision.getHealthCheckDate()
                        : (healthPassed ? LocalDate.now() : null))
                .safetyTrainingCertified(safetyCertified)
                .assignedVehiclePlate(decision != null ? decision.getAssignedVehiclePlate() : null)
                .assignedHubCode(assignedHub)
                .demeritPoints(0)
                .certificationCode(app.getCertificationCode())
                .certificateExpiryDate(app.getCertificateExpiryDate())
                .issuingAuthority(app.getIssuingAuthority())
                .inspectionScope(app.getInspectionScope())
                .canSignOffCompliance(signOff)
                .notes("Onboarded from application " + app.getApplicationCode())
                .build();
        StaffProfileResponse createdStaff = staffProfileService.createStaff(staffReq);

        // 3. Đồng bộ sang asset-service (best-effort) nếu ứng viên là DRIVER
        String assetSyncStatus = "NOT_APPLICABLE";
        if ("DRIVER".equals(roleCode)) {
            assetSyncStatus = syncDriverToAssetServiceBestEffort(app, generatedEmployeeCode);
        }

        // 4. Đóng hồ sơ ứng tuyển & ghi Audit Log
        String actor = approverUsername != null && !approverUsername.isBlank() ? approverUsername : "ADMIN";
        app.setApplicationStatus("APPROVED_ONBOARDED");
        app.setApprovedBy(actor);
        app.setApprovedAt(now);
        app.setReviewedBy(actor);
        app.setCreatedStaffId(createdStaff.getId());
        app.setCreatedUserId(savedUser.getId());
        app.setCreatedUsername(username);
        if (decision != null && decision.getApprovalNotes() != null && !decision.getApprovalNotes().isBlank()) {
            app.setScreeningNotes(decision.getApprovalNotes().trim());
        }
        app.setUpdatedAt(now);
        JobApplication savedApp = jobApplicationRepository.save(app);

        hubAuthAuditLogRepository.save(HubAuthAuditLog.builder()
                .eventType("APPLICATION_ONBOARDED")
                .username(username)
                .functionalRole(roleCode)
                .hubCode(assignedHub)
                .httpStatus(200)
                .detail(actor + " xác nhận đơn " + app.getApplicationCode()
                        + " -> cấp tài khoản @" + username + " (" + generatedEmployeeCode + ", role=" + roleCode + ")")
                .createdAt(now)
                .build());

        return JobApplicationApproveResponse.builder()
                .application(mapToResponse(savedApp))
                .createdStaff(createdStaff)
                .onboardedUsername(username)
                .generatedEmployeeCode(generatedEmployeeCode)
                .mustChangePassword(true)
                .assetDriverSyncStatus(assetSyncStatus)
                .build();
    }

    @Transactional
    public JobApplicationResponse rejectApplication(UUID id, String reason, String actorUsername) {
        JobApplication app = findOrThrow(id);
        jobApplicationValidator.validateStageStatus(app, "REJECTED");
        String actor = actorUsername != null && !actorUsername.isBlank() ? actorUsername : "REVIEWER";
        app.setApplicationStatus("REJECTED");
        app.setRejectionReason(reason != null && !reason.isBlank()
                ? reason.trim()
                : "Hồ sơ chưa đáp ứng tiêu chuẩn tuyển dụng của vị trí.");
        app.setReviewedBy(actor);
        app.setUpdatedAt(Instant.now());
        return mapToResponse(jobApplicationRepository.save(app));
    }

    private String syncDriverToAssetServiceBestEffort(JobApplication app, String employeeCode) {
        try {
            RestClient client = RestClient.builder().baseUrl(assetServiceUrl).build();
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("driverCode", employeeCode);
            body.put("fullName", app.getFullName());
            body.put("phone", app.getPhone());
            body.put("email", app.getEmail());
            body.put("nationalId", app.getNationalId());
            body.put("licenseClass", app.getLicenseClass() != null ? app.getLicenseClass() : "FC");
            body.put("licenseNumber", app.getLicenseNumber());
            body.put("licenseExpiryDate", app.getLicenseExpiryDate() != null ? app.getLicenseExpiryDate().toString() : null);
            body.put("experienceYears", app.getExperienceYears() != null ? app.getExperienceYears() : 1);
            body.put("verified", true);

            client.post()
                    .uri("/api/v1/assets/drivers")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            return "SYNCED_TO_ASSET_SERVICE";
        } catch (Exception ex) {
            log.warn("Không thể đồng bộ Driver {} sang asset-service (non-blocking): {}", employeeCode, ex.getMessage());
            return "DEFERRED_ASSET_SYNC";
        }
    }

    private JobApplication findOrThrow(UUID id) {
        return jobApplicationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Không tìm thấy hồ sơ ứng tuyển: " + id));
    }

    private JobApplicationResponse mapToResponse(JobApplication app) {
        Map<UUID, String> branchNameMap = staffOrganizationValidator.buildBranchNameMap();
        String branchName = app.getPreferredBranchId() != null
                ? branchNameMap.getOrDefault(app.getPreferredBranchId(), app.getPreferredBranchCode())
                : app.getPreferredBranchCode();
        return jobApplicationMapper.toResponse(app, branchName);
    }

    private Branch resolvePreferredBranch(UUID branchId, String branchCode) {
        return branchService.getBranches(null, null, false).stream()
                .filter(b -> (branchId != null && branchId.equals(b.getId()))
                        || (branchCode != null && branchCode.equalsIgnoreCase(b.getBranchCode())))
                .findFirst()
                .map(b -> Branch.builder().id(b.getId()).branchCode(b.getBranchCode()).branchName(b.getBranchName()).build())
                .orElse(null);
    }

    private String generateUniqueApplicationCode() {
        String year = String.valueOf(Year.now().getValue());
        for (int i = 0; i < 10; i++) {
            String candidate = "APP-" + year + "-" + String.format("%04d", 1000 + RANDOM.nextInt(9000));
            if (!jobApplicationRepository.existsByApplicationCodeIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return "APP-" + year + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
    }

    private String generateEmployeeCodeForRole(String roleCode) {
        String prefix = switch (roleCode) {
            case "DRIVER" -> "NV-DRV-";
            case "HUB_SHIPPER" -> "NV-SHP-";
            case "SAFETY_MANAGER" -> "NV-SAF-";
            case "ESG_AUDITOR" -> "NV-ESG-";
            case "HUB_AUDITOR" -> "NV-AUD-";
            case "HUB_MANAGER" -> "NV-HUB-";
            default -> "NV-DSP-";
        };
        return prefix + (100 + RANDOM.nextInt(900));
    }

    private String resolveUniqueUsername(String requestedUsername, String fullName, String email) {
        String base = MapperTextUtils.trimLowerOrNull(requestedUsername);
        if (base == null && email != null && email.contains("@")) {
            base = email.substring(0, email.indexOf('@')).replaceAll("[^a-z0-9_]", "");
        }
        if (base == null || base.isBlank()) {
            base = "staff_" + fullName.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        }
        String candidate = base;
        int seq = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + seq;
            seq++;
        }
        return candidate;
    }

    private String resolveDepartment(String roleCode, JobApplicationDecisionRequest decision) {
        if (decision != null && decision.getDepartment() != null && !decision.getDepartment().isBlank()) {
            return decision.getDepartment().trim();
        }
        return switch (roleCode) {
            case "DRIVER" -> "Đội Xe Đầu Kéo Điện & Container";
            case "HUB_SHIPPER" -> "Đội Giao Nhận Last-Mile Hub 3PL";
            case "SAFETY_MANAGER" -> "An Toàn Vận Hành & HSE";
            case "ESG_AUDITOR" -> "Kiểm Toán Carbon GLEC v3";
            case "HUB_AUDITOR" -> "Kiểm Soát Chất Lượng Hub 3PL";
            case "HUB_MANAGER" -> "Điều Hành Trụ Sở Hub";
            default -> "Trung Tâm Điều Hành NOC 24/7";
        };
    }

    private String resolveJobTitle(String roleCode, JobApplicationDecisionRequest decision) {
        if (decision != null && decision.getJobTitle() != null && !decision.getJobTitle().isBlank()) {
            return decision.getJobTitle().trim();
        }
        return switch (roleCode) {
            case "DRIVER" -> "Tài Xế Vận Tải Hành Lang Xanh";
            case "HUB_SHIPPER" -> "Shipper Giao Nhận Photo POD";
            case "SAFETY_MANAGER" -> "Chuyên Viên Kiểm Soát An Toàn";
            case "ESG_AUDITOR" -> "Kiểm Toán Viên Phát Thải ESG";
            case "HUB_AUDITOR" -> "Kiểm Tra Viên SLA Trụ Sở";
            case "HUB_MANAGER" -> "Trưởng Trụ Sở Hub";
            default -> "Điều Phối Viên NOC";
        };
    }

    private String[] splitFullName(String fullName) {
        String trimmed = fullName != null ? fullName.trim() : "User";
        int idx = trimmed.lastIndexOf(' ');
        if (idx <= 0) return new String[]{"", trimmed};
        return new String[]{trimmed.substring(0, idx).trim(), trimmed.substring(idx + 1).trim()};
    }
}
