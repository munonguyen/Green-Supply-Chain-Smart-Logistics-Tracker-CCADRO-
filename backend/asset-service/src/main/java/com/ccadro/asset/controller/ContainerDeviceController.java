package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.service.ContainerDeviceService;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class ContainerDeviceController {
    private final ContainerDeviceService devices;

    @GetMapping("/api/v1/assets/containers/{code}/device-connection")
    public ApiResponse<ContainerDeviceService.State> get(@PathVariable String code,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope) {
        authorize(scope);
        return ApiResponse.success(devices.state(code));
    }
    @PutMapping("/api/v1/assets/containers/{code}/device-connection")
    public ApiResponse<ContainerDeviceService.Configured> configure(@PathVariable String code,
            @Valid @RequestBody ContainerDeviceService.Configure request,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope,
            @RequestHeader(value="X-Auth-Username",required=false) String actor) {
        authorize(scope);
        if(actor==null || actor.isBlank()) throw new AppException(ErrorCode.UNAUTHENTICATED);
        return ApiResponse.success("Đã cấu hình cổng nhận GPS. Thiết bị cần gửi gói tin để xác nhận kết nối.",
            devices.configure(code,request,actor));
    }
    @PostMapping("/api/v1/assets/containers/{code}/device-connection/link-trip")
    public ApiResponse<ContainerDeviceService.State> link(@PathVariable String code,
            @Valid @RequestBody ContainerDeviceService.LinkTrip request,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope,
            @RequestHeader(value="X-Auth-Username",required=false) String actor) {
        authorize(scope);
        if(actor==null || actor.isBlank()) throw new AppException(ErrorCode.UNAUTHENTICATED);
        return ApiResponse.success("Đã đối soát liên kết container với chuyến và tuyến",
            devices.linkTrip(code,request,actor));
    }
    @DeleteMapping("/api/v1/assets/containers/{code}/device-connection")
    public ApiResponse<ContainerDeviceService.State> disable(@PathVariable String code,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope,
            @RequestHeader(value="X-Auth-Username",required=false) String actor) {
        authorize(scope);
        if(actor==null || actor.isBlank()) throw new AppException(ErrorCode.UNAUTHENTICATED);
        return ApiResponse.success("Đã thu hồi khóa thiết bị",devices.disable(code,actor));
    }
    @PostMapping("/api/v1/assets/device-ingest/{deviceId}")
    public ApiResponse<ContainerDeviceService.Receipt> ingest(@PathVariable String deviceId,
            @RequestHeader(value="X-Device-Key",required=false) String key,
            @Valid @RequestBody ContainerDeviceService.Packet packet) {
        return ApiResponse.success(devices.receive(deviceId,key,packet));
    }
    private void authorize(String scope) {
        var roles=scope==null?List.of():Arrays.asList(scope.trim().split("\\s+"));
        if(Collections.disjoint(roles,List.of("ROLE_ADMIN","ROLE_DISPATCHER","ROLE_SAFETY_MANAGER"))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
