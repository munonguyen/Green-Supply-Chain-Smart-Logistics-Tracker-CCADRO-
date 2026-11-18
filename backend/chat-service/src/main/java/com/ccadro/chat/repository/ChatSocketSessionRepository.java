package com.ccadro.chat.repository;

import com.ccadro.chat.entity.ChatSocketSession;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChatSocketSessionRepository extends MongoRepository<ChatSocketSession, String> {
    Optional<ChatSocketSession> findBySocketSessionId(String socketSessionId);
    List<ChatSocketSession> findAllByUsernameIn(Collection<String> usernames);
    void deleteBySocketSessionId(String socketSessionId);
}
