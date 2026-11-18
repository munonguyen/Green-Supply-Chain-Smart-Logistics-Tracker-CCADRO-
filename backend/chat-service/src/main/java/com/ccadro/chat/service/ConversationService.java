package com.ccadro.chat.service;

import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.request.CreateConversationRequest;
import com.ccadro.chat.dto.response.ConversationResponse;
import com.ccadro.chat.dto.response.ConversationSummaryResponse;
import com.ccadro.chat.entity.Conversation;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.exception.ErrorCode;
import com.ccadro.chat.mapper.ChatMapper;
import com.ccadro.chat.repository.ConversationRepository;
import com.ccadro.chat.repository.MessageRepository;
import com.ccadro.chat.util.ChatIdentifiers;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import com.ccadro.chat.event.ChatChangedEvent;

@Service
public class ConversationService {
    private final ApplicationEventPublisher events;
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final ChatDirectoryService directory;
    private final ChatMapper mapper;

    public ConversationService(ConversationRepository conversations, MessageRepository messages,
            ChatDirectoryService directory, ChatMapper mapper, ApplicationEventPublisher events) {
        this.events = events;
        this.conversations = conversations;
        this.messages = messages;
        this.directory = directory;
        this.mapper = mapper;
    }

    /** One membership gate reused by every operation on a conversation. */
    public Conversation requireMember(String id, ChatActor actor) {
        Conversation conversation = conversations.findByIdAndMember(id, actor.username());
        if (conversation == null) throw new AppException(ErrorCode.CONVERSATION_NOT_FOUND);
        return conversation;
    }

    public List<ConversationSummaryResponse> summaries(ChatActor actor) {
        return conversations.findByMember(actor.username()).stream()
                .map(c -> mapper.summary(c, messages.findLatest(c.getId()),
                        messages.countUnread(c.getId(), actor.username())))
                .toList();
    }

    public ConversationResponse create(ChatActor actor, CreateConversationRequest request) {
        var members = new TreeSet<>(request.members());
        members.add(actor.username());
        if (members.size() < 2 || members.size() > 50 || !Set.of("DM", "GROUP").contains(request.type())) {
            throw AppException.invalidRequest("Cần từ 2 đến 50 thành viên và loại DM/GROUP");
        }
        if (request.type().equals("DM") && members.size() != 2) {
            throw AppException.invalidRequest("DM phải có hai thành viên");
        }
        directory.validateMembers(actor, members);
        var conversation = new Conversation();
        conversation.setId(request.type().equals("DM")
                ? "dm-" + ChatIdentifiers.hash(String.join("\n", members)) : UUID.randomUUID().toString());
        conversation.setType(request.type());
        conversation.setTitle(request.title() == null ? "" : request.title().trim());
        conversation.setOwner(actor.username());
        conversation.setMembers(new ArrayList<>(members));
        conversation.setContainerCode(request.containerCode());
        conversation.setShipmentCode(request.shipmentCode());
        conversation.setCreatedAt(Instant.now());
        try {
            var saved = conversations.insert(conversation);
            events.publishEvent(new ChatChangedEvent(new java.util.HashSet<>(saved.getMembers()), saved.getId()));
            return mapper.conversation(saved);
        } catch (DuplicateKeyException ex) {
            if (!"DM".equals(request.type())) throw ex;
            return mapper.conversation(requireMember(conversation.getId(), actor));
        }
    }

    public ConversationResponse addMembers(String id, ChatActor actor, List<String> additions) {
        var conversation = requireMember(id, actor);
        if (!conversation.getOwner().equals(actor.username())) throw new AppException(ErrorCode.FORBIDDEN);
        if (!"GROUP".equals(conversation.getType())) {
            throw AppException.invalidRequest("Tạo nhóm mới để thêm người vào DM");
        }
        var merged = new TreeSet<>(conversation.getMembers());
        merged.addAll(additions);
        if (merged.size() > 50) throw AppException.invalidRequest("Nhóm tối đa 50 thành viên");
        directory.validateMembers(actor, additions);
        conversation.setMembers(new ArrayList<>(merged));
        var saved = conversations.save(conversation);
        events.publishEvent(new ChatChangedEvent(new java.util.HashSet<>(saved.getMembers()), id));
        return mapper.conversation(saved);
    }
}
