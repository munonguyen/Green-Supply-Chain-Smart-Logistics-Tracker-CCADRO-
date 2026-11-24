package com.ccadro.chat.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.mapping.Document;

/** MongoDB persistence model; alias preserves the original stored _class value. */
@Data
@Document("preferences")
@TypeAlias("com.ccadro.chat.ChatDocuments$Preference")
@NoArgsConstructor
@AllArgsConstructor
public class Preference {
    @Id
    private String id;
    private String username;
    private String conversationId;
    private boolean pinned;
    private boolean muted;
}
