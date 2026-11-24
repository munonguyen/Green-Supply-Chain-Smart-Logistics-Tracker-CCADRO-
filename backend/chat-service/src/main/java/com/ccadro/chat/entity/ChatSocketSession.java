package com.ccadro.chat.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "chat_socket_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatSocketSession {
    @Id
    private String id;
    @Indexed(unique = true)
    private String socketSessionId;
    @Indexed
    private String username;
    private Instant connectedAt;
}
