package com.ccadro.chat.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record UpdatePreferencesRequest(
        Boolean pinned,
        Boolean muted) {}
