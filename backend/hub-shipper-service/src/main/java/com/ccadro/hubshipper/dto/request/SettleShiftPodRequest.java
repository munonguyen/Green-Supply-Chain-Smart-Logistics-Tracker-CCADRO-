package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SettleShiftPodRequest {
    @NotBlank(message = "Mã Trụ sở không được để trống")
    String hubCode;

    @NotBlank(message = "Mã Shipper không được để trống")
    String shipperCode;

    String note;
}

