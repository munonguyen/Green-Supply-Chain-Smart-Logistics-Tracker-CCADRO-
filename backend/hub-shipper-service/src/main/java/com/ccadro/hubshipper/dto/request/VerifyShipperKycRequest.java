package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.NotBlank;
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
public class VerifyShipperKycRequest {

    @NotBlank(message = "Trạng thái xác thực không được để trống")
    @Pattern(regexp = "VERIFIED|PENDING_REVIEW|REJECTED", message = "Trạng thái xác thực phải là VERIFIED, PENDING_REVIEW hoặc REJECTED")
    String kycStatus;

    @Size(max = 500)
    String kycNote;
}

