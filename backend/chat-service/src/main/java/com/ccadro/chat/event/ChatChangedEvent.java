package com.ccadro.chat.event;

import java.util.Set;

/** Invalidation only, emitted after persistence. Recipient usernames are never serialized to clients. */
public record ChatChangedEvent(Set<String> recipients, String conversationId) {
    public ChatChangedEvent {
        recipients = Set.copyOf(recipients);
    }
}
