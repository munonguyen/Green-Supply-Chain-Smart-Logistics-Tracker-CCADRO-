package com.ccadro.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateContractRequest {

    private String contractType; // MASTER_MSA | SPOT_TRIP
    private String parentContractNumber;
    private String shipmentCode;

    @NotBlank(message = "Mã khách hàng (customerId) không được để trống")
    private String customerId;

    @NotBlank(message = "Tên doanh nghiệp (customerName) không được để trống")
    private String customerName;

    private String corridorScope;
    private String containerCode;
    private String eSealNumber;
    private String vehicleType;
    private String licensePlate;
    private Double slaOnTimeRatePct;
    private Double slaMaxTempDeviationC;
    private Double slaPenaltyPctPerBreach;
    private Double minCo2ReductionKg;
    private Long creditLimitVnd;
    private Long contractValueVnd;
    private String paymentTerms; // PREPAID | NET30
    private String signedByCustomerUser;
    private Boolean autoSign;
    private String notes;
}

