package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.dto.request.ContainerSafetyInspectionRequest;
import com.ccadro.asset.dto.response.ContainerSafetyInspectionResponse;
import com.ccadro.asset.service.ContainerSafetyInspectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assets/containers/{containerCode}/safety-inspections")
@RequiredArgsConstructor
public class ContainerSafetyInspectionController {
    private final ContainerSafetyInspectionService service;

    @GetMapping
    public ApiResponse<ContainerSafetyInspectionResponse> get(@PathVariable String containerCode,
        @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        return ApiResponse.success(service.get(containerCode, scope));
    }

    @PostMapping
    public ApiResponse<ContainerSafetyInspectionResponse> submit(@PathVariable String containerCode,
        @RequestBody @Valid ContainerSafetyInspectionRequest request,
        @RequestHeader(value = "X-Auth-Username", required = false) String username,
        @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        return ApiResponse.success("Đã lưu biên bản kiểm tra container", service.submit(containerCode, request, username, scope));
    }
}
