package com.ccadro.asset.mapper;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.dto.request.ContainerCreateRequest;
import com.ccadro.asset.dto.response.ContainerResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ContainerMapper {
    Container toEntity(ContainerCreateRequest request);
    ContainerResponse toResponse(Container entity);
    List<ContainerResponse> toResponseList(List<Container> entities);
}

