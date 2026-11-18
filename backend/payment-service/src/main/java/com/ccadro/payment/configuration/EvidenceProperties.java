package com.ccadro.payment.configuration;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "ccadro.evidence")
public class EvidenceProperties {
    private String legalName = "Công ty Cổ phần Logistics Xanh CCADRO";
    private String taxCode = "0316888999";
    private String businessLicense = "0316888999 - Sở KH&ĐT TP.HCM";
    private String address = "Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh";
    private String representativeName = "Nguyễn Minh Quân";
    private String representativeTitle = "Tổng Giám Đốc";
    private String supportEmail = "legal-billing@ccadro.vn";
    private String responseTime = "24 giờ làm việc";
    private String notificationUrl = "http://localhost:8087";
    private String internalToken = "";
    private int maxAttempts = 10;
    private int retrySeconds = 60;
    private boolean kafkaEnabled = true;
    private String kafkaTopic = "ccadro.payment.evidence.v1";
    private String emailStatusTopic = "ccadro.payment.email.status.v1";
}
