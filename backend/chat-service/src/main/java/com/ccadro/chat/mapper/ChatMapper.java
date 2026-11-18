package com.ccadro.chat.mapper;

import com.ccadro.chat.dto.response.*;
import com.ccadro.chat.entity.*;
import org.mapstruct.*;

/** Mongo documents are mapped to response records by the generated Spring bean. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ChatMapper {
    ConversationResponse conversation(Conversation conversation);
    MessageResponse message(Message message);
    PreferenceResponse preference(Preference preference);

    @Mapping(target="id", source="conversation.id")
    @Mapping(target="type", source="conversation.type")
    @Mapping(target="title", source="conversation.title")
    @Mapping(target="owner", source="conversation.owner")
    @Mapping(target="members", source="conversation.members")
    @Mapping(target="containerCode", source="conversation.containerCode")
    @Mapping(target="shipmentCode", source="conversation.shipmentCode")
    @Mapping(target="createdAt", source="conversation.createdAt")
    @Mapping(target="lastMessage", source="latest")
    @Mapping(target="unreadCount", source="unread")
    ConversationSummaryResponse summary(Conversation conversation, Message latest, long unread);
}
