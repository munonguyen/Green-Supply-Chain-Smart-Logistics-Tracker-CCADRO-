package com.ccadro.chat.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record SendMessageRequest(
        @NotBlank @Size(max=100) String clientMessageId,
        @NotBlank @Size(max=4000) String messageText,
        @NotBlank String messageType) {}
