package com.ccadro.payment.service;

import com.ccadro.payment.configuration.EvidenceProperties;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.ContractSlaEvent;
import com.ccadro.payment.entity.PaymentTransaction;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.web.util.HtmlUtils;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Trình kết xuất Hồ sơ Pháp lý Hợp đồng Vận tải & Biên nhận Thanh toán chuẩn PDF/A-like (XHTML -> PDF).
 * Tuân thủ Bộ luật Dân sự 2015, Luật Thương mại 2005 và Luật Giao dịch Điện tử 2023.
 */
final class LegalContractDocumentRenderer {

    private static final String[] REGULAR_FONT_PATHS = {
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    };

    private static final String[] BOLD_FONT_PATHS = {
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    };

    private LegalContractDocumentRenderer() {}

    record BuyerLegalProfile(
            String legalName,
            String taxCode,
            String businessLicense,
            String representativeName,
            String representativeTitle,
            String address,
            String kycStatus,
            String email
    ) {
        static BuyerLegalProfile fallback(PaymentTransaction tx, B2bContract contract) {
            String name = contract != null && notBlank(contract.getCustomerName())
                    ? contract.getCustomerName()
                    : (notBlank(tx.getCustomerName()) ? tx.getCustomerName() : tx.getCustomerId());
            String rep = contract != null && notBlank(contract.getSignedByCustomerUser())
                    ? contract.getSignedByCustomerUser()
                    : (notBlank(tx.getPayerName()) ? tx.getPayerName() : tx.getCreatedByUsername());
            return new BuyerLegalProfile(
                    name != null ? name : "Khách hàng Doanh nghiệp B2B",
                    "Chưa cập nhật MST",
                    "Theo hồ sơ đăng ký DN",
                    rep != null ? rep : "Đại diện hợp pháp Bên B",
                    "Đại diện được ủy quyền",
                    "Theo địa chỉ giao nhận hợp đồng",
                    "PENDING",
                    tx.getReceiptEmail()
            );
        }
    }

    static String renderFullLegalContractHtml(
            UUID evidenceId,
            PaymentTransaction tx,
            B2bContract contract,
            List<ContractSlaEvent> slaEvents,
            EvidenceProperties seller,
            BuyerLegalProfile buyer,
            String snapshotSha256
    ) {
        String contractNo = contract != null && notBlank(contract.getContractNumber())
                ? contract.getContractNumber()
                : "HD-SPOT-" + safeText(tx.getTransactionCode(), "CCADRO");
        String parentNo = contract != null && notBlank(contract.getParentContractNumber())
                ? contract.getParentContractNumber()
                : "Không áp dụng (Hợp đồng chuyến độc lập)";
        String signedAtStr = contract != null ? time(contract.getSignedAt()) : time(tx.getPaidAt());
        String effectiveFrom = contract != null ? time(contract.getEffectiveFrom()) : time(tx.getCreatedAt());
        String effectiveTo = contract != null ? time(contract.getEffectiveTo()) : "Hoàn tất bàn giao ePOD";
        String slaOnTime = contract != null && contract.getSlaOnTimeRatePct() != null
                ? contract.getSlaOnTimeRatePct() + "%"
                : "98.5%";
        String slaTempDev = contract != null && contract.getSlaMaxTempDeviationC() != null
                ? "±" + contract.getSlaMaxTempDeviationC() + " °C"
                : "±2.0 °C";
        String slaPenaltyPct = contract != null && contract.getSlaPenaltyPctPerBreach() != null
                ? contract.getSlaPenaltyPctPerBreach() + "%"
                : "5.0%";
        String penaltyVnd = contract != null ? money(contract.getSlaPenaltyDeductionVnd()) : "0 VND";
        String contractSigHash = contract != null && notBlank(contract.getCustomerSignatureHash())
                ? contract.getCustomerSignatureHash()
                : snapshotSha256;

        StringBuilder slaRows = new StringBuilder();
        if (slaEvents != null && !slaEvents.isEmpty()) {
            for (ContractSlaEvent ev : slaEvents) {
                slaRows.append("<tr>")
                        .append("<td>").append(safe(ev.getEventType())).append("</td>")
                        .append("<td>").append(safe(ev.getDescription())).append("</td>")
                        .append("<td>").append(money(ev.getPenaltyAmountVnd())).append("</td>")
                        .append("<td>").append(safe(time(ev.getCreatedAt()))).append("</td>")
                        .append("</tr>");
            }
        } else {
            slaRows.append("<tr><td colspan=\"4\">Không ghi nhận vi phạm SLA tính đến thời điểm xuất hợp đồng.</td></tr>");
        }

        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" "
                + "\"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\n"
                + "<html xmlns=\"http://www.w3.org/1999/xhtml\" lang=\"vi\"><head>"
                + "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />"
                + "<title>Hợp Đồng Vận Tải " + safe(contractNo) + "</title>"
                + "<style type=\"text/css\">"
                + "@page { size: A4; margin: 16mm 15mm; }"
                + "body { font-family: 'CCADROSans', Arial, sans-serif; font-size: 11pt; color: #162923; line-height: 1.5; }"
                + ".center { text-align: center; } .upper { text-transform: uppercase; }"
                + "h1 { font-size: 15pt; margin: 6px 0 2px; color: #0b4f3a; }"
                + "h2 { font-size: 11.5pt; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #0b4f3a; color: #0b4f3a; }"
                + "p { margin: 4px 0; }"
                + "table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 10pt; }"
                + "th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }"
                + "th { background-color: #f1f7f4; width: 34%; font-weight: bold; }"
                + ".notice { background: #f4f8f5; border-left: 3px solid #059669; padding: 8px 10px; font-size: 9.5pt; margin-top: 8px; }"
                + ".sig-grid { width: 100%; margin-top: 14px; border: none; }"
                + ".sig-grid td { width: 50%; border: 1px dashed #94a3b8; padding: 10px; text-align: center; }"
                + "code { font-size: 8.5pt; color: #0f172a; }"
                + "</style></head><body>"
                + "<p class=\"center upper\" style=\"font-weight:bold; font-size:10.5pt;\">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>"
                + "<p class=\"center\" style=\"font-weight:bold; font-size:10pt;\">Độc lập - Tự do - Hạnh phúc</p>"
                + "<p class=\"center\">---oOo---</p>"
                + "<h1 class=\"center upper\">HỢP ĐỒNG DỊCH VỤ VẬN TẢI XANH ĐA PHƯƠNG THỨC</h1>"
                + "<p class=\"center\">Số: <strong>" + safe(contractNo) + "</strong> | Hợp đồng khung (MSA): " + safe(parentNo) + "</p>"
                + "<p class=\"center\" style=\"font-size:9.5pt;\">Hồ sơ giao dịch ID: " + safe(evidenceId) + " • Ngày lập: " + safe(time(tx.getPaidAt())) + " (UTC+07:00)</p>"
                + "<p style=\"font-size:9.5pt;\"><em>Căn cứ Bộ luật Dân sự số 91/2015/QH13, Luật Thương mại số 36/2005/QH11 và Luật Giao dịch Điện tử số 20/2023/QH15.</em></p>"
                + "<h2>ĐIỀU 1. CÁC BÊN THAM GIA HỢP ĐỒNG</h2>"
                + "<table>"
                + row("BÊN A (Đơn vị Vận chuyển)", seller.getLegalName())
                + row("Mã số thuế / Số ĐKKD Bên A", seller.getTaxCode() + " / " + seller.getBusinessLicense())
                + row("Địa chỉ trụ sở Bên A", seller.getAddress())
                + row("Người đại diện theo PL Bên A", seller.getRepresentativeName() + " (" + seller.getRepresentativeTitle() + ")")
                + row("Đầu mối pháp lý & Đối soát", seller.getSupportEmail() + " (Phản hồi: " + seller.getResponseTime() + ")")
                + row("BÊN B (Khách hàng / Chủ hàng B2B)", buyer.legalName())
                + row("Mã KH / Mã số thuế / ĐKKD Bên B", safeText(tx.getCustomerId(), "--") + " / " + buyer.taxCode() + " / " + buyer.businessLicense())
                + row("Địa chỉ trụ sở Bên B", buyer.address())
                + row("Người đại diện / Thẩm định KYC", buyer.representativeName() + " (" + buyer.representativeTitle() + ") • KYC: " + buyer.kycStatus())
                + row("Email nhận chứng từ điện tử", safeText(tx.getReceiptEmail(), buyer.email()))
                + "</table>"
                + "<h2>ĐIỀU 2. ĐỐI TƯỢNG, LỘ TRÌNH VÀ THIẾT BỊ VẬN CHUYỂN</h2>"
                + "<table>"
                + row("Mã vận đơn / Mã giao dịch", safeText(tx.getShipmentCode(), "--") + " / " + safeText(tx.getTransactionCode(), "--"))
                + row("Phạm vi hành lang tuyến", contract != null ? contract.getCorridorScope() : "Theo hành lang vận đơn đã duyệt")
                + row("Mã Container / e-Seal Hải quan", safeText(tx.getContainerCode(), "--") + " / " + safeText(contract != null ? contract.getESealNumber() : null, "Khóa điện tử GPS"))
                + row("Phương tiện / Biển số", safeText(contract != null ? contract.getVehicleType() : null, "Đội xe đạt chuẩn EV/Euro 5") + " / " + safeText(contract != null ? contract.getLicensePlate() : null, "Theo lệnh điều phối"))
                + row("Thời hạn hiệu lực", effectiveFrom + " đến " + effectiveTo)
                + "</table>"
                + "<h2>ĐIỀU 3. GIÁ CƯỚC, CHIẾT KHẤU XANH ESG, THUẾ GTGT &amp; THANH TOÁN</h2>"
                + "<table>"
                + row("Cước vận tải cơ bản", money(tx.getBaseFreightVnd()))
                + row("Chiết khấu đội xe Xanh ESG (EV/LNG)", money(tx.getGreenEsgDiscountVnd()))
                + row("Thuế GTGT đã ghi nhận", money(tx.getVatAmountVnd()))
                + row("Giảm trừ SLA đã đối soát", penaltyVnd)
                + row("Tổng giá trị thanh toán xác nhận", money(tx.getTotalAmountVnd()))
                + row("Phương thức &amp; Điều khoản", safeText(tx.getPaymentMethod(), "--") + " / " + safeText(contract != null ? contract.getPaymentTerms() : "IMMEDIATE", "NET30"))
                + row("Kênh đối soát / Mã tham chiếu", safeText(tx.getGatewayProvider(), "--") + " / " + safeText(tx.getGatewayReference(), "--"))
                + "</table>"
                + "<h2>ĐIỀU 4. CAM KẾT CHẤT LƯỢNG DỊCH VỤ (SLA) &amp; ĐỐI SOÁT ePOD</h2>"
                + "<p>1. Tỷ lệ giao hàng đúng hạn cam kết: <strong>" + safe(slaOnTime) + "</strong>; Ngưỡng sai lệch nhiệt độ chuỗi lạnh: <strong>" + safe(slaTempDev) + "</strong>.</p>"
                + "<p>2. Tỷ lệ giảm trừ tự động mỗi sự cố vi phạm SLA đã thẩm định: <strong>" + safe(slaPenaltyPct) + "</strong> giá trị chuyến.</p>"
                + "<table><thead><tr><th>Loại sự kiện SLA</th><th>Mô tả chi tiết</th><th>Giảm trừ</th><th>Thời điểm</th></tr></thead><tbody>"
                + slaRows + "</tbody></table>"
                + "<h2>ĐIỀU 5. QUYỀN VÀ NGHĨA VỤ CÁC BÊN</h2>"
                + "<p>1. Bên A đảm bảo phương tiện qua kiểm định an toàn 6 hạng mục trước chuyến (Pre-Trip UC01), truyền tín hiệu GPS/nhiệt độ liên tục và giao hàng nguyên vẹn e-Seal kèm chữ ký nhận ePOD.</p>"
                + "<p>2. Bên B cung cấp chính xác thông tin hàng hóa, tải trọng hợp chuẩn, mở cổng kho đúng lịch hẹn và thanh toán đầy đủ theo bảng kê đã đối soát.</p>"
                + "<h2>ĐIỀU 6. SỰ KIỆN BẤT KHẢ KHÁNG &amp; GIẢI QUYẾT TRANH CHẤP</h2>"
                + "<p>Các trường hợp thiên tai, phong tỏa tuyến đột xuất do cơ quan chức năng được ghi nhận qua phân hệ Sự cố UC16. Mọi tranh chấp ưu tiên thương lượng trong 30 ngày; trường hợp không thành sẽ giải quyết tại Tòa án nhân dân có thẩm quyền tại Việt Nam.</p>"
                + "<h2>ĐIỀU 7. HIỆU LỰC GIAO DỊCH ĐIỆN TỬ &amp; BẰNG CHỨNG XÁC THỰC</h2>"
                + "<div class=\"notice\">Hợp đồng và Biên nhận này được lập tự động trên nền tảng CCADRO tại thời điểm xác nhận giao dịch. "
                + "Mã băm SHA-256 dùng để bảo toàn nội dung bất biến theo Giao dịch điện tử và phục vụ đối soát. Chứng từ này <strong>không thay thế Hóa đơn GTGT điện tử có mã Cơ quan Thuế</strong> theo Nghị định 123/2020/NĐ-CP.</div>"
                + "<table class=\"sig-grid\"><tr>"
                + "<td><strong>ĐẠI DIỆN BÊN A</strong><br/>" + safe(seller.getLegalName()) + "<br/>"
                + "Người đại diện: " + safe(seller.getRepresentativeName()) + "<br/>"
                + "Trạng thái phát hành: XÁC NHẬN TỰ ĐỘNG<br/><code>SHA256: " + safe(snapshotSha256) + "</code></td>"
                + "<td><strong>ĐẠI DIỆN BÊN B</strong><br/>" + safe(buyer.legalName()) + "<br/>"
                + "Tài khoản xác nhận: " + safe(tx.getCreatedByUsername()) + " (" + safe(buyer.representativeName()) + ")<br/>"
                + "Thời điểm xác nhận: " + safe(signedAtStr) + "<br/><code>SIG-REF: " + safe(contractSigHash) + "</code></td>"
                + "</tr></table></body></html>";
    }

    static String renderPaymentReceiptHtml(
            UUID evidenceId,
            PaymentTransaction tx,
            EvidenceProperties seller,
            BuyerLegalProfile buyer,
            String snapshotSha256
    ) {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" "
                + "\"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\n"
                + "<html xmlns=\"http://www.w3.org/1999/xhtml\" lang=\"vi\"><head>"
                + "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />"
                + "<title>Biên Nhận Thanh Toán " + safe(tx.getTransactionCode()) + "</title>"
                + "<style type=\"text/css\">"
                + "@page { size: A4; margin: 18mm 16mm; }"
                + "body { font-family: 'CCADROSans', Arial, sans-serif; font-size: 11pt; color: #162923; line-height: 1.5; }"
                + "h1 { font-size: 16pt; color: #0b4f3a; text-align: center; }"
                + "table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }"
                + "th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }"
                + "th { background-color: #f1f7f4; width: 38%; }"
                + ".badge { display: inline-block; padding: 4px 10px; background: #d1fae5; color: #065f46; font-weight: bold; border-radius: 6px; }"
                + "</style></head><body>"
                + "<h1>BIÊN NHẬN XÁC NHẬN THANH TOÁN ĐIỆN TỬ</h1>"
                + "<p style=\"text-align:center;\"><span class=\"badge\">TRẠNG THÁI: " + safe(tx.getPaymentStatus()) + "</span></p>"
                + "<table>"
                + row("Mã hồ sơ bằng chứng", evidenceId)
                + row("Mã giao dịch", tx.getTransactionCode())
                + row("Số bảng kê / Hóa đơn tham chiếu", tx.getInvoiceNumber())
                + row("Đơn vị thụ hưởng (Bên A)", seller.getLegalName() + " (MST: " + seller.getTaxCode() + ")")
                + row("Khách hàng thanh toán (Bên B)", buyer.legalName() + " (MST: " + buyer.taxCode() + ")")
                + row("Mã vận đơn / Container", safeText(tx.getShipmentCode(), "--") + " / " + safeText(tx.getContainerCode(), "--"))
                + row("Cước vận tải cơ bản", money(tx.getBaseFreightVnd()))
                + row("Chiết khấu đội xe Xanh ESG", money(tx.getGreenEsgDiscountVnd()))
                + row("Thuế GTGT đã ghi nhận", money(tx.getVatAmountVnd()))
                + row("Tổng số tiền đã thanh toán", money(tx.getTotalAmountVnd()))
                + row("Phương thức / Nguồn xác nhận", safeText(tx.getPaymentMethod(), "--") + " / " + safeText(tx.getConfirmationSource(), "--"))
                + row("Mã đối soát cổng thanh toán", safeText(tx.getGatewayReference(), "--"))
                + row("Thời điểm ghi nhận PAID", time(tx.getPaidAt()) + " (UTC+07:00)")
                + row("SHA-256 kiểm chứng toàn vẹn", snapshotSha256)
                + "</table>"
                + "<p style=\"font-size:9.5pt;\">Lưu ý: Biên nhận xác nhận giao dịch thanh toán trên hệ thống CCADRO, đính kèm Hợp đồng vận tải số tham chiếu. Hóa đơn GTGT điện tử theo Nghị định 123/2020/NĐ-CP được phát hành riêng bởi phòng Kế toán.</p>"
                + "</body></html>";
    }

    static byte[] renderPdfBytes(String xhtmlContent) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            registerUnicodeFonts(builder);
            builder.withHtmlContent(xhtmlContent, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot render legal PDF document: " + ex.getMessage(), ex);
        }
    }

    private static void registerUnicodeFonts(PdfRendererBuilder builder) {
        for (String path : REGULAR_FONT_PATHS) {
            File f = new File(path);
            if (f.isFile()) {
                builder.useFont(f, "CCADROSans", 400, PdfRendererBuilder.FontStyle.NORMAL, true);
                break;
            }
        }
        for (String path : BOLD_FONT_PATHS) {
            File f = new File(path);
            if (f.isFile()) {
                builder.useFont(f, "CCADROSans", 700, PdfRendererBuilder.FontStyle.NORMAL, true);
                break;
            }
        }
    }

    private static boolean notBlank(String v) {
        return v != null && !v.isBlank();
    }

    private static String safeText(String v, String fallback) {
        return notBlank(v) ? v : fallback;
    }

    private static String row(String label, Object value) {
        return "<tr><th>" + safe(label) + "</th><td>" + safe(value) + "</td></tr>";
    }

    private static String safe(Object value) {
        String str = value == null || value.toString().isBlank() ? "Chưa ghi nhận" : value.toString();
        return HtmlUtils.htmlEscape(str);
    }

    private static String money(Long value) {
        return value == null
                ? "Chưa ghi nhận"
                : NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(value) + " VND";
    }

    private static String time(Instant value) {
        return value == null
                ? "Chưa ghi nhận"
                : DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm:ss")
                        .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                        .format(value);
    }
}
