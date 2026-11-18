package com.ccadro.chat.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record ReadMessagesRequest(
        @NotBlank @Size(max=100) String throughMessageId) {}
