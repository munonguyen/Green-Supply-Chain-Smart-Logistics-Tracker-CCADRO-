package com.ccadro.asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ContainerSafetyInspectionRequest {
    @Min(1)
    private Integer roundNumber;
    private java.util.UUID inspectionId;
    private Long revision;
    @NotNull
    private Boolean complete = true;
    @NotBlank @Size(max = 20)
    private String templateVersion;
    @NotNull @Size(max = 30)
    private List<@Valid CheckResult> checks;
    @Size(max = 2000)
    private String summaryNotes;

    @Data
    public static class CheckResult {
        @NotBlank @Size(max = 80)
        private String key;
        @NotBlank @Pattern(regexp = "PASS|FAIL")
        private String status;
        @Size(max = 1000)
        private String notes;
        @Size(max = 20)
        private Map<String, @Pattern(regexp = "PASS|FAIL") String> criteriaResults;
        @Size(max = 20)
        private Map<String, @Size(max = 60) String> measurements;
        @Size(max = 20)
        private List<@Size(max = 200) String> selectedReasons;
    }
}
