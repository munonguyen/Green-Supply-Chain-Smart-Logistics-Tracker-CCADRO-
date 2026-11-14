package com.ccadro.payment.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    SUCCESS(1000, "Thao tác thành công", HttpStatus.OK),
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi hệ thống thanh toán chưa được phân loại", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST_ARGUMENT(1004, "Dữ liệu thanh toán không hợp lệ", HttpStatus.BAD_REQUEST),
    PAYMENT_NOT_FOUND(7101, "Không tìm thấy giao dịch hoặc hóa đơn thanh toán", HttpStatus.NOT_FOUND),
    PAYMENT_ALREADY_PAID(7102, "Hóa đơn này đã được thanh toán hoàn tất trước đó", HttpStatus.CONFLICT),
    PAYMENT_INVALID_STATE(7103, "Trạng thái giao dịch hiện tại không cho phép thực hiện thao tác này", HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_PAYMENT_METHOD(7104, "Phương thức thanh toán không được hỗ trợ", HttpStatus.BAD_REQUEST),
    WEBHOOK_SIGNATURE_INVALID(7105, "Chữ ký xác thực Webhook cổng thanh toán không hợp lệ", HttpStatus.UNAUTHORIZED),
    CREDIT_LIMIT_EXCEEDED(7106, "Vượt hạn mức công nợ Xanh Net-30 của Hợp đồng khung", HttpStatus.UNPROCESSABLE_ENTITY),
    CONTRACT_NOT_FOUND(7201, "Không tìm thấy hợp đồng điện tử B2B", HttpStatus.NOT_FOUND),
    CONTRACT_INVALID_STATE(7202, "Trạng thái hợp đồng hiện tại không cho phép thực hiện thao tác này", HttpStatus.UNPROCESSABLE_ENTITY);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}

