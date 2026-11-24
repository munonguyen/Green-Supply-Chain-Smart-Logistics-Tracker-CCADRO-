package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShipperProfileRequest {

    @Size(max = 150)
    String fullName;

    @Size(max = 400000)
    String avatarUrl;

    @Size(max = 40)
    String phone;

    @Size(max = 255)
    String permanentAddress;

    @Size(max = 120)
    String emergencyContactName;

    @Size(max = 40)
    String emergencyContactPhone;

    @Size(max = 24)
    String cccdMasked;

    @Size(max = 140)
    String cccdIssuedBy;

    @Size(max = 20)
    String cccdIssuedDate;

    @Size(max = 60)
    String criminalRecordCode;

    @Size(max = 16)
    String driverLicenseClass;

    @Size(max = 32)
    String driverLicenseMasked;

    @Size(max = 20)
    String driverLicenseExpiryDate;

    Boolean coldChainCertified;

    @Size(max = 40)
    String vehiclePlate;

    @Size(max = 60)
    String vehicleType;

    @Size(max = 40)
    String vehicleRegistrationNo;

    @Size(max = 40)
    String gpsDeviceCode;

    @Size(max = 20)
    String inspectionExpiryDate;

    @Size(max = 20)
    String insuranceExpiryDate;

    @Size(max = 20)
    String healthCheckExpiryDate;

    @Pattern(regexp = "^(AVAILABLE|ON_DELIVERY|OFF_SHIFT)?$", message = "Trạng thái ca phải là AVAILABLE, ON_DELIVERY hoặc OFF_SHIFT")
    String shiftStatus;
}

