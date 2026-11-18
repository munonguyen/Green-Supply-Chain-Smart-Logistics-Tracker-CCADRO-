package com.ccadro.chat.service;

import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.request.SendMessageRequest;
import com.ccadro.chat.dto.response.MessagePageResponse;
import com.ccadro.chat.dto.response.MessageResponse;
import com.ccadro.chat.entity.Message;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.exception.ErrorCode;
import com.ccadro.chat.mapper.ChatMapper;
import com.ccadro.chat.repository.MessageRepository;
import com.ccadro.chat.util.ChatIdentifiers;
import com.ccadro.chat.util.MessageCursor;
import com.ccadro.chat.validate.ChatMessageValidator;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import com.ccadro.chat.event.ChatChangedEvent;

@Service
public class MessageService {
    private final ApplicationEventPublisher events;
    private static final Set<String> REACTIONS = Set.of("👍", "❤️", "😂", "😮", "😢", "🔥");
    private final ConversationService conversations;
    private final MessageRepository messages;
    private final ChatMapper mapper;
    private final ChatMessageValidator chatMessageValidator;

    public MessageService(ConversationService conversations, MessageRepository messages, ChatMapper mapper, ApplicationEventPublisher events) {
        this(conversations, messages, mapper, events, new ChatMessageValidator());
    }

    @Autowired
    public MessageService(ConversationService conversations, MessageRepository messages, ChatMapper mapper, ApplicationEventPublisher events, ChatMessageValidator chatMessageValidator) {
        this.events = events;
        this.conversations = conversations;
        this.messages = messages;
        this.mapper = mapper;
        this.chatMessageValidator = chatMessageValidator;
    }

    public MessagePageResponse list(String id, ChatActor actor, String cursor, int requestedLimit) {
        conversations.requireMember(id, actor);
        int limit = chatMessageValidator.clampPageLimit(requestedLimit);
        var rows = messages.findPage(id, MessageCursor.decode(cursor), limit);
        boolean more = rows.size() > limit;
        var page = new ArrayList<>(rows.subList(0, Math.min(rows.size(), limit)));
        String next = null;
        if (more) {
            var last = page.get(page.size() - 1);
            next = MessageCursor.encode(last.getCreatedAt(), last.getId());
        }
        Collections.reverse(page);
        return new MessagePageResponse(page.stream().map(mapper::message).toList(), next);
    }

    public MessageResponse send(String id, ChatActor actor, SendMessageRequest request) {
        var conversation = conversations.requireMember(id, actor);
        String text = chatMessageValidator.validateAndNormalizeText(request);
        var message = new Message();
        message.setId(ChatIdentifiers.hash(id + "\n" + actor.username() + "\n" + request.clientMessageId()));
        message.setConversationId(id);
        message.setSenderUsername(actor.username());
        message.setSenderName(actor.username());
        message.setSenderRole(actor.role());
        message.setMessageText(text);
        message.setMessageType(request.messageType());
        message.setCreatedAt(Instant.now());
        message.setReadBy(new HashSet<>(Set.of(actor.username())));
        try {
            var saved = messages.insert(message);
            events.publishEvent(new ChatChangedEvent(new HashSet<>(conversation.getMembers()), id));
            return mapper.message(saved);
        } catch (DuplicateKeyException ex) {
            var existing = messages.findById(message.getId());
            chatMessageValidator.validateIdempotentReplay(existing, id, actor, text, request.messageType());
            return mapper.message(existing);
        }
    }

    public long markRead(String id, ChatActor actor, String throughMessageId) {
        var conversation = conversations.requireMember(id, actor);
        Message through = messages.findByIdAndConversation(throughMessageId, id);
        if (through == null) throw new AppException(ErrorCode.MESSAGE_NOT_FOUND);
        long count = messages.markReadThrough(id, actor.username(), through);
        if (count > 0) events.publishEvent(new ChatChangedEvent(new HashSet<>(conversation.getMembers()), id));
        return count;
    }

    public void react(String id, String messageId, ChatActor actor, String emoji, boolean active) {
        var conversation = conversations.requireMember(id, actor);
        if (!REACTIONS.contains(emoji)) throw AppException.invalidRequest("Reaction không hỗ trợ");
        if (!messages.updateReaction(id, messageId, actor.username(), emoji, active)) {
            throw new AppException(ErrorCode.MESSAGE_NOT_FOUND);
        }
        events.publishEvent(new ChatChangedEvent(new HashSet<>(conversation.getMembers()), id));
    }
}
