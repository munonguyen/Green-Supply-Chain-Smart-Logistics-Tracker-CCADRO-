package com.ccadro.chat.dto;

/** Request-scoped identity validated by Identity Service, never supplied by the chat body. */
public record ChatActor(String username, String role, String authorization) {
    @Override
    public String toString() {
        return "ChatActor[username=" + username + ", role=" + role + "]";
    }
}
