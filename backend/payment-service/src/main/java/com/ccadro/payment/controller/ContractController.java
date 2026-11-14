package com.ccadro.payment.controller;

import com.ccadro.payment.dto.ApiResponse;
import com.ccadro.payment.dto.request.CreateContractRequest;
import com.ccadro.payment.dto.request.RecordSlaEventRequest;
import com.ccadro.payment.dto.request.SettleContractRequest;
import com.ccadro.payment.dto.request.SignContractRequest;
import com.ccadro.payment.dto.response.B2bContractResponse;
import com.ccadro.payment.dto.response.ContractSlaEventResponse;
import com.ccadro.payment.service.ContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
@Tag(name = "B2B Contracts & SLA Settlement", description = "Quản lý hợp đồng khung MSA, hợp đồng chuyến điện tử, ký số SHA-256 & đối soát SLA/ePOD")
public class ContractController {

    private final ContractService contractService;

    @GetMapping
    @Operation(summary = "Danh sách hợp đồng B2B (lọc theo customerId / contractType / status / shipmentCode)")
    public ApiResponse<List<B2bContractResponse>> getContracts(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String shipmentCode
    ) {
        return ApiResponse.success(contractService.getContracts(customerId, contractType, status, shipmentCode));
    }

    @GetMapping("/{contractNumber}")
    @Operation(summary = "Xem chi tiết hợp đồng theo mã hợp đồng")
    public ApiResponse<B2bContractResponse> getContract(@PathVariable String contractNumber) {
        return ApiResponse.success(contractService.getContract(contractNumber));
    }

    @GetMapping("/{contractNumber}/events")
    @Operation(summary = "Lịch sử sự kiện SLA, ký số & đối soát ePOD của hợp đồng")
    public ApiResponse<List<ContractSlaEventResponse>> getContractEvents(@PathVariable String contractNumber) {
        return ApiResponse.success(contractService.getContractEvents(contractNumber));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Khởi tạo hợp đồng khung MSA hoặc hợp đồng chuyến điện tử")
    public ApiResponse<B2bContractResponse> createContract(@Valid @RequestBody CreateContractRequest request) {
        return ApiResponse.success("Đã khởi tạo hợp đồng điện tử B2B", contractService.createContract(request));
    }

    @PostMapping("/{contractNumber}/sign")
    @Operation(summary = "Ký số xác nhận hợp đồng bằng SHA-256")
    public ApiResponse<B2bContractResponse> signContract(
            @PathVariable String contractNumber,
            @RequestBody(required = false) SignContractRequest request
    ) {
        return ApiResponse.success("Đã ký số kích hoạt hợp đồng", contractService.signContract(contractNumber, request));
    }

    @PostMapping("/{contractNumber}/sla-events")
    @Operation(summary = "Ghi nhận sự kiện giám sát SLA (đạt chuẩn hoặc vi phạm nhiệt độ/lộ trình) và tự động tính giảm trừ")
    public ApiResponse<B2bContractResponse> recordSlaEvent(
            @PathVariable String contractNumber,
            @Valid @RequestBody RecordSlaEventRequest request
    ) {
        return ApiResponse.success("Đã cập nhật sự kiện SLA vào hợp đồng", contractService.recordSlaEvent(contractNumber, request));
    }

    @PostMapping("/{contractNumber}/settle-epod")
    @Operation(summary = "Nghiệm thu ePOD & chốt đối soát SLA đồng bộ sang hóa đơn thanh toán")
    public ApiResponse<B2bContractResponse> settleContractWithEpod(
            @PathVariable String contractNumber,
            @RequestBody(required = false) SettleContractRequest request
    ) {
        return ApiResponse.success("Đã nghiệm thu ePOD & chốt đối soát hợp đồng", contractService.settleContractWithEpod(contractNumber, request));
    }
}

