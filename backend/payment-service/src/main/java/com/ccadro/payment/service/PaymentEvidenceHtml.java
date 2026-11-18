package com.ccadro.payment.service;

import com.ccadro.payment.configuration.EvidenceProperties;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.PaymentTransaction;
import org.springframework.web.util.HtmlUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.UUID;

/** A printable record of existing facts; never an implicit contract acceptance. */
final class PaymentEvidenceHtml {
    private PaymentEvidenceHtml() {}

    static String render(UUID id, PaymentTransaction tx, B2bContract contract,
                         EvidenceProperties issuer, String snapshot, String hash, String notice) {
        String contractRows = contract == null
                ? row("Hợp đồng liên kết", "Chưa có hợp đồng liên kết tại thời điểm thanh toán")
                : row("Số hợp đồng / trạng thái", contract.getContractNumber() + " / " + contract.getContractStatus())
                + row("Hợp đồng khung", contract.getParentContractNumber())
                + row("Đơn vị cung cấp trong hợp đồng", contract.getProviderName())
                + row("Người xác nhận hợp đồng", contract.getSignedByCustomerUser())
                + row("Thời điểm xác nhận", time(contract.getSignedAt()))
                + row("Mã đối chiếu hợp đồng (không phải chứng thư số)", contract.getCustomerSignatureHash())
                + row("Điều khoản thanh toán", contract.getPaymentTerms())
                + row("Phạm vi vận chuyển", contract.getCorridorScope())
                + row("Hiệu lực từ / đến", time(contract.getEffectiveFrom()) + " / " + time(contract.getEffectiveTo()))
                + row("SLA giao đúng hạn", contract.getSlaOnTimeRatePct() + "%")
                + row("SLA sai lệch nhiệt độ tối đa", contract.getSlaMaxTempDeviationC() + " °C")
                + row("Tỷ lệ giảm trừ mỗi vi phạm", contract.getSlaPenaltyPctPerBreach() + "%")
                + row("Giảm trừ SLA đã ghi nhận", money(contract.getSlaPenaltyDeductionVnd()))
                + row("Thời điểm đối soát ePOD đã ghi nhận", time(contract.getSettledAt()))
                + row("Ghi chú hợp đồng", contract.getNotes());
        return "<!doctype html><html lang=\"vi\"><head><meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                + "<title>Hồ sơ " + safe(tx.getTransactionCode()) + "</title>"
                + "<style>body{font:15px Arial,sans-serif;color:#16332b;max-width:850px;margin:35px auto;padding:20px;line-height:1.6}"
                + "h1{font-size:24px}h2{font-size:18px;border-bottom:2px solid #26735e;padding-bottom:6px}"
                + "table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #dde5e1;overflow-wrap:anywhere}"
                + "th{width:38%;background:#f4f8f5}.note{padding:16px;background:#f4f8f5}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}"
                + "@media print{body{margin:0;max-width:none}tr{break-inside:avoid}}</style></head><body>"
                + "<p>CCADRO · HỒ SƠ GIAO DỊCH ĐIỆN TỬ · Phiên bản 1</p>"
                + "<h1>XÁC NHẬN THANH TOÁN &amp; BẢN CHỤP HỢP ĐỒNG</h1>"
                + "<p>Mã hồ sơ: " + id + "<br>Thời điểm ghi nhận: " + safe(time(tx.getPaidAt())) + " (UTC+07:00)</p>"
                + "<h2>1. Các bên và đầu mối đối soát</h2><table>"
                + row("Tên pháp nhân phát hành", issuer.getLegalName()) + row("Mã số thuế", issuer.getTaxCode())
                + row("Địa chỉ", issuer.getAddress()) + row("Liên hệ hỗ trợ / khiếu nại", issuer.getSupportEmail())
                + row("Thời hạn phản hồi theo cấu hình doanh nghiệp", issuer.getResponseTime())
                + row("Khách hàng / mã khách hàng", tx.getCustomerName() + " / " + tx.getCustomerId())
                + row("Tài khoản tạo giao dịch", tx.getCreatedByUsername()) + row("Email nhận hồ sơ", tx.getReceiptEmail())
                + "</table><h2>2. Thông tin và nguồn xác nhận thanh toán</h2><table>"
                + row("Mã giao dịch", tx.getTransactionCode()) + row("Tham chiếu bảng kê", tx.getInvoiceNumber())
                + row("Vận đơn / Container", tx.getShipmentCode() + " / " + tx.getContainerCode())
                + row("Trạng thái ghi nhận", tx.getPaymentStatus()) + row("Nguồn xác nhận", tx.getConfirmationSource())
                + row("Phương thức / nhà cung cấp", tx.getPaymentMethod() + " / " + tx.getGatewayProvider())
                + row("Mã tham chiếu đối soát", tx.getGatewayReference()) + row("Người thanh toán", tx.getPayerName())
                + row("Cước cơ bản", money(tx.getBaseFreightVnd())) + row("Chiết khấu", money(tx.getGreenEsgDiscountVnd()))
                + row("Thuế đã ghi nhận trong bảng kê", money(tx.getVatAmountVnd()))
                + row("Tổng số tiền đã xác nhận", money(tx.getTotalAmountVnd()))
                + "</table><h2>3. Hợp đồng và đối soát đã ghi nhận</h2><table>" + contractRows
                + "</table><h2>4. Lưu giữ và yêu cầu đối soát</h2><p class=\"note\">" + safe(notice)
                + "</p><p>Khi cần đối soát, cung cấp mã hồ sơ, mã giao dịch, hợp đồng và tài liệu liên quan cho đầu mối hỗ trợ nêu trên. "
                + "Trạng thái hợp đồng, SLA và nghiệm thu trong hồ sơ phản ánh thời điểm thanh toán; các thay đổi tiếp theo được đối chiếu bằng bản ghi riêng.</p>"
                + "<p>SHA-256 của evidence.json: <code>" + hash + "</code></p>"
                + "<h2>Phụ lục: dữ liệu lưu trữ tại thời điểm thanh toán</h2><pre>" + safe(snapshot) + "</pre></body></html>";
    }

    private static String row(String label, Object value) {
        return "<tr><th>" + safe(label) + "</th><td>" + safe(value) + "</td></tr>";
    }
    private static String safe(Object value) {
        return HtmlUtils.htmlEscape(value == null || value.toString().isBlank() ? "Chưa ghi nhận" : value.toString());
    }
    private static String money(Long value) {
        return value == null ? "Chưa ghi nhận" : NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(value) + " VND";
    }
    private static String time(Instant value) {
        return value == null ? "Chưa ghi nhận" : DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm:ss")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(value);
    }
}
