package com.ccadro.hubshipper.mapper;

import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.dto.response.HubShipperWorkspaceResponse;
import com.ccadro.hubshipper.entity.*;
import java.util.List;
import org.mapstruct.*;

@Mapper(componentModel="spring", unmappedTargetPolicy=ReportingPolicy.ERROR)
public interface HubWorkspaceMapper {
    @Mapping(target="isolatedHubCode", source="hubCode")
    @Mapping(target="strictHubIsolationEnforced", constant="true")
    HubShipperWorkspaceResponse workspace(String hubCode, LocalDistributionHub hub, HubShipperPolicy policy,
            HubLocalShipper activeShipper, List<HubLocalShipper> hubShippers,
            List<HubTaskRangeAssignment> rangeAssignments, List<ContainerCargoManifestItem> manifestItems);

    @Mapping(target="username", source="username")
    @Mapping(target="scope", source="scope")
    @Mapping(target="assignedHubCode", source="hubCode")
    @Mapping(target="assignedShipperCode", source="shipperCode")
    HubAuthContext authContext(String username, String scope, String hubCode, String shipperCode);
}
