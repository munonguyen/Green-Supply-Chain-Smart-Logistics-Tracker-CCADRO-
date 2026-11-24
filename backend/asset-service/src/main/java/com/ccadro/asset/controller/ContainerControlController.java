package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.dto.request.ContainerControlRoundRequest;
import com.ccadro.asset.dto.request.ContainerControlStageRequest;
import com.ccadro.asset.dto.response.ContainerControlResponse;
import com.ccadro.asset.service.ContainerControlService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assets/containers/{containerCode}/control")
@RequiredArgsConstructor
public class ContainerControlController {
    private final ContainerControlService service;

    @GetMapping
    public ApiResponse<ContainerControlResponse> get(@PathVariable String containerCode,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        return ApiResponse.success(service.get(containerCode, scope));
    }

    @PostMapping("/rounds")
    public ApiResponse<ContainerControlResponse> start(@PathVariable String containerCode,
            @RequestBody @Valid ContainerControlRoundRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String username,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        return ApiResponse.success("Đã mở đợt kiểm soát", service.start(containerCode, request, username, scope));
    }

    @PostMapping("/stages/{stage}")
    public ApiResponse<ContainerControlResponse> complete(@PathVariable String containerCode,
            @PathVariable String stage, @RequestBody @Valid ContainerControlStageRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String username,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        return ApiResponse.success("Đã lưu xác nhận giai đoạn", service.complete(containerCode, stage, request, username, scope));
    }
}
