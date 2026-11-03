package com.ccadro.tracking.mapper;

import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RerouteProposalMapper {
    RerouteProposalResponse toResponse(RerouteProposal entity);
    List<RerouteProposalResponse> toResponseList(List<RerouteProposal> entities);
}

