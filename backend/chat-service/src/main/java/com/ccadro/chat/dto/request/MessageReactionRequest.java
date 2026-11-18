package com.ccadro.chat.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record MessageReactionRequest(
        @NotBlank @Size(max=16) String emoji,
        boolean active) {}
