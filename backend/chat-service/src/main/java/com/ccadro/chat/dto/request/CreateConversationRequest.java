package com.ccadro.chat.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record CreateConversationRequest(
        @NotBlank String type,
        @Size(max=150) String title,
        @NotNull @Size(min=1, max=49) List<@NotBlank @Size(max=50) String> members,
        @Size(max=80) String containerCode,
        @Size(max=80) String shipmentCode) {}
