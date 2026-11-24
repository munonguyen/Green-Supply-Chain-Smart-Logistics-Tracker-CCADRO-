package com.ccadro.chat.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.*;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** MongoDB persistence model; alias preserves the original stored _class value. */
@Data
@Document("messages")
@TypeAlias("com.ccadro.chat.ChatDocuments$Message")
@CompoundIndex(name="conversation_timeline", def="{'conversationId':1,'createdAt':-1,'_id':-1}")
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    private String id;
    private String conversationId;
    private String senderUsername;
    private String senderName;
    private String senderRole;
    private String messageText;
    private String messageType;
    private Map<String, Object> metadata = Map.of();
    private Instant createdAt;
    private Set<String> readBy = new HashSet<>();
    private Map<String, Set<String>> reactions = new HashMap<>();
}
