package com.ccadro.shipment.controller;

import com.ccadro.shipment.dto.ApiResponse;
import com.ccadro.shipment.dto.request.DispatchOrderRequest;
import com.ccadro.shipment.dto.request.ShipmentCreationRequest;
import com.ccadro.shipment.dto.response.DispatchOrderResponse;
import com.ccadro.shipment.dto.response.ShipmentResponse;
import com.ccadro.shipment.exception.AppException;
import com.ccadro.shipment.exception.ErrorCode;
import com.ccadro.shipment.service.ShipmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shipments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Shipment & Dispatch Management", description = "UC04, UC06 - Freight shipments, PostGIS spatial coordinates, and dispatch orders (BRULE-01, BRULE-03, BRULE-16)")
public class ShipmentController {

    ShipmentService shipmentService;

    @GetMapping
    @Operation(summary = "List all shipments with Elastic search (?q=) and soft-delete filter (UC04)")
    public ApiResponse<List<ShipmentResponse>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ApiResponse.success(shipmentService.getAllShipmentResponses(q, includeDeleted, page, size));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "List shipments for a specific customer with Elastic search (BRULE-16 Customer Isolation)")
    public ApiResponse<List<ShipmentResponse>> getByCustomer(
            @PathVariable String customerId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ApiResponse.success(shipmentService.getShipmentsByCustomerId(customerId, q, includeDeleted, page, size));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete shipment")
    public ApiResponse<ShipmentResponse> softDelete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername) {
        return ApiResponse.success("Đã xóa mềm đơn vận tải", shipmentService.softDeleteShipment(id, callerUsername));
    }

    @PostMapping("/{id}/restore")
    @Operation(summary = "Restore soft-deleted shipment")
    public ApiResponse<ShipmentResponse> restore(@PathVariable UUID id) {
        return ApiResponse.success("Đã khôi phục đơn vận tải", shipmentService.restoreShipment(id));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get shipment by ID")
    public ApiResponse<ShipmentResponse> getById(@PathVariable UUID id) {
        return ApiResponse.success(shipmentService.getShipmentResponseById(id));
    }

    @PostMapping
    @Operation(summary = "Create a new shipment with PostGIS spatial points (UC04, BRULE-02)")
    public ApiResponse<ShipmentResponse> create(
            @Valid @RequestBody ShipmentCreationRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope,
            @RequestHeader(value = "X-Auth-Customer-Id", required = false) String authenticatedCustomerId) {
        if (callerScope != null && java.util.Arrays.asList(callerScope.split("\\s+")).contains("ROLE_CUSTOMER")) {
            if (authenticatedCustomerId == null || authenticatedCustomerId.isBlank()) {
                throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Tài khoản khách hàng chưa được gắn mã doanh nghiệp.");
            }
            request.setCustomerId(authenticatedCustomerId);
        }
        return ApiResponse.success("Tạo đơn vận tải thành công", shipmentService.createShipmentResponse(request));
    }

    @PostMapping("/dispatch")
    @Operation(summary = "Create dispatch order with weight and safety eligibility checks (UC06, BRULE-01, BRULE-03)")
    public ApiResponse<DispatchOrderResponse> createDispatchOrder(@Valid @RequestBody DispatchOrderRequest request) {
        return ApiResponse.success("Phát hành lệnh điều phối xuất bến thành công",
                shipmentService.createDispatchOrder(request));
    }

    @GetMapping("/{shipmentId}/dispatch")
    @Operation(summary = "Get dispatch order by shipment ID (UC06)")
    public ApiResponse<DispatchOrderResponse> getDispatchOrder(@PathVariable UUID shipmentId) {
        return ApiResponse.success(shipmentService.getDispatchOrderByShipmentId(shipmentId));
    }
}
