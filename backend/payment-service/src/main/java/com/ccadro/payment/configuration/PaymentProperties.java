package com.ccadro.payment.configuration;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "ccadro.payment")
public class PaymentProperties {

    /**
     * Thuế giá trị gia tăng mặc định cho dịch vụ vận tải xanh (8%).
     */
    private double vatRate = 0.08;

    /**
     * Ưu đãi chiết khấu ESG cho xe đầu kéo điện (EV).
     */
    private double evGreenDiscountRate = 0.05;

    /**
     * Ưu đãi chiết khấu ESG cho xe tải Hybrid LNG.
     */
    private double lngGreenDiscountRate = 0.03;

    /**
     * Số ngày hạn mức công nợ Xanh Net-30.
     */
    private int net30Days = 30;

    /**
     * Hạn thanh toán mặc định cho hóa đơn trả ngay (ngày).
     */
    private int defaultDueDays = 3;

    /**
     * Thông tin tài khoản thụ hưởng VietQR / Napas.
     */
    private String merchantBankCode = "VCB";
    private String merchantAccountNo = "1038889999";
    private String merchantAccountName = "CCADRO GREEN LOGISTICS JSC";

    /**
     * Khóa bí mật xác thực Webhook từ cổng thanh toán (VietQR/VNPay/MoMo).
     */
    private String webhookSecret = "ccadro-vnpay-vietqr-hmac-secret";

    /**
     * Tham số mặc định Hợp đồng B2B & SLA.
     */
    private long defaultCreditLimitVnd = 500_000_000L;
    private double defaultSlaOnTimePct = 98.5;
    private double defaultMaxTempDeviationC = 2.0;
    private double defaultSlaPenaltyPct = 5.0;
}

