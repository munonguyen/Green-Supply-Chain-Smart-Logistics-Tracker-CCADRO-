package com.ccadro.chat.controller;

import com.ccadro.chat.dto.ApiResponse;
import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.request.*;
import com.ccadro.chat.dto.response.*;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.service.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/** HTTP contract only: validation, request identity, and delegation to application services. */
@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {
    private final ChatDirectoryService directory;
    private final ChatTicketService tickets;
    private final ConversationService conversations;
    private final MessageService messages;
    private final PreferenceService preferences;

    public ChatController(ChatDirectoryService directory, ConversationService conversations,
            MessageService messages, PreferenceService preferences, ChatTicketService tickets) {
        this.directory = directory;
        this.tickets = tickets;
        this.conversations = conversations;
        this.messages = messages;
        this.preferences = preferences;
    }

    @PostMapping("/socket-ticket")
    public ApiResponse<ChatTicketService.TicketResponse> socketTicket(@RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(tickets.issue(actor));
    }

    @GetMapping("/contacts")
    public ApiResponse<List<ContactResponse>> contacts(@RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(directory.contacts(actor));
    }

    @GetMapping("/conversations")
    public ApiResponse<List<ConversationSummaryResponse>> list(@RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(conversations.summaries(actor));
    }

    @PostMapping("/conversations")
    public ApiResponse<ConversationResponse> create(@RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody CreateConversationRequest request) {
        return ApiResponse.success(conversations.create(actor, request));
    }

    @PostMapping("/conversations/{id}/members")
    public ApiResponse<ConversationResponse> addMembers(@PathVariable String id,
            @RequestAttribute("chatActor") ChatActor actor, @Valid @RequestBody AddMembersRequest request) {
        return ApiResponse.success(conversations.addMembers(id, actor, request.members()));
    }

    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<MessagePageResponse> messages(@PathVariable String id,
            @RequestAttribute("chatActor") ChatActor actor, @RequestParam(required=false) String cursor,
            @RequestParam(defaultValue="100") int limit) {
        if (cursor != null && cursor.length() > 300) throw AppException.invalidRequest("Cursor quá dài");
        return ApiResponse.success(messages.list(id, actor, cursor, limit));
    }

    @PostMapping("/conversations/{id}/messages")
    public ApiResponse<MessageResponse> send(@PathVariable String id, @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody SendMessageRequest request) {
        return ApiResponse.success(messages.send(id, actor, request));
    }

    @PutMapping("/conversations/{id}/read")
    public ApiResponse<Long> read(@PathVariable String id, @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody ReadMessagesRequest request) {
        return ApiResponse.success(messages.markRead(id, actor, request.throughMessageId()));
    }

    @PutMapping("/conversations/{id}/messages/{messageId}/reaction")
    public ApiResponse<Boolean> reaction(@PathVariable String id, @PathVariable String messageId,
            @RequestAttribute("chatActor") ChatActor actor, @Valid @RequestBody MessageReactionRequest request) {
        messages.react(id, messageId, actor, request.emoji(), request.active());
        return ApiResponse.success(true);
    }

    @GetMapping("/preferences")
    public ApiResponse<List<PreferenceResponse>> preferences(@RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(preferences.list(actor));
    }

    @PutMapping("/conversations/{id}/preferences")
    public ApiResponse<Boolean> preference(@PathVariable String id, @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody UpdatePreferencesRequest request) {
        preferences.update(id, actor, request);
        return ApiResponse.success(true);
    }
}
