package com.ccadro.hubshipper.controller;

import com.ccadro.hubshipper.dto.ApiResponse;
import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.dto.request.*;
import com.ccadro.hubshipper.dto.response.HubShipperWorkspaceResponse;
import com.ccadro.hubshipper.entity.*;
import com.ccadro.hubshipper.mapper.HubWorkspaceMapper;
import com.ccadro.hubshipper.service.HubShipperWorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hub-shipper")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Hub & Last-Mile Shipper Service (SPX Standard)", description = "Real-time PostgreSQL + SSE SPX Driver Operations: Hub Attendance, Load Scan, 3-Call Rule, COD Cash/QR, On-Hold, Return-to-Hub & 3-Gate Shift Checkout")
public class HubShipperController {
    HubWorkspaceMapper workspaceMapper;
    HubShipperWorkspaceService workspaceService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to real-time Hub & Shipper workspace SSE stream")
    public SseEmitter streamWorkspaceEvents(
            @RequestParam(required = false) String hubCode,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return workspaceService.subscribeWorkspaceStream(hubCode, authContext);
    }

    @GetMapping("/workspace")
    @Operation(summary = "Get hub-isolated workspace, shipper policy, live shippers, COD wallet, manifest items, settlements & COD remittances")
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

    @PostMapping("/shippers/{shipperCode}/check-in-shift")
    @Operation(summary = "Check in attendance at Hub station at start of shift (Điểm danh nhận ca tại Bưu cục)")
    public ApiResponse<HubLocalShipper> checkInHubShift(
            @PathVariable String shipperCode,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã điểm danh nhận ca tại Bưu cục thành công",
                workspaceService.checkInHubShift(shipperCode, authContext));
    }

    @PostMapping("/shippers/{shipperCode}/end-shift")
    @Operation(summary = "End shift checkout enforcing SPX 3-Gate validation (0 in-transit, 0 unreturned On-Hold/RTS, 0 COD cash debt)")
    public ApiResponse<HubLocalShipper> endShiftCheckout(
            @PathVariable String shipperCode,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã hoàn tất đối soát 3 điều kiện và Kết ca làm việc tại Bưu cục",
                workspaceService.endShiftCheckout(shipperCode, authContext));
    }

    @PostMapping("/cod-remittances")
    @Operation(summary = "Remit collected COD cash to Hub Cashier or designated company QR account, clearing COD holding balance to 0")
    public ApiResponse<HubShipperCodRemittance> remitCodCash(
            @RequestBody @Valid RemitCodCashRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã nộp sạch 100% tiền mặt COD thu hộ và phát hành biên lai đối soát",
                workspaceService.remitCodCash(request, authContext));
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

    @PostMapping("/batch-pickup")
    @Operation(summary = "Batch barcode pickup scan at Hub station — inspects package condition & persists OUT_FOR_DELIVERY to PostgreSQL")
    public ApiResponse<List<ContainerCargoManifestItem>> batchPickupItems(
            @RequestBody @Valid BatchPickupScanRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã quét nhận tải xuất trạm và đồng bộ trực tiếp vào cơ sở dữ liệu",
                workspaceService.batchPickupItems(request, authContext));
    }

    @PostMapping("/items/{itemCode}/field-action")
    @Operation(summary = "Execute SPX field action (PICKUP_DEPART, LOG_CALL, CHECKIN_ARRIVAL, REPORT_ON_HOLD, REPORT_RETURN_TO_HUB, SCAN_HUB_RETURN, RETRY_NDR)")
    public ApiResponse<ContainerCargoManifestItem> executeItemFieldAction(
            @PathVariable String itemCode,
            @RequestBody @Valid ItemFieldActionRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã lưu thao tác hiện trường trực tiếp vào cơ sở dữ liệu",
                workspaceService.executeItemFieldAction(itemCode, request, authContext));
    }

    @PostMapping("/items/{itemCode}/photo-pod")
    @Operation(summary = "Complete delivery with Photo POD, COD Cash/QR collection, OTP/Signature & Cold-Chain Temp in PostgreSQL")
    public ApiResponse<ContainerCargoManifestItem> submitItemTrackingAndPhotoPod(
            @PathVariable String itemCode,
            @RequestBody @Valid SubmitPhotoPodRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã cập nhật giao hàng thành công, hạch toán COD và lưu Ảnh POD",
                workspaceService.submitItemTrackingAndPhotoPod(itemCode, request, authContext));
    }

    @PostMapping("/shippers/{shipperCode}/telemetry")
    @Operation(summary = "Persist live Shipper GPS coordinates and guarded shift status directly to PostgreSQL")
    public ApiResponse<HubLocalShipper> updateShipperTelemetryAndShift(
            @PathVariable String shipperCode,
            @RequestBody ShipperTelemetryUpdateRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã cập nhật tọa độ GPS & trạng thái ca trực thời gian thực",
                workspaceService.updateShipperTelemetryAndShift(shipperCode, request, authContext));
    }

    @PostMapping("/settlements")
    @Operation(summary = "Settle shift POD documents & persist daily earnings ledger in PostgreSQL")
    public ApiResponse<HubShipperShiftSettlement> settleShiftPod(
            @RequestBody @Valid SettleShiftPodRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã chốt đối soát chứng từ POD & thu nhập cuối ca vào PostgreSQL",
                workspaceService.settleShiftPod(request, authContext));
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

    @PutMapping("/shippers/{shipperCode}/profile")
    @Operation(summary = "Update shipper operational, vehicle & license compliance profile")
    public ApiResponse<HubLocalShipper> updateShipperProfile(
            @PathVariable String shipperCode,
            @RequestBody @Valid UpdateShipperProfileRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã cập nhật hồ sơ xác thực & phương tiện Shipper",
                workspaceService.updateShipperProfile(shipperCode, request, authContext));
    }

    @PostMapping("/shippers/{shipperCode}/verify")
    @Operation(summary = "Approve or flag shipper KYC & compliance dossier (HUB_MANAGER / ADMIN only)")
    public ApiResponse<HubLocalShipper> verifyShipperKyc(
            @PathVariable String shipperCode,
            @RequestBody @Valid VerifyShipperKycRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String authScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String authHubCode,
            @RequestHeader(value = "X-Auth-Shipper-Code", required = false) String authShipperCode) {
        HubAuthContext authContext = workspaceMapper.authContext(authUsername, authScope, authHubCode, authShipperCode);
        return ApiResponse.success(
                "Đã cập nhật trạng thái xác thực hồ sơ Shipper",
                workspaceService.verifyShipperKyc(shipperCode, request, authContext));
    }
}
