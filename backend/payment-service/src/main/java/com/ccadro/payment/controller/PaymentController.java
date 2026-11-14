package com.ccadro.payment.controller;

import com.ccadro.payment.dto.ApiResponse;
import com.ccadro.payment.dto.request.ConfirmPaymentRequest;
import com.ccadro.payment.dto.request.CreatePaymentRequest;
import com.ccadro.payment.dto.request.PaymentWebhookCallbackRequest;
import com.ccadro.payment.dto.request.RefundPaymentRequest;
import com.ccadro.payment.dto.response.PaymentAuditLogResponse;
import com.ccadro.payment.dto.response.PaymentSummaryResponse;
import com.ccadro.payment.dto.response.PaymentTransactionResponse;
import com.ccadro.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment & Green Billing", description = "Quản lý thanh toán B2B, VietQR, VNPay, thẻ doanh nghiệp & công nợ Xanh Net-30")
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    @Operation(summary = "Danh sách giao dịch thanh toán & hóa đơn B2B (lọc theo customerId / status / shipmentCode)")
    public ApiResponse<List<PaymentTransactionResponse>> getPayments(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String shipmentCode
    ) {
        return ApiResponse.success(paymentService.getPayments(customerId, status, shipmentCode));
    }

    @GetMapping("/summary")
    @Operation(summary = "Thống kê tổng quan thanh toán, công nợ Net-30 và ưu đãi cước xanh ESG")
    public ApiResponse<PaymentSummaryResponse> getSummary(
            @RequestParam(required = false) String customerId
    ) {
        return ApiResponse.success(paymentService.getSummary(customerId));
    }

    @GetMapping("/{transactionCode}")
    @Operation(summary = "Xem chi tiết giao dịch & hóa đơn VAT theo mã giao dịch")
    public ApiResponse<PaymentTransactionResponse> getPaymentDetail(@PathVariable String transactionCode) {
        return ApiResponse.success(paymentService.getByTransactionCode(transactionCode));
    }

    @GetMapping("/{transactionCode}/logs")
    @Operation(summary = "Xem lịch sử đối soát trạng thái giao dịch")
    public ApiResponse<List<PaymentAuditLogResponse>> getPaymentLogs(@PathVariable String transactionCode) {
        return ApiResponse.success(paymentService.getAuditLogs(transactionCode));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Khởi tạo yêu cầu thanh toán & sinh hóa đơn điện tử VAT")
    public ApiResponse<PaymentTransactionResponse> createPayment(
            @Valid @RequestBody CreatePaymentRequest request
    ) {
        return ApiResponse.success(
                "Đã khởi tạo hóa đơn & yêu cầu thanh toán thành công",
                paymentService.createPayment(request)
        );
    }

    @PostMapping("/{transactionCode}/confirm")
    @Operation(summary = "Xác nhận thanh toán thành công (VietQR / VNPay / MoMo / Thẻ)")
    public ApiResponse<PaymentTransactionResponse> confirmPayment(
            @PathVariable String transactionCode,
            @RequestBody(required = false) ConfirmPaymentRequest request
    ) {
        return ApiResponse.success(
                "Xác nhận thanh toán thành công",
                paymentService.confirmPayment(transactionCode, request)
        );
    }

    @PostMapping("/{transactionCode}/refund")
    @Operation(summary = "Hoàn tiền hoặc hủy giao dịch thanh toán")
    public ApiResponse<PaymentTransactionResponse> refundPayment(
            @PathVariable String transactionCode,
            @RequestBody(required = false) RefundPaymentRequest request
    ) {
        return ApiResponse.success(
                "Đã xử lý hoàn tiền giao dịch",
                paymentService.refundPayment(transactionCode, request)
        );
    }

    @PostMapping("/webhook/{provider}")
    @Operation(summary = "Nhận Webhook đối soát tự động từ cổng thanh toán (VietQR / VNPay / MoMo) kèm chữ ký HMAC")
    public ApiResponse<PaymentTransactionResponse> handleWebhook(
            @PathVariable String provider,
            @Valid @RequestBody PaymentWebhookCallbackRequest request
    ) {
        return ApiResponse.success(
                "Webhook đối soát thành công",
                paymentService.processWebhookCallback(provider, request)
        );
    }
}

