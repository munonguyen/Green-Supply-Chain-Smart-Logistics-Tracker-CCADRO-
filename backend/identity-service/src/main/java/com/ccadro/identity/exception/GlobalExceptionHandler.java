package com.ccadro.identity.exception;

import com.ccadro.identity.dto.ApiResponse;
import jakarta.validation.ConstraintViolation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String MIN_ATTRIBUTE = "min";

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(AppException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("AppException [code={}]: {}", errorCode.getCode(), ex.getMessage());

        ApiResponse<Object> response = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(ex.getMessage() != null ? ex.getMessage() : errorCode.getMessage())
                .build();

        return ResponseEntity.status(errorCode.getStatusCode()).body(response);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("ResourceNotFoundException: {}", ex.getMessage());
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.NOT_FOUND.value())
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleBusinessRuleViolation(BusinessRuleViolationException ex) {
        log.warn("BusinessRuleViolationException: {}", ex.getMessage());
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.UNPROCESSABLE_ENTITY.value())
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidation(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getFieldError();
        String enumKey = fieldError != null ? fieldError.getDefaultMessage() : null;

        ErrorCode errorCode = ErrorCode.INVALID_REQUEST_ARGUMENT;
        Map<String, Object> attributes = null;

        if (enumKey != null) {
            try {
                errorCode = ErrorCode.valueOf(enumKey);
                var constraintViolation = ex.getBindingResult().getAllErrors().get(0)
                        .unwrap(ConstraintViolation.class);
                attributes = constraintViolation.getConstraintDescriptor().getAttributes();
            } catch (Exception e) {
                log.debug("Validation message is not an ErrorCode enum name: {}", enumKey);
            }
        }

        String message = (attributes != null && errorCode.getMessage().contains("{" + MIN_ATTRIBUTE + "}"))
                ? errorCode.getMessage().replace("{" + MIN_ATTRIBUTE + "}", String.valueOf(attributes.get(MIN_ATTRIBUTE)))
                : (fieldError != null ? fieldError.getField() + ": " + fieldError.getDefaultMessage() : errorCode.getMessage());

        log.warn("Validation error: {}", message);

        ApiResponse<Object> response = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(message)
                .build();

        return ResponseEntity.status(errorCode.getStatusCode()).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleUnhandledException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        ApiResponse<Object> response = ApiResponse.builder()
                .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                .message(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
