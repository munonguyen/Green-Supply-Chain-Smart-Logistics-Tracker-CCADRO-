package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerEpodRequest {
    @NotBlank(message = "Tên người ký nhận không được để trống")
    String recipientName;

    @NotBlank(message = "Chữ ký điện tử hoặc mã xác thực không được để trống")
    String signature;

    String notes;
}

