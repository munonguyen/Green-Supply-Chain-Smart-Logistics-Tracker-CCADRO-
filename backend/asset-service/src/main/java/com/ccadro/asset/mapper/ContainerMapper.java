package com.ccadro.asset.mapper;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.dto.request.ContainerCreateRequest;
import com.ccadro.asset.dto.response.ContainerResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ContainerMapper {
    // Lombok's getESeal… accessors expose the JavaBeans property ESeal…,
    // while Lombok builders use the field name eSeal…. Map explicitly.
    @Mapping(target = "eSealNumber", source = "ESealNumber")
    Container toEntity(ContainerCreateRequest request);
    @Mapping(target = "eSealNumber", source = "ESealNumber")
    @Mapping(target = "eSealStatus", source = "ESealStatus")
    @Mapping(target = "eSealIntegrityPct", source = "ESealIntegrityPct")
    ContainerResponse toResponse(Container entity);
    List<ContainerResponse> toResponseList(List<Container> entities);
}

