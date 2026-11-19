package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerManifestItemCreateRequest {
    @NotBlank String itemCode;
    @NotBlank String shipmentCode;
    @NotBlank String hubCode;
    @NotBlank String cargoName;
    @NotBlank String cargoCategory;
    @NotBlank String consigneeName;
    @NotBlank String consigneePhone;
    @NotBlank String deliveryAddress;
    @NotBlank String deliveryZoneName;
    @NotNull Double deliveryLat;
    @NotNull Double deliveryLng;
    @NotNull @Positive Double weightKg;
    @NotNull @Positive Integer parcelCount;
    Double requiredTempC;
    @NotNull Boolean requiresColdChain;
    @NotBlank String slaWindow;
}
