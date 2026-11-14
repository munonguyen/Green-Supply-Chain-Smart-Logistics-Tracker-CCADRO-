package com.ccadro.asset.dto.request;

import com.ccadro.asset.entity.enums.ContainerType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerCreateRequest {
    @NotBlank(message = "Mã container không được để trống")
    String containerCode;

    @NotNull(message = "Loại container không được để trống")
    ContainerType containerType;

    String isoType;
    String ownerName;
    BigDecimal tareWeightTons;
    BigDecimal maxPayloadTons;
    BigDecimal cubicCapacityM3;
    Boolean isReefer;
    String eSealNumber;
    String telematicsModel;
}
