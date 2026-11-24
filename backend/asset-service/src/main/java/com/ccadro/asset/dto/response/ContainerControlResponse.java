package com.ccadro.asset.dto.response;

import java.time.Instant;
import java.util.List;

public record ContainerControlResponse(
        String containerCode, int roundNumber, Instant startedAt, String startedBy,
        String startedRole, String initialStatus, Instant completedAt,
        String shipmentCode, String epodRecipient, Instant epodAt,
        List<Stage> stages, List<ContainerControlResponse> history) {
    public record Check(String key, String label) {}
    public record Evidence(String group, String label, String value) {}
    public record Stage(String stage, String label, List<Check> checks, List<String> permittedRoles,
                        List<String> checkedKeys, Instant completedAt, String completedBy,
                        String completedRole, String notes, List<Evidence> evidence) {}
}
