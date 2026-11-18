package com.ccadro.chat.dto.response;

import java.time.Instant;
import java.util.Map;
import java.util.Set;

public record MessageResponse(String id, String conversationId, String senderUsername,
        String senderName, String senderRole, String messageText, String messageType,
        Map<String, Object> metadata, Instant createdAt, Set<String> readBy,
        Map<String, Set<String>> reactions) {}
