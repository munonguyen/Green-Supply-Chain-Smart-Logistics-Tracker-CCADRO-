package com.ccadro.chat.controller;

import com.ccadro.chat.dto.ApiResponse;
import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.request.*;
import com.ccadro.chat.dto.response.*;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/** HTTP contract only: validation, request identity, and delegation to application services. */
@RestController
@RequestMapping("/api/v1/chat")
@Tag(name = "Enterprise Chat & Socket.IO Ticket", description = "Hệ thống nhắn tin đa kênh Customer - Driver - Dispatcher - Hub trên MongoDB & Socket.IO")
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
    @Operation(summary = "Cấp ticket ngắn hạn kết nối WebSocket / Socket.IO")
    public ApiResponse<ChatTicketService.TicketResponse> socketTicket(
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(tickets.issue(actor));
    }

    @GetMapping("/contacts")
    @Operation(summary = "Danh bạ người dùng được phép liên hệ theo vai trò")
    public ApiResponse<List<ContactResponse>> contacts(
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(directory.contacts(actor));
    }

    @GetMapping("/conversations")
    @Operation(summary = "Danh sách hội thoại & số tin nhắn chưa đọc")
    public ApiResponse<List<ConversationSummaryResponse>> list(
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(conversations.summaries(actor));
    }

    @PostMapping("/conversations")
    @Operation(summary = "Tạo hội thoại trực tiếp (1-1) hoặc nhóm (Group Chat)")
    public ApiResponse<ConversationResponse> create(
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody CreateConversationRequest request) {
        return ApiResponse.success(conversations.create(actor, request));
    }

    @PostMapping("/conversations/{id}/members")
    @Operation(summary = "Thêm thành viên vào nhóm hội thoại")
    public ApiResponse<ConversationResponse> addMembers(@PathVariable String id,
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody AddMembersRequest request) {
        return ApiResponse.success(conversations.addMembers(id, actor, request.members()));
    }

    @GetMapping("/conversations/{id}/messages")
    @Operation(summary = "Tải lịch sử tin nhắn theo cursor pagination")
    public ApiResponse<MessagePageResponse> messages(@PathVariable String id,
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor,
            @RequestParam(required=false) String cursor,
            @RequestParam(defaultValue="100") int limit) {
        if (cursor != null && cursor.length() > 300) throw AppException.invalidRequest("Cursor quá dài");
        return ApiResponse.success(messages.list(id, actor, cursor, limit));
    }

    @PostMapping("/conversations/{id}/messages")
    @Operation(summary = "Gửi tin nhắn mới vào hội thoại")
    public ApiResponse<MessageResponse> send(@PathVariable String id,
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody SendMessageRequest request) {
        return ApiResponse.success(messages.send(id, actor, request));
    }

    @PutMapping("/conversations/{id}/read")
    @Operation(summary = "Đánh dấu đã đọc tới messageId")
    public ApiResponse<Long> read(@PathVariable String id,
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody ReadMessagesRequest request) {
        return ApiResponse.success(messages.markRead(id, actor, request.throughMessageId()));
    }

    @PutMapping("/conversations/{id}/messages/{messageId}/reaction")
    @Operation(summary = "Thả / bỏ cảm xúc (reaction) cho tin nhắn")
    public ApiResponse<Boolean> reaction(@PathVariable String id, @PathVariable String messageId,
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody MessageReactionRequest request) {
        messages.react(id, messageId, actor, request.emoji(), request.active());
        return ApiResponse.success(true);
    }

    @GetMapping("/preferences")
    @Operation(summary = "Lấy tùy chọn pin / mute hội thoại của tài khoản")
    public ApiResponse<List<PreferenceResponse>> preferences(
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor) {
        return ApiResponse.success(preferences.list(actor));
    }

    @PutMapping("/conversations/{id}/preferences")
    @Operation(summary = "Cập nhật ghim / tắt thông báo hội thoại")
    public ApiResponse<Boolean> preference(@PathVariable String id,
            @Parameter(hidden = true) @RequestAttribute("chatActor") ChatActor actor,
            @Valid @RequestBody UpdatePreferencesRequest request) {
        preferences.update(id, actor, request);
        return ApiResponse.success(true);
    }
}
