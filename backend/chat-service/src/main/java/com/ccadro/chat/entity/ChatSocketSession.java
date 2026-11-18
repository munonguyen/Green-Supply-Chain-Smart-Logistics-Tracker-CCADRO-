package com.ccadro.chat.entity;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "chat_socket_sessions")
public class ChatSocketSession {
    @Id
    private String id;
    @Indexed(unique = true)
    private String socketSessionId;
    @Indexed
    private String username;
    private Instant connectedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSocketSessionId() { return socketSessionId; }
    public void setSocketSessionId(String socketSessionId) { this.socketSessionId = socketSessionId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Instant getConnectedAt() { return connectedAt; }
    public void setConnectedAt(Instant connectedAt) { this.connectedAt = connectedAt; }
}
