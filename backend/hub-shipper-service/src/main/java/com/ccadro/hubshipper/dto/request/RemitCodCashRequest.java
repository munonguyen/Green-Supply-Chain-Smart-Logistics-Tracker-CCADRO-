package com.ccadro.hubshipper.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RemitCodCashRequest {
    @NotBlank(message = "Mã Trụ sở không được để trống")
    String hubCode;

    @NotBlank(message = "Mã Shipper không được để trống")
    String shipperCode;

    /**
     * HUB_CASHIER (Nộp tiền mặt trực tiếp cho Thủ quỹ Bưu cục)
     * or BANK_QR_TRANSFER (Chuyển khoản QR định danh về tài khoản công ty)
     */
    String paymentChannel;

    String note;
}

