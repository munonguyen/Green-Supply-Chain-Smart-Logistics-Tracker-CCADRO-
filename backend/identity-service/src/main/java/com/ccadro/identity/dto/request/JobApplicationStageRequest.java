package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JobApplicationStageRequest {
    @NotBlank(message = "Trạng thái quy trình mới không được để trống")
    String applicationStatus;

    String screeningNotes;
    String interviewScheduledAt;
    Integer interviewScore;
    Boolean driveTestPassed;
    Boolean healthCheckDeclared;
    Boolean safetyTrainingDeclared;
    String rejectionReason;
}

