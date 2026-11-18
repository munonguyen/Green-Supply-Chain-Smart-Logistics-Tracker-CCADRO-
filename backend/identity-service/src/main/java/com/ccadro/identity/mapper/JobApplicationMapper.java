package com.ccadro.identity.mapper;

import com.ccadro.identity.dto.request.JobApplicationSubmitRequest;
import com.ccadro.identity.dto.response.JobApplicationPublicStatusResponse;
import com.ccadro.identity.dto.response.JobApplicationResponse;
import com.ccadro.identity.entity.JobApplication;
import org.mapstruct.*;

/** Strict MapStruct mapper for JobApplication public intake, tracking, and admin review. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR, imports = MapperTextUtils.class)
public interface JobApplicationMapper {

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "fullName", expression = "java(MapperTextUtils.trimOrNull(req.getFullName()))")
    @Mapping(target = "email", expression = "java(MapperTextUtils.trimLowerOrNull(req.getEmail()))")
    @Mapping(target = "phone", expression = "java(MapperTextUtils.trimOrNull(req.getPhone()))")
    @Mapping(target = "nationalId", expression = "java(MapperTextUtils.trimOrNull(req.getNationalId()))")
    @Mapping(target = "appliedRoleCode", expression = "java(MapperTextUtils.normalizeUpper(req.getAppliedRoleCode()))")
    @Mapping(target = "preferredBranchId", source = "req.preferredBranchId")
    @Mapping(target = "preferredBranchCode", expression = "java(MapperTextUtils.normalizeUpper(req.getPreferredBranchCode()))")
    @Mapping(target = "preferredHubCode", expression = "java(MapperTextUtils.normalizeUpper(req.getPreferredHubCode()))")
    @Mapping(target = "experienceYears", expression = "java(req.getExperienceYears() != null ? Math.max(0, req.getExperienceYears()) : 0)")
    @Mapping(target = "expectedSalaryVnd", expression = "java(req.getExpectedSalaryVnd() != null ? Math.max(0L, req.getExpectedSalaryVnd()) : 18_000_000L)")
    @Mapping(target = "resumeSummary", expression = "java(MapperTextUtils.trimOrNull(req.getResumeSummary()))")
    @Mapping(target = "licenseNumber", expression = "java(MapperTextUtils.normalizeUpper(req.getLicenseNumber()))")
    @Mapping(target = "licenseClass", expression = "java(MapperTextUtils.normalizeUpper(req.getLicenseClass()))")
    @Mapping(target = "licenseExpiryDate", source = "req.licenseExpiryDate")
    @Mapping(target = "healthCheckDeclared", expression = "java(Boolean.TRUE.equals(req.getHealthCheckDeclared()))")
    @Mapping(target = "safetyTrainingDeclared", expression = "java(Boolean.TRUE.equals(req.getSafetyTrainingDeclared()))")
    @Mapping(target = "certificationCode", expression = "java(MapperTextUtils.normalizeUpper(req.getCertificationCode()))")
    @Mapping(target = "certificateExpiryDate", source = "req.certificateExpiryDate")
    @Mapping(target = "issuingAuthority", expression = "java(MapperTextUtils.trimOrNull(req.getIssuingAuthority()))")
    @Mapping(target = "inspectionScope", expression = "java(MapperTextUtils.trimOrNull(req.getInspectionScope()))")
    @Mapping(target = "applicationStatus", constant = "SUBMITTED")
    @Mapping(target = "driveTestPassed", constant = "false")
    JobApplication toEntity(JobApplicationSubmitRequest req);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "app.id")
    @Mapping(target = "applicationCode", source = "app.applicationCode")
    @Mapping(target = "fullName", source = "app.fullName")
    @Mapping(target = "email", source = "app.email")
    @Mapping(target = "phone", source = "app.phone")
    @Mapping(target = "nationalId", source = "app.nationalId")
    @Mapping(target = "appliedRoleCode", source = "app.appliedRoleCode")
    @Mapping(target = "preferredBranchId", source = "app.preferredBranchId")
    @Mapping(target = "preferredBranchCode", source = "app.preferredBranchCode")
    @Mapping(target = "preferredBranchName", source = "preferredBranchName")
    @Mapping(target = "preferredHubCode", source = "app.preferredHubCode")
    @Mapping(target = "experienceYears", source = "app.experienceYears")
    @Mapping(target = "expectedSalaryVnd", source = "app.expectedSalaryVnd")
    @Mapping(target = "resumeSummary", source = "app.resumeSummary")
    @Mapping(target = "licenseNumber", source = "app.licenseNumber")
    @Mapping(target = "licenseClass", source = "app.licenseClass")
    @Mapping(target = "licenseExpiryDate", source = "app.licenseExpiryDate")
    @Mapping(target = "healthCheckDeclared", source = "app.healthCheckDeclared")
    @Mapping(target = "safetyTrainingDeclared", source = "app.safetyTrainingDeclared")
    @Mapping(target = "certificationCode", source = "app.certificationCode")
    @Mapping(target = "certificateExpiryDate", source = "app.certificateExpiryDate")
    @Mapping(target = "issuingAuthority", source = "app.issuingAuthority")
    @Mapping(target = "inspectionScope", source = "app.inspectionScope")
    @Mapping(target = "applicationStatus", source = "app.applicationStatus")
    @Mapping(target = "screeningNotes", source = "app.screeningNotes")
    @Mapping(target = "interviewScheduledAt", source = "app.interviewScheduledAt")
    @Mapping(target = "interviewScore", source = "app.interviewScore")
    @Mapping(target = "driveTestPassed", source = "app.driveTestPassed")
    @Mapping(target = "reviewedBy", source = "app.reviewedBy")
    @Mapping(target = "approvedBy", source = "app.approvedBy")
    @Mapping(target = "approvedAt", source = "app.approvedAt")
    @Mapping(target = "rejectionReason", source = "app.rejectionReason")
    @Mapping(target = "createdStaffId", source = "app.createdStaffId")
    @Mapping(target = "createdUserId", source = "app.createdUserId")
    @Mapping(target = "createdUsername", source = "app.createdUsername")
    @Mapping(target = "createdAt", source = "app.createdAt")
    @Mapping(target = "updatedAt", source = "app.updatedAt")
    JobApplicationResponse toResponse(JobApplication app, String preferredBranchName);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "applicationCode", source = "applicationCode")
    @Mapping(target = "fullName", source = "fullName")
    @Mapping(target = "appliedRoleCode", source = "appliedRoleCode")
    @Mapping(target = "preferredBranchCode", source = "preferredBranchCode")
    @Mapping(target = "applicationStatus", source = "applicationStatus")
    @Mapping(target = "screeningNotes", source = "screeningNotes")
    @Mapping(target = "interviewScheduledAt", source = "interviewScheduledAt")
    @Mapping(target = "interviewScore", source = "interviewScore")
    @Mapping(target = "driveTestPassed", source = "driveTestPassed")
    @Mapping(target = "rejectionReason", source = "rejectionReason")
    @Mapping(target = "createdUsername", source = "createdUsername")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    JobApplicationPublicStatusResponse toPublicStatusResponse(JobApplication app);
}

