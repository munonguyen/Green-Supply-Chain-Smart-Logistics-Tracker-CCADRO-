package com.ccadro.payment.mapper;

import com.ccadro.payment.dto.response.*;
import com.ccadro.payment.entity.*;
import org.mapstruct.*;

/** Generated allow-list mappings preserve the public response and leave business decisions in services. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface PaymentMapper {
    PaymentAuditLogResponse audit(PaymentAuditLog entity);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "tx.id")
    @Mapping(target = "transactionCode", source = "tx.transactionCode")
    @Mapping(target = "invoiceNumber", source = "tx.invoiceNumber")
    @Mapping(target = "shipmentCode", source = "tx.shipmentCode")
    @Mapping(target = "customerId", source = "tx.customerId")
    @Mapping(target = "customerName", source = "tx.customerName")
    @Mapping(target = "receiptEmail", source = "tx.receiptEmail")
    @Mapping(target = "createdByUsername", source = "tx.createdByUsername")
    @Mapping(target = "originName", source = "tx.originName")
    @Mapping(target = "destinationName", source = "tx.destinationName")
    @Mapping(target = "containerCode", source = "tx.containerCode")
    @Mapping(target = "vehicleType", source = "tx.vehicleType")
    @Mapping(target = "powertrainType", source = "tx.powertrainType")
    @Mapping(target = "paymentMethod", source = "tx.paymentMethod")
    @Mapping(target = "currency", source = "tx.currency")
    @Mapping(target = "baseFreightVnd", source = "tx.baseFreightVnd")
    @Mapping(target = "greenEsgDiscountVnd", source = "tx.greenEsgDiscountVnd")
    @Mapping(target = "vatAmountVnd", source = "tx.vatAmountVnd")
    @Mapping(target = "totalAmountVnd", source = "tx.totalAmountVnd")
    @Mapping(target = "co2SavedKg", source = "tx.co2SavedKg")
    @Mapping(target = "paymentStatus", source = "tx.paymentStatus")
    @Mapping(target = "gatewayProvider", source = "tx.gatewayProvider")
    @Mapping(target = "gatewayReference", source = "tx.gatewayReference")
    @Mapping(target = "qrPayload", source = "tx.qrPayload")
    @Mapping(target = "bankCode", source = "tx.bankCode")
    @Mapping(target = "bankAccountNo", source = "tx.bankAccountNo")
    @Mapping(target = "cardLast4", source = "tx.cardLast4")
    @Mapping(target = "payerName", source = "tx.payerName")
    @Mapping(target = "notes", source = "tx.notes")
    @Mapping(target = "paidAt", source = "tx.paidAt")
    @Mapping(target = "dueAt", source = "tx.dueAt")
    @Mapping(target = "isDeleted", source = "tx.isDeleted")
    @Mapping(target = "deletedAt", source = "tx.deletedAt")
    @Mapping(target = "deletedBy", source = "tx.deletedBy")
    @Mapping(target = "createdAt", source = "tx.createdAt")
    @Mapping(target = "updatedAt", source = "tx.updatedAt")
    PaymentTransactionResponse toResponse(PaymentTransaction tx);
}
