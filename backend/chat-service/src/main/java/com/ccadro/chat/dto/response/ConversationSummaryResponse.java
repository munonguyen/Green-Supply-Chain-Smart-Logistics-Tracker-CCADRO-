package com.ccadro.chat.dto.response;

import java.time.Instant;
import java.util.List;

public record ConversationSummaryResponse(String id, String type, String title, String owner,
        List<String> members, String containerCode, String shipmentCode, Instant createdAt,
        MessageResponse lastMessage, long unreadCount) {}
