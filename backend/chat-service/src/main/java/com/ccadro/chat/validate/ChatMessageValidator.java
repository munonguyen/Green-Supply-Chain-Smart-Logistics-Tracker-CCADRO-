package com.ccadro.chat.validate;

import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.request.SendMessageRequest;
import com.ccadro.chat.entity.Message;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Validator tin nhắn, idempotency replay và chuẩn hóa phân trang của Chat Service.
 */
@Component
public class ChatMessageValidator {

    public static final Set<String> SUPPORTED_TYPES = Set.of("TEXT", "LOCATION", "CARD");

    public int clampPageLimit(int requestedLimit) {
        return Math.max(1, Math.min(100, requestedLimit));
    }

    public String validateAndNormalizeText(SendMessageRequest request) {
        if (!SUPPORTED_TYPES.contains(request.messageType())) {
            throw AppException.invalidRequest("Loại tin nhắn không hỗ trợ");
        }
        String text = request.messageText() != null ? request.messageText().trim() : "";
        if (text.isEmpty()) {
            throw AppException.invalidRequest("Tin nhắn không được rỗng");
        }
        return text;
    }

    public void validateIdempotentReplay(
            Message existing,
            String conversationId,
            ChatActor actor,
            String normalizedText,
            String messageType) {
        if (existing == null
                || !existing.getConversationId().equals(conversationId)
                || !existing.getSenderUsername().equals(actor.username())
                || !existing.getMessageText().equals(normalizedText)
                || !existing.getMessageType().equals(messageType)) {
            throw new AppException(ErrorCode.IDEMPOTENCY_CONFLICT);
        }
    }
}

