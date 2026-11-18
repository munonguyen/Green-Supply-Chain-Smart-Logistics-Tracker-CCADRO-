package com.ccadro.chat.util;

import com.ccadro.chat.exception.AppException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

public final class MessageCursor {
    private MessageCursor() {}
    public record Position(Instant createdAt, String messageId) {}

    public static Position decode(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        if (cursor.length() > 300) throw AppException.invalidRequest("Cursor quá dài");
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|", 2);
            return new Position(Instant.parse(parts[0]), parts[1]);
        } catch (Exception ex) {
            throw AppException.invalidRequest("Cursor không hợp lệ");
        }
    }

    public static String encode(Instant createdAt, String messageId) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                (createdAt + "|" + messageId).getBytes(StandardCharsets.UTF_8));
    }
}
