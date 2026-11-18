package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JobApplicationApproveResponse {
    JobApplicationResponse application;
    StaffProfileResponse createdStaff;
    String onboardedUsername;
    String generatedEmployeeCode;
    Boolean mustChangePassword;
    String assetDriverSyncStatus;
}

