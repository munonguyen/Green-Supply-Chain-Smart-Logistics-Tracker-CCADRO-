package com.ccadro.identity.mapper;

import com.ccadro.identity.dto.response.*;
import com.ccadro.identity.entity.*;
import org.mapstruct.*;

/** Generated allow-list mappings preserve the public response and leave business decisions in services. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface CompanyMapper {
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "c.id")
    @Mapping(target = "companyCode", source = "c.companyCode")
    @Mapping(target = "companyName", source = "c.companyName")
    @Mapping(target = "taxCode", source = "c.taxCode")
    @Mapping(target = "businessLicenseNumber", source = "c.businessLicenseNumber")
    @Mapping(target = "industry", source = "c.industry")
    @Mapping(target = "companyType", source = "c.companyType")
    @Mapping(target = "companyPhone", source = "c.companyPhone")
    @Mapping(target = "companyEmail", source = "c.companyEmail")
    @Mapping(target = "headquartersAddress", source = "c.headquartersAddress")
    @Mapping(target = "representativeName", source = "c.representativeName")
    @Mapping(target = "representativeTitle", source = "c.representativeTitle")
    @Mapping(target = "creditTier", source = "c.creditTier")
    @Mapping(target = "creditLimitVnd", source = "c.creditLimitVnd")
    @Mapping(target = "kycStatus", source = "c.kycStatus")
    @Mapping(target = "activeUserCount", source = "activeUserCount")
    @Mapping(target = "isDeleted", source = "c.isDeleted")
    @Mapping(target = "deletedAt", source = "c.deletedAt")
    @Mapping(target = "deletedBy", source = "c.deletedBy")
    @Mapping(target = "createdAt", source = "c.createdAt")
    @Mapping(target = "updatedAt", source = "c.updatedAt")
    CompanyResponse toResponse(Company c, long activeUserCount);
}
