package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.service.TransportHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class TransportHistoryController {
    private static final Set<String> READ_ROLES = Set.of("ROLE_ADMIN", "ROLE_DISPATCHER", "ROLE_SAFETY_MANAGER");
    private final TransportHistoryService history;

    @GetMapping("/containers/{code}/transport-history")
    public ApiResponse<TransportHistoryService.History> container(@PathVariable String code,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "") String q,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        authorize(scope);
        return ApiResponse.success(history.container(code, page, q));
    }

    @GetMapping("/drivers/{id}/transport-history")
    public ApiResponse<TransportHistoryService.History> driver(@PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "") String q,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        authorize(scope);
        return ApiResponse.success(history.driver(id, page, q));
    }

    @GetMapping("/staff-drivers/{id}/transport-history")
    public ApiResponse<TransportHistoryService.History> staffDriver(@PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "") String q,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        authorize(scope);
        return ApiResponse.success(history.staffDriver(id, page, q));
    }

    private void authorize(String scope) {
        if (scope == null || Arrays.stream(scope.split("\\s+")).noneMatch(READ_ROLES::contains)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
