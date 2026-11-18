package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AssignTaskRangeRequest {
    @NotBlank(message = "Mã Trụ sở không được để trống")
    String hubCode;

    @NotBlank(message = "Mã Shipper không được để trống")
    String shipperCode;

    @NotBlank(message = "Mã kiện bắt đầu (Từ mã số) không được để trống")
    String fromItemCode;

    @NotBlank(message = "Mã kiện kết thúc (Tới mã số) không được để trống")
    String toItemCode;

    String assignedBy;
}

