package com.ccadro.chat.dto.response;

import java.time.Instant;
import java.util.List;

public record ConversationResponse(String id, Long version, String type, String title, String owner,
        List<String> members, String containerCode, String shipmentCode, Instant createdAt) {}
