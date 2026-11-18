package com.ccadro.chat.exception;

import java.util.Map;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason() == null ? "Chat request failed" : ex.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> invalid(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Dữ liệu chat không hợp lệ"));
    }
    @ExceptionHandler(OptimisticLockingFailureException.class)
    ResponseEntity<?> conflict(Exception ex) {
        log.warn("Chat membership update conflicted; reload required");
        return ResponseEntity.status(409).body(Map.of("message", "Nhóm vừa thay đổi, vui lòng tải lại"));
    }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> database(Exception ex) {
        log.error("Chat storage operation failed ({})", ex.getClass().getSimpleName());
        return ResponseEntity.status(503).body(Map.of("message", "Kho chat tạm thời không khả dụng; tin nhắn chưa được xác nhận"));
    }
}
