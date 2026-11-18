package com.ccadro.chat.service;

import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.request.UpdatePreferencesRequest;
import com.ccadro.chat.dto.response.PreferenceResponse;
import com.ccadro.chat.mapper.ChatMapper;
import com.ccadro.chat.repository.PreferenceRepository;
import com.ccadro.chat.util.ChatIdentifiers;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import com.ccadro.chat.event.ChatChangedEvent;

@Service
public class PreferenceService {
    private final ApplicationEventPublisher events;
    private final ConversationService conversations;
    private final PreferenceRepository preferences;
    private final ChatMapper mapper;

    public PreferenceService(ConversationService conversations, PreferenceRepository preferences, ChatMapper mapper, ApplicationEventPublisher events) {
        this.events = events;
        this.conversations = conversations;
        this.preferences = preferences;
        this.mapper = mapper;
    }

    public List<PreferenceResponse> list(ChatActor actor) {
        return preferences.findByUsername(actor.username()).stream().map(mapper::preference).toList();
    }

    public void update(String id, ChatActor actor, UpdatePreferencesRequest request) {
        conversations.requireMember(id, actor);
        preferences.upsert(ChatIdentifiers.hash(actor.username() + "\n" + id), actor.username(), id,
                request.pinned(), request.muted());
        events.publishEvent(new ChatChangedEvent(java.util.Set.of(actor.username()), id));
    }
}
