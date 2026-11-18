package com.ccadro.identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JobApplicationDecisionRequest {
    String username;
    String temporaryPassword;
    String department;
    String jobTitle;
    UUID branchId;
    String branchCode;
    String assignedHubCode;
    String assignedShipperCode;
    String assignedVehiclePlate;
    Long approvedSalaryVnd;
    String contractType;
    String shiftName;
    Boolean approveComplianceNow;
    Boolean backgroundCheckPassed;
    Boolean healthCheckPassed;
    LocalDate healthCheckDate;
    Boolean safetyTrainingCertified;
    Boolean canSignOffCompliance;
    String approvalNotes;
}

