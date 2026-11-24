package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProvisionHubAccountRequest {
    @NotBlank(message = "Username không được để trống")
    @Size(min = 3, max = 50, message = "Username phải từ 3 đến 50 ký tự")
    String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 3, message = "Mật khẩu bảo mật phải từ 3 ký tự trở lên")
    String password;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email;

    @NotBlank(message = "Họ tên không được để trống")
    String fullName;

    String phone;

    @NotBlank(message = "Vai trò chức năng không được để trống (OPERATOR, DRIVER, HUB_MANAGER, HUB_SHIPPER, HUB_AUDITOR)")
    String functionalRole;

    @NotBlank(message = "Mã Trụ sở (assignedHubCode) là bắt buộc để cô lập dữ liệu")
    String assignedHubCode;

    String assignedShipperCode;
    String scopeSummary;
}

