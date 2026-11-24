package com.ccadro.hubshipper.dto.response;

import com.ccadro.hubshipper.entity.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HubShipperWorkspaceResponse {
    String isolatedHubCode;
    boolean strictHubIsolationEnforced;
    LocalDistributionHub hub;
    HubShipperPolicy policy;
    HubLocalShipper activeShipper;
    List<HubLocalShipper> hubShippers;
    List<HubTaskRangeAssignment> rangeAssignments;
    List<ContainerCargoManifestItem> manifestItems;
    List<HubShipperShiftSettlement> shiftSettlements;
    List<HubShipperCodRemittance> codRemittances;
}

