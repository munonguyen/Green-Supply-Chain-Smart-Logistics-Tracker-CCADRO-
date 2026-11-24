package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.dto.response.ContainerSafetyInspectionResponse.Summary;
import com.ccadro.asset.service.ContainerSafetyInspectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/assets/container-inspections")
@RequiredArgsConstructor
public class ContainerInspectionOverviewController {
    private final ContainerSafetyInspectionService service;
    @GetMapping
    public ApiResponse<List<Summary>> overview(@RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        return ApiResponse.success(service.overview(scope));
    }
}
