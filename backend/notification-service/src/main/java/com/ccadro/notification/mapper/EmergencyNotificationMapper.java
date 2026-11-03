package com.ccadro.notification.mapper;

import com.ccadro.notification.dto.request.ManualBroadcastRequest;
import com.ccadro.notification.dto.response.EmergencyNotificationResponse;
import com.ccadro.notification.entity.EmergencyNotification;
import com.ccadro.notification.event.EmergencyNotificationEvent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface EmergencyNotificationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "UNREAD")
    @Mapping(target = "acknowledgedBy", ignore = true)
    @Mapping(target = "acknowledgedAt", ignore = true)
    @Mapping(target = "actionNotes", ignore = true)
    @Mapping(target = "createdAt", expression = "java(java.time.Instant.now())")
    EmergencyNotification toEntity(EmergencyNotificationEvent event);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "notificationCode", ignore = true)
    @Mapping(target = "sourceService", constant = "notification-service")
    @Mapping(target = "broadcastType", constant = "MANUAL_BROADCAST")
    @Mapping(target = "status", constant = "UNREAD")
    @Mapping(target = "acknowledgedBy", ignore = true)
    @Mapping(target = "acknowledgedAt", ignore = true)
    @Mapping(target = "actionNotes", ignore = true)
    @Mapping(target = "recipientId", ignore = true)
    @Mapping(target = "referenceId", ignore = true)
    @Mapping(target = "metadataJson", constant = "{}")
    @Mapping(target = "createdAt", expression = "java(java.time.Instant.now())")
    EmergencyNotification toEntity(ManualBroadcastRequest request);

    EmergencyNotificationResponse toResponse(EmergencyNotification entity);

    List<EmergencyNotificationResponse> toResponseList(List<EmergencyNotification> entities);
}

