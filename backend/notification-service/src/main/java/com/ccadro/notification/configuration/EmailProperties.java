package com.ccadro.notification.configuration;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "notification.email")
public class EmailProperties {
    private String mode = "AUTO";
    private String brevoUrl = "https://api.brevo.com";
    private String brevoApikey = "";
    private String senderEmail = "noreply@ccadro.com";
    private String replyToEmail = "";
    private String senderName = "CCADRO Green Logistics";
}

