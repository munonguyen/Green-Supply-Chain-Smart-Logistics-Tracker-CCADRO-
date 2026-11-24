package com.ccadro.chat.exception;

import lombok.Getter;

import org.springframework.http.HttpStatus;

/** Status and default message used by service/client boundaries. */
@Getter
public enum ErrorCode {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "Dữ liệu chat không hợp lệ"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Đăng nhập để sử dụng chat"),
    INVALID_SESSION(HttpStatus.UNAUTHORIZED, "Phiên chat không hợp lệ"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Chỉ chủ nhóm được mời thành viên"),
    CONVERSATION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy cuộc trò chuyện"),
    MESSAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tin nhắn"),
    IDEMPOTENCY_CONFLICT(HttpStatus.CONFLICT, "Mã chống gửi lặp đã dùng cho tin khác"),
    IDENTITY_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Không thể xác thực phiên chat"),
    DIRECTORY_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Danh bạ chat không khả dụng");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
