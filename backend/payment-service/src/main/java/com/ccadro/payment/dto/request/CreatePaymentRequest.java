package com.ccadro.payment.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePaymentRequest {

    @NotBlank(message = "Mã vận đơn (shipmentCode) không được để trống")
    private String shipmentCode;

    @NotBlank(message = "Mã khách hàng (customerId) không được để trống")
    private String customerId;

    private String customerName;
    private String createdByUsername;
    private String originName;
    private String destinationName;
    private String containerCode;
    private String vehicleType;
    private String powertrainType;

    @NotBlank(message = "Phương thức thanh toán (paymentMethod) không được để trống")
    private String paymentMethod;

    @NotNull(message = "Cước vận tải cơ bản (baseFreightVnd) là bắt buộc")
    @Min(value = 1000, message = "Cước vận tải phải >= 1.000 VND")
    private Long baseFreightVnd;

    private Double co2SavedKg;
    private String payerName;
    private String cardLast4;
    private String notes;

    /**
     * Nếu true (VD: thẻ doanh nghiệp thanh toán tức thì), giao dịch xác nhận PAID ngay khi tạo.
     */
    private Boolean instantConfirm;
}

