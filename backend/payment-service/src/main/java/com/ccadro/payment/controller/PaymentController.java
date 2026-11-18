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
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment & Green Billing", description = "Quản lý thanh toán B2B, VietQR, VNPay, thẻ doanh nghiệp & công nợ Xanh Net-30")
public class PaymentController {

    private final PaymentService paymentService;
    private final com.ccadro.payment.service.PaymentEvidenceService evidenceService;

    @GetMapping("/{transactionCode}/evidence")
    public ApiResponse<Map<String,Object>> evidence(@PathVariable String transactionCode,
            @RequestHeader(value="X-Auth-Username",required=false) String username,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope) {
        return ApiResponse.success(evidenceService.get(transactionCode,username,scope));
    }
    @PostMapping("/{transactionCode}/evidence/retry")
    public ApiResponse<String> retryEvidence(@PathVariable String transactionCode,
            @RequestHeader(value="X-Auth-Username",required=false) String username,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope) {
        evidenceService.retry(transactionCode,username,scope);
        return ApiResponse.success("Đã xếp hàng thử gửi lại");
    }
    private void requireAdmin(String scope) {
        if(scope==null || !java.util.Arrays.asList(scope.split("\\s+")).contains("ROLE_ADMIN"))
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN,"Chỉ ADMIN được đối soát thanh toán thủ công");
    }

    @GetMapping
    @Operation(summary = "Danh sách giao dịch thanh toán & hóa đơn B2B (Elastic search ?q=, Xóa mềm & lọc)")
    public ApiResponse<List<PaymentTransactionResponse>> getPayments(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String shipmentCode,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted
    ) {
        return ApiResponse.success(paymentService.getPayments(customerId, status, shipmentCode, q, includeDeleted));
    }

    @DeleteMapping("/{transactionCode}")
    @Operation(summary = "Xóa mềm giao dịch/hóa đơn B2B")
    public ApiResponse<PaymentTransactionResponse> softDeletePayment(
            @PathVariable String transactionCode,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername
    ) {
        return ApiResponse.success("Đã xóa mềm giao dịch thanh toán", paymentService.softDeletePayment(transactionCode, callerUsername));
    }

    @PostMapping("/{transactionCode}/restore")
    @Operation(summary = "Khôi phục giao dịch thanh toán đã xóa mềm")
    public ApiResponse<PaymentTransactionResponse> restorePayment(@PathVariable String transactionCode) {
        return ApiResponse.success("Đã khôi phục giao dịch thanh toán", paymentService.restorePayment(transactionCode));
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
            @Valid @RequestBody CreatePaymentRequest request,
            @RequestHeader("X-Auth-Username") String username,
            @RequestHeader("X-Auth-Email") String email,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope
    ) {
        if (email.isBlank()) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"Tài khoản cần có email nhận hồ sơ");
        request.setCreatedByUsername(username);
        request.setReceiptEmail(email);
        if(Boolean.TRUE.equals(request.getInstantConfirm())) requireAdmin(scope);
        return ApiResponse.success(
                "Đã khởi tạo hóa đơn & yêu cầu thanh toán thành công",
                paymentService.createPayment(request)
        );
    }

    @PostMapping("/{transactionCode}/confirm")
    @Operation(summary = "Xác nhận thanh toán thành công (VietQR / VNPay / MoMo / Thẻ)")
    public ApiResponse<PaymentTransactionResponse> confirmPayment(
            @PathVariable String transactionCode,
            @RequestBody(required = false) ConfirmPaymentRequest request,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope
    ) {
        requireAdmin(scope);
        return ApiResponse.success(
                "Xác nhận thanh toán thành công",
                paymentService.confirmPayment(transactionCode, request)
        );
    }

    @PostMapping("/{transactionCode}/refund")
    @Operation(summary = "Hoàn tiền hoặc hủy giao dịch thanh toán")
    public ApiResponse<PaymentTransactionResponse> refundPayment(
            @PathVariable String transactionCode,
            @RequestBody(required = false) RefundPaymentRequest request,
            @RequestHeader(value="X-Auth-Scope",required=false) String scope
    ) {
        requireAdmin(scope);
        return ApiResponse.success(
                "Đã xử lý hoàn tiền giao dịch",
                paymentService.refundPayment(transactionCode, request)
        );
    }

    @GetMapping("/gateway/status")
    @Operation(summary = "Kiểm tra trạng thái kết nối cổng thanh toán bên thứ 3 (VNPay/PayOS vs SANDBOX)")
    public ApiResponse<Map<String, Object>> getGatewayStatus() {
        return ApiResponse.success(paymentService.getGatewayStatus());
    }

    @PostMapping("/{transactionCode}/checkout-session")
    @Operation(summary = "Khởi tạo phiên chuyển hướng cổng thanh toán bên thứ 3 (VNPay HMAC-SHA512 / PayOS / Sandbox QR)")
    public ApiResponse<Map<String, Object>> createCheckoutSession(
            @PathVariable String transactionCode,
            @RequestParam(defaultValue = "VNPAY") String provider
    ) {
        return ApiResponse.success(
                "Đã khởi tạo phiên thanh toán",
                paymentService.createCheckoutSession(transactionCode, provider)
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

