package com.ccadro.asset.dto.request;

import com.ccadro.asset.entity.enums.ContainerType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

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
    String cscApprovalCountry;
    String cscApprovalReference;
    LocalDate cscManufactureDate;
    @Pattern(regexp = "PERIODIC|ACEP", message = "Chương trình kiểm tra phải là PERIODIC hoặc ACEP")
    String cscInspectionScheme;
    String cscAcepProgramNumber;
    LocalDate cscNextExaminationDate;
    UUID responsibleCompanyId;
    String responsibleCompanyCode;
    String responsibleCompanyName;
    BigDecimal tareWeightTons;
    BigDecimal maxPayloadTons;
    BigDecimal cubicCapacityM3;
    Boolean isReefer;
    String eSealNumber;
    String telematicsModel;
}
