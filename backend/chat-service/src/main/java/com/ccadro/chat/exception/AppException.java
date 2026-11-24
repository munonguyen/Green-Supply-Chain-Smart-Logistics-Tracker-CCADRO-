package com.ccadro.chat.exception;

import lombok.Getter;

import org.springframework.web.server.ResponseStatusException;

@Getter
public class AppException extends ResponseStatusException {
    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode) { this(errorCode, errorCode.getMessage()); }

    public AppException(ErrorCode errorCode, String message) {
        super(errorCode.getStatus(), message);
        this.errorCode = errorCode;
    }

    public static AppException invalidRequest(String message) {
        return new AppException(ErrorCode.INVALID_REQUEST, message);
    }
}
