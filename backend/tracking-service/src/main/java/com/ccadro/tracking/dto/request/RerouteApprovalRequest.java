package com.ccadro.tracking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RerouteApprovalRequest {
    @NotBlank(message = "decision must not be blank")
    String decision; // ACCEPTED or REJECTED
    String comments;
    String approvedBy;
}

