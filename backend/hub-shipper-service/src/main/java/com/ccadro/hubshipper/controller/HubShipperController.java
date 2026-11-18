package com.ccadro.hubshipper.controller;

import com.ccadro.hubshipper.dto.ApiResponse;
import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.dto.request.AssignTaskRangeRequest;
import com.ccadro.hubshipper.dto.request.SubmitPhotoPodRequest;
import com.ccadro.hubshipper.dto.response.HubShipperWorkspaceResponse;
import com.ccadro.hubshipper.entity.ContainerCargoManifestItem;
import com.ccadro.hubshipper.entity.HubTaskRangeAssignment;
import com.ccadro.hubshipper.service.HubShipperWorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hub-shipper")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Hub & Last-Mile Shipper Service", description = "Hub-bound Shipper Isolation, Policy Engine, Code-Range Tasking, Item Tracking & Photo POD")
public class HubShipperController {
    private final com.ccadro.hubshipper.mapper.HubWorkspaceMapper workspaceMapper;

    HubShipperWorkspaceService workspaceService;

    @GetMapping("/workspace")
    @Operation(summary = "Get hub-isolated workspace, shipper policy, today's delivery zone, code ranges and manifest items (Elastic search ?q= & Xóa mềm)")
    public ApiResponse<HubShipperWorkspaceResponse> getIsolatedWorkspace(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String hubCode,
            @RequestParam(required = false) String shipperCode,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                workspaceService.getIsolatedWorkspace(username, hubCode, shipperCode, q, includeDeleted, authContext));
    }

    @PostMapping("/assign-range")
    @Operation(summary = "Assign a batch of cargo items by code range (fromItemCode -> toItemCode) to a local shipper in the same hub")
    public ApiResponse<HubTaskRangeAssignment> assignTaskByCodeRange(
            @RequestBody @Valid AssignTaskRangeRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã giao nhiệm vụ theo dải mã số thành công cho Shipper",
                workspaceService.assignTaskByCodeRange(request, authContext));
    }

    @PostMapping("/items/{itemCode}/photo-pod")
    @Operation(summary = "Update item delivery tracking status and attach photo proof of delivery (Photo POD)")
    public ApiResponse<ContainerCargoManifestItem> submitItemTrackingAndPhotoPod(
            @PathVariable String itemCode,
            @RequestBody @Valid SubmitPhotoPodRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã cập nhật trạng thái giao hàng và lưu hình ảnh xác thực (Photo POD)",
                workspaceService.submitItemTrackingAndPhotoPod(itemCode, request, authContext));
    }

    @DeleteMapping("/items/{itemCode}")
    @Operation(summary = "Soft delete cargo manifest item within caller's hub")
    public ApiResponse<ContainerCargoManifestItem> softDeleteManifestItem(
            @PathVariable String itemCode,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã xóa mềm kiện hàng khỏi danh sách giao nhận",
                workspaceService.softDeleteManifestItem(itemCode, authContext));
    }

    @PostMapping("/items/{itemCode}/restore")
    @Operation(summary = "Restore soft-deleted cargo manifest item within caller's hub")
    public ApiResponse<ContainerCargoManifestItem> restoreManifestItem(
            @PathVariable String itemCode,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã khôi phục kiện hàng về danh sách hoạt động",
                workspaceService.restoreManifestItem(itemCode, authContext));
    }
}
