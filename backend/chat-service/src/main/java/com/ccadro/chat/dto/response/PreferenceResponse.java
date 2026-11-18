package com.ccadro.chat.dto.response;

public record PreferenceResponse(String id, String username, String conversationId,
        boolean pinned, boolean muted) {}
