package com.ccadro.notification.exception;

import com.ccadro.notification.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        return ResponseEntity.status(errorCode.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(ex.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getFieldError() != null
                ? ex.getFieldError().getDefaultMessage()
                : ErrorCode.INVALID_REQUEST_ARGUMENT.getMessage();
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.INVALID_REQUEST_ARGUMENT.getCode())
                        .message(message)
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        return ResponseEntity.internalServerError()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                        .message(ex.getMessage())
                        .build());
    }
}

