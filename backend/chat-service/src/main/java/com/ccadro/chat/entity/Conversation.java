package com.ccadro.chat.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.*;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** MongoDB persistence model; alias preserves the original stored _class value. */
@Data
@Document("conversations")
@TypeAlias("com.ccadro.chat.ChatDocuments$Conversation")
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {
    @Id
    private String id;
    @Version
    private Long version;
    private String type;
    private String title;
    private String owner;
    @Indexed
    private List<String> members = new ArrayList<>();
    private String containerCode;
    private String shipmentCode;
    private Instant createdAt;
}
