package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RoleStaffSummaryResponse {
    String roleCode;
    long totalCount;
    long activeCount;
    long onLeaveCount;
    long totalPayrollVnd;
}
