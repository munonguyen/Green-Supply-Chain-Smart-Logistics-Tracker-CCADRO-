package com.ccadro.notification.dto.request;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendEmailRequest {
    @NotBlank(message = "Email người nhận không được để trống")
    @Email(message = "Email người nhận không hợp lệ")
    private String toEmail;

    private String toName;

    @NotBlank(message = "Tiêu đề email không được để trống")
    private String subject;

    @NotBlank(message = "Nội dung email không được để trống")
    private String htmlContent;

    private java.util.List<java.util.Map<String,String>> attachments;

    private String idempotencyKey;
    private String category;
    private String referenceCode;
}

