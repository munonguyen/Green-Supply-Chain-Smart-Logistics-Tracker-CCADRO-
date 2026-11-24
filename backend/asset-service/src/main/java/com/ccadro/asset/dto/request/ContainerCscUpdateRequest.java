package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.Pattern;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerCscUpdateRequest {
    String cscApprovalCountry;
    String cscApprovalReference;
    LocalDate cscManufactureDate;

    @Pattern(regexp = "PERIODIC|ACEP", message = "Chương trình kiểm tra phải là PERIODIC hoặc ACEP")
    String cscInspectionScheme;

    String cscAcepProgramNumber;
    LocalDate cscNextExaminationDate;
}
