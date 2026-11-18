package com.ccadro.notification.service;

import com.ccadro.notification.configuration.EmailProperties;
import com.ccadro.notification.dto.request.SendEmailRequest;
import com.ccadro.notification.dto.response.EmailDispatchResponse;
import com.ccadro.notification.exception.AppException;
import com.ccadro.notification.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dịch vụ gửi Email giao dịch qua nhà cung cấp bên thứ 3 (Brevo Transactional Email v3 REST API).
 * - Khi có CCADRO_BREVO_API_KEY và mode != SANDBOX: gọi POST https://api.brevo.com/v3/smtp/email.
 * - Khi chưa cấu hình API key: chạy ở chế độ SANDBOX và phản hồi trạng thái rõ ràng để tránh rò rỉ/lỗi ngầm.
 */
@Service
@Slf4j
public class TransactionalEmailService {

    private final EmailProperties emailProperties;
    private final RestClient restClient;

    @Autowired
    public TransactionalEmailService(EmailProperties emailProperties, RestClient.Builder restClientBuilder) {
        this.emailProperties = emailProperties;
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(10000);
        this.restClient = restClientBuilder.baseUrl(emailProperties.getBrevoUrl()).requestFactory(factory).build();
    }

    TransactionalEmailService(EmailProperties emailProperties, RestClient restClient) {
        this.emailProperties = emailProperties;
        this.restClient = restClient;
    }

    public boolean isLiveProviderConfigured() {
        String key = emailProperties.getBrevoApikey();
        String mode = emailProperties.getMode();
        return key != null && !key.isBlank() && !"SANDBOX".equalsIgnoreCase(mode);
    }

    public Map<String, Object> getProviderStatus() {
        boolean live = isLiveProviderConfigured();
        return Map.of(
                "provider", "BREVO_TRANSACTIONAL_API",
                "mode", live ? "LIVE" : "SANDBOX",
                "configured", live,
                "senderEmail", emailProperties.getSenderEmail(),
                "thirdPartyRequired", true,
                "note", live
                        ? "Đã cấu hình API Key Brevo, sẵn sàng gửi email giao dịch ra Inbox thực."
                        : "Chưa cấu hình biến môi trường CCADRO_BREVO_API_KEY: đang chạy SANDBOX (chưa gửi mail thật ra ngoài)."
        );
    }

    public EmailDispatchResponse sendEmail(SendEmailRequest request) {
        if (!isLiveProviderConfigured()) {
            String sandboxId = "sandbox-mail-" + UUID.randomUUID().toString().substring(0, 8);
            log.info("[EMAIL SANDBOX] Simulated email to={} subject={} ref={}",
                    request.getToEmail(), request.getSubject(), request.getReferenceCode());
            return EmailDispatchResponse.builder()
                    .provider("BREVO_TRANSACTIONAL_API")
                    .mode("SANDBOX")
                    .status("SIMULATED_NO_API_KEY")
                    .toEmail(request.getToEmail())
                    .subject(request.getSubject())
                    .messageId(sandboxId)
                    .detail("Chưa cấu hình CCADRO_BREVO_API_KEY. Để gửi email thật, cần cấp API Key Brevo/SendGrid/Resend.")
                    .dispatchedAt(Instant.now())
                    .build();
        }

        Map<String, Object> payload = new java.util.LinkedHashMap<>(Map.of(
                "sender", Map.of(
                        "name", emailProperties.getSenderName(),
                        "email", emailProperties.getSenderEmail()
                ),
                "to", List.of(Map.of(
                        "email", request.getToEmail().trim(),
                        "name", (request.getToName() != null && !request.getToName().isBlank())
                                ? request.getToName().trim()
                                : request.getToEmail().trim()
                )),
                "subject", request.getSubject().trim(),
                "htmlContent", request.getHtmlContent()
        ));
        if(request.getAttachments()!=null && !request.getAttachments().isEmpty()) payload.put("attachment",request.getAttachments());

        if(request.getIdempotencyKey()!=null && !request.getIdempotencyKey().isBlank())
            payload.put("headers",Map.of("idempotencyKey",request.getIdempotencyKey()));
        if(!emailProperties.getReplyToEmail().isBlank()) payload.put("replyTo",Map.of("email",emailProperties.getReplyToEmail()));
        if(request.getCategory()!=null) payload.put("tags",List.of(request.getCategory()));
        try {
            Map<String, Object> responseBody = restClient.post()
                    .uri("/v3/smtp/email")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("api-key", emailProperties.getBrevoApikey().trim())
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            String messageId = responseBody != null && responseBody.get("messageId") != null
                    ? String.valueOf(responseBody.get("messageId"))
                    : null;
            if(messageId==null || messageId.isBlank()) {
                if ("PAYMENT_EVIDENCE".equals(request.getCategory())) return reviewRequired(request);
                throw new IllegalStateException("Provider did not return a message ID");
            }

            return EmailDispatchResponse.builder()
                    .provider("BREVO_TRANSACTIONAL_API")
                    .mode("LIVE")
                    .status("SENT")
                    .toEmail(request.getToEmail())
                    .subject(request.getSubject())
                    .messageId(messageId)
                    .detail("Đã gửi email thành công qua Brevo v3 SMTP API.")
                    .dispatchedAt(Instant.now())
                    .build();
        } catch (Exception ex) {
            if ("PAYMENT_EVIDENCE".equals(request.getCategory()) &&
                    (ex instanceof org.springframework.web.client.ResourceAccessException ||
                     (ex instanceof org.springframework.web.client.HttpClientErrorException http && http.getResponseBodyAsString().contains("duplicate_parameter")))) {
                return reviewRequired(request);
            }
            log.error("Lỗi gửi email qua Brevo cho {}: {}", request.getToEmail(), ex.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Không thể gửi email qua cổng Brevo: " + ex.getMessage());
        }
    }

    private EmailDispatchResponse reviewRequired(SendEmailRequest request) {
        return EmailDispatchResponse.builder().provider("BREVO_TRANSACTIONAL_API")
                .mode("LIVE").status("REVIEW_REQUIRED")
                .toEmail(request.getToEmail()).subject(request.getSubject())
                .detail("Cần đối chiếu log nhà cung cấp trước khi gửi lại")
                .dispatchedAt(Instant.now()).build();
    }
}

