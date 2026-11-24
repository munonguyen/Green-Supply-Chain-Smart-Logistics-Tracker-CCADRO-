package com.ccadro.asset.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ContainerSafetyInspectionResponse(
    String containerCode,
    String containerType,
    int roundNumber,
    String templateVersion,
    List<TemplateItem> template,
    Inspection inspection,
    List<Inspection> history
) {
    public record Summary(String containerCode, String containerType, String containerStatus, String ownerName,
                          String status, int inspectionNumber, int checkedItemsCount, int totalItemsCount,
                          int failedItemsCount, String inspectedBy, Instant inspectedAt, Instant updatedAt) {}
    public record CriterionSpec(
        String code,
        String label,
        String metricName,
        String unit,
        String thresholdLabel,
        Double minValue,
        Double maxValue
    ) {}
    public record TemplateItem(
        String key,
        String label,
        String group,
        String guidance,
        boolean critical,
        String standardRef,
        String objective,
        List<CriterionSpec> criteria,
        List<String> failureReasons
    ) {
        public TemplateItem(String key, String label, String group, String guidance, boolean critical) {
            this(key, label, group, guidance, critical, null, null, List.of(), List.of());
        }
    }
    public record CheckResult(
        String key,
        String status,
        String notes,
        Map<String, String> criteriaResults,
        Map<String, String> measurements,
        List<String> selectedReasons
    ) {
        public CheckResult(String key, String status, String notes) {
            this(key, status, notes, null, null, null);
        }
    }
    public record Inspection(UUID id, int roundNumber, String status, int failedItemsCount, String inspectedBy,
                             String inspectorRole, Instant inspectedAt, String summaryNotes,
                             String templateVersion, String containerType, List<CheckResult> checks,
                             int inspectionNumber, int checkedItemsCount, int totalItemsCount,
                             long revision, Instant updatedAt) {}
}
