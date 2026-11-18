package com.ccadro.chat.dto.response;

import java.util.List;

public record MessagePageResponse(List<MessageResponse> messages, String nextCursor) {}
