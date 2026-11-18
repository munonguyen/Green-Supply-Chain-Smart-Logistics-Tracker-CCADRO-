package com.ccadro.payment.mapper;

import com.ccadro.payment.dto.response.*;
import com.ccadro.payment.entity.*;
import org.mapstruct.*;

/** Generated allow-list mappings preserve the public response and leave business decisions in services. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ContractMapper {
    ContractSlaEventResponse audit(ContractSlaEvent entity);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "c.id")
    @Mapping(target = "contractNumber", source = "c.contractNumber")
    @Mapping(target = "contractType", source = "c.contractType")
    @Mapping(target = "parentContractNumber", source = "c.parentContractNumber")
    @Mapping(target = "shipmentCode", source = "c.shipmentCode")
    @Mapping(target = "customerId", source = "c.customerId")
    @Mapping(target = "customerName", source = "c.customerName")
    @Mapping(target = "signedByCustomerUser", source = "c.signedByCustomerUser")
    @Mapping(target = "customerSignatureHash", source = "c.customerSignatureHash")
    @Mapping(target = "providerName", source = "c.providerName")
    @Mapping(target = "corridorScope", source = "c.corridorScope")
    @Mapping(target = "containerCode", source = "c.containerCode")
    @Mapping(target = "eSealNumber", source = "c.ESealNumber")
    @Mapping(target = "vehicleType", source = "c.vehicleType")
    @Mapping(target = "licensePlate", source = "c.licensePlate")
    @Mapping(target = "slaOnTimeRatePct", source = "c.slaOnTimeRatePct")
    @Mapping(target = "slaMaxTempDeviationC", source = "c.slaMaxTempDeviationC")
    @Mapping(target = "slaPenaltyPctPerBreach", source = "c.slaPenaltyPctPerBreach")
    @Mapping(target = "minCo2ReductionKg", source = "c.minCo2ReductionKg")
    @Mapping(target = "creditLimitVnd", source = "c.creditLimitVnd", defaultValue = "0L")
    @Mapping(target = "usedCreditVnd", source = "c.usedCreditVnd", defaultValue = "0L")
    @Mapping(target = "availableCreditVnd", expression = "java(availableCredit(c))")
    @Mapping(target = "contractValueVnd", source = "c.contractValueVnd")
    @Mapping(target = "slaPenaltyDeductionVnd", source = "c.slaPenaltyDeductionVnd")
    @Mapping(target = "finalSettlementVnd", source = "c.finalSettlementVnd")
    @Mapping(target = "paymentTerms", source = "c.paymentTerms")
    @Mapping(target = "contractStatus", source = "c.contractStatus")
    @Mapping(target = "effectiveFrom", source = "c.effectiveFrom")
    @Mapping(target = "effectiveTo", source = "c.effectiveTo")
    @Mapping(target = "signedAt", source = "c.signedAt")
    @Mapping(target = "settledAt", source = "c.settledAt")
    @Mapping(target = "notes", source = "c.notes")
    @Mapping(target = "isDeleted", source = "c.isDeleted")
    @Mapping(target = "deletedAt", source = "c.deletedAt")
    @Mapping(target = "deletedBy", source = "c.deletedBy")
    @Mapping(target = "createdAt", source = "c.createdAt")
    @Mapping(target = "updatedAt", source = "c.updatedAt")
    B2bContractResponse toResponse(B2bContract c);

    default long availableCredit(B2bContract c) {
        long limit = c.getCreditLimitVnd() == null ? 0L : c.getCreditLimitVnd();
        long used = c.getUsedCreditVnd() == null ? 0L : c.getUsedCreditVnd();
        return Math.max(0L, limit - used);
    }
}
