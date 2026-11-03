package com.ccadro.notification.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi hệ thống không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST_ARGUMENT(1002, "Tham số đầu vào không hợp lệ", HttpStatus.BAD_REQUEST),
    NOTIFICATION_NOT_FOUND(7101, "Không tìm thấy thông báo sự cố khẩn cấp", HttpStatus.NOT_FOUND),
    NOTIFICATION_ALREADY_ACKNOWLEDGED(7102, "Thông báo khẩn cấp này đã được xác nhận xử lý trước đó", HttpStatus.CONFLICT);

    private final int code;
    private final String message;
    private final HttpStatus statusCode;

    ErrorCode(int code, String message, HttpStatus statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}

