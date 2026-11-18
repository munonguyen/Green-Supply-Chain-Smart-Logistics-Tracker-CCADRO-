package com.ccadro.chat.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record AddMembersRequest(
        @NotEmpty @Size(max=49) List<@NotBlank @Size(max=50) String> members) {}
