package com.ccadro.chat.service;

import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.request.SendMessageRequest;
import com.ccadro.chat.entity.Message;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.exception.ErrorCode;
import com.ccadro.chat.mapper.ChatMapper;
import com.ccadro.chat.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MessageServiceTest {
    private final ConversationService conversations = mock(ConversationService.class);
    private final MessageRepository messages = mock(MessageRepository.class);
    private final ChatActor actor = new ChatActor("alice", "CUSTOMER", "Bearer private-token");
    private MessageService service;

    @BeforeEach
    void setUp() { service = new MessageService(conversations, messages, org.mapstruct.factory.Mappers.getMapper(ChatMapper.class), mock(org.springframework.context.ApplicationEventPublisher.class)); }

    @Test
    void everyConversationOperationChecksMembershipBeforeTouchingMessages() {
        when(conversations.requireMember("room", actor)).thenThrow(new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        assertThatThrownBy(() -> service.list("room", actor, null, 100)).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.send("room", actor, new SendMessageRequest("key", "hello", "TEXT")))
                .isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.markRead("room", actor, "message")).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.react("room", "message", actor, "👍", true)).isInstanceOf(AppException.class);
        verifyNoInteractions(messages);
    }

    @Test
    void retryReturnsSavedMessageButRejectsReuseOfKeyForDifferentContent() {
        when(messages.insert(any())).thenThrow(new DuplicateKeyException("duplicate"));
        Message existing = new Message();
        existing.setId("existing-id");
        existing.setConversationId("room");
        existing.setSenderUsername("alice");
        existing.setMessageText("hello");
        existing.setMessageType("TEXT");
        when(messages.findById(anyString())).thenReturn(existing);
        assertThat(service.send("room", actor, new SendMessageRequest("same-key", "hello", "TEXT")).id())
                .isEqualTo("existing-id");
        assertThatThrownBy(() -> service.send("room", actor, new SendMessageRequest("same-key", "changed", "TEXT")))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.IDEMPOTENCY_CONFLICT));
    }

    @Test
    void invalidCursorAndReactionDoNotIssueMessageQueries() {
        assertThatThrownBy(() -> service.list("room", actor, "not-a-cursor", 20)).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.react("room", "message", actor, "$bad.field", true)).isInstanceOf(AppException.class);
        verifyNoInteractions(messages);
    }
}
