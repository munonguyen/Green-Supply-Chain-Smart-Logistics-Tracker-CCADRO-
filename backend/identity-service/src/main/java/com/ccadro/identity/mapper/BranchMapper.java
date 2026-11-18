package com.ccadro.identity.mapper;

import com.ccadro.identity.dto.request.BranchRequest;
import com.ccadro.identity.dto.response.BranchResponse;
import com.ccadro.identity.entity.Branch;
import org.mapstruct.*;

/** Strict MapStruct mapper for Branch CRUD following allow-list mapping discipline. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR, imports = MapperTextUtils.class)
public interface BranchMapper {

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "branchCode", expression = "java(MapperTextUtils.normalizeUpper(req.getBranchCode()))")
    @Mapping(target = "branchName", expression = "java(MapperTextUtils.trimOrNull(req.getBranchName()))")
    @Mapping(target = "region", expression = "java(MapperTextUtils.normalizeOrDefault(req.getRegion(), \"MIEN_NAM\"))")
    @Mapping(target = "branchType", expression = "java(MapperTextUtils.normalizeOrDefault(req.getBranchType(), \"REGIONAL_HUB\"))")
    @Mapping(target = "city", expression = "java(MapperTextUtils.trimOrNull(req.getCity()))")
    @Mapping(target = "address", expression = "java(MapperTextUtils.trimOrNull(req.getAddress()))")
    @Mapping(target = "phone", expression = "java(MapperTextUtils.trimOrNull(req.getPhone()))")
    @Mapping(target = "email", expression = "java(MapperTextUtils.trimOrNull(req.getEmail()))")
    @Mapping(target = "managerUsername", expression = "java(MapperTextUtils.trimOrNull(req.getManagerUsername()))")
    @Mapping(target = "managerName", expression = "java(MapperTextUtils.trimOrNull(req.getManagerName()))")
    @Mapping(target = "vehicleCapacity", expression = "java(req.getVehicleCapacity() != null ? Math.max(0, req.getVehicleCapacity()) : 30)")
    @Mapping(target = "monthlyRevenueTargetVnd", expression = "java(req.getMonthlyRevenueTargetVnd() != null ? Math.max(0L, req.getMonthlyRevenueTargetVnd()) : 500_000_000L)")
    @Mapping(target = "status", expression = "java(MapperTextUtils.normalizeOrDefault(req.getStatus(), \"ACTIVE\"))")
    @Mapping(target = "isDeleted", constant = "false")
    Branch toEntity(BranchRequest req);

    @BeanMapping(ignoreByDefault = true, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "branchName", expression = "java(req.getBranchName() != null && !req.getBranchName().isBlank() ? req.getBranchName().trim() : entity.getBranchName())")
    @Mapping(target = "region", expression = "java(req.getRegion() != null && !req.getRegion().isBlank() ? MapperTextUtils.normalizeUpper(req.getRegion()) : entity.getRegion())")
    @Mapping(target = "branchType", expression = "java(req.getBranchType() != null && !req.getBranchType().isBlank() ? MapperTextUtils.normalizeUpper(req.getBranchType()) : entity.getBranchType())")
    @Mapping(target = "city", expression = "java(req.getCity() != null && !req.getCity().isBlank() ? req.getCity().trim() : entity.getCity())")
    @Mapping(target = "address", expression = "java(req.getAddress() != null ? MapperTextUtils.trimOrNull(req.getAddress()) : entity.getAddress())")
    @Mapping(target = "phone", expression = "java(req.getPhone() != null ? MapperTextUtils.trimOrNull(req.getPhone()) : entity.getPhone())")
    @Mapping(target = "email", expression = "java(req.getEmail() != null ? MapperTextUtils.trimOrNull(req.getEmail()) : entity.getEmail())")
    @Mapping(target = "managerUsername", expression = "java(req.getManagerUsername() != null ? MapperTextUtils.trimOrNull(req.getManagerUsername()) : entity.getManagerUsername())")
    @Mapping(target = "managerName", expression = "java(req.getManagerName() != null ? MapperTextUtils.trimOrNull(req.getManagerName()) : entity.getManagerName())")
    @Mapping(target = "vehicleCapacity", expression = "java(req.getVehicleCapacity() != null ? Math.max(0, req.getVehicleCapacity()) : entity.getVehicleCapacity())")
    @Mapping(target = "monthlyRevenueTargetVnd", expression = "java(req.getMonthlyRevenueTargetVnd() != null ? Math.max(0L, req.getMonthlyRevenueTargetVnd()) : entity.getMonthlyRevenueTargetVnd())")
    @Mapping(target = "status", expression = "java(req.getStatus() != null && !req.getStatus().isBlank() ? MapperTextUtils.normalizeUpper(req.getStatus()) : entity.getStatus())")
    void updateEntity(@MappingTarget Branch entity, BranchRequest req);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "b.id")
    @Mapping(target = "branchCode", source = "b.branchCode")
    @Mapping(target = "branchName", source = "b.branchName")
    @Mapping(target = "region", source = "b.region")
    @Mapping(target = "branchType", source = "b.branchType")
    @Mapping(target = "city", source = "b.city")
    @Mapping(target = "address", source = "b.address")
    @Mapping(target = "phone", source = "b.phone")
    @Mapping(target = "email", source = "b.email")
    @Mapping(target = "managerUsername", source = "b.managerUsername")
    @Mapping(target = "managerName", source = "b.managerName")
    @Mapping(target = "vehicleCapacity", source = "b.vehicleCapacity")
    @Mapping(target = "monthlyRevenueTargetVnd", source = "b.monthlyRevenueTargetVnd")
    @Mapping(target = "status", source = "b.status")
    @Mapping(target = "activeStaffCount", source = "activeStaffCount")
    @Mapping(target = "isDeleted", source = "b.isDeleted")
    @Mapping(target = "deletedAt", source = "b.deletedAt")
    @Mapping(target = "deletedBy", source = "b.deletedBy")
    @Mapping(target = "createdAt", source = "b.createdAt")
    @Mapping(target = "updatedAt", source = "b.updatedAt")
    BranchResponse toResponse(Branch b, long activeStaffCount);
}
