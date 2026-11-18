package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CareerOpeningResponse {
    String roleCode;
    String roleTitle;
    String category;
    String requirementsSummary;
    List<BranchResponse> activeBranches;
}

