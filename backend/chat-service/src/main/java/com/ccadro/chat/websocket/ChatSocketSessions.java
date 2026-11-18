package com.ccadro.chat.websocket;

import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.entity.ChatSocketSession;
import com.ccadro.chat.event.ChatChangedEvent;
import com.ccadro.chat.repository.ChatSocketSessionRepository;
import com.ccadro.chat.service.ChatAuthenticationService;
import com.ccadro.chat.service.ChatTicketService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnConnect;
import com.corundumstudio.socketio.annotation.OnDisconnect;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Authenticated Socket.IO sessions persisted for member-scoped event fanout. */
@Component
public class ChatSocketSessions {
    private final SocketIOServer server;
    private final ChatTicketService tickets;
    private final ChatAuthenticationService authentication;
    private final ChatSocketSessionRepository sessions;
    private final ObjectMapper json;
    private final Map<String, ChatActor> actors = new ConcurrentHashMap<>();

    public ChatSocketSessions(SocketIOServer server, ChatTicketService tickets,
            ChatAuthenticationService authentication, ChatSocketSessionRepository sessions, ObjectMapper json) {
        this.server = server;
        this.tickets = tickets;
        this.authentication = authentication;
        this.sessions = sessions;
        this.json = json;
    }

    @PostConstruct
    public void start() {
        server.addListeners(this);
        server.start();
    }

    @PreDestroy
    public void stop() { server.stop(); }

    @OnConnect
    public void connected(SocketIOClient client) {
        String id = client.getSessionId().toString();
        try {
            String ticket = client.getHandshakeData().getSingleUrlParam("ticket");
            ChatActor actor = tickets.consume(ticket);
            actor = authentication.authenticate(actor.authorization());
            ChatSocketSession record = new ChatSocketSession();
            record.setSocketSessionId(id);
            record.setUsername(actor.username());
            record.setConnectedAt(Instant.now());
            sessions.save(record);
            actors.put(id, actor);
            client.sendEvent("ready", Map.of());
        } catch (RuntimeException ex) {
            actors.remove(id);
            client.disconnect();
        }
    }

    @OnDisconnect
    public void disconnected(SocketIOClient client) { disconnectedById(client.getSessionId().toString()); }

    @EventListener
    public void changed(ChatChangedEvent event) {
        sessions.findAllByUsernameIn(event.recipients()).forEach(recipient -> {
            String id = recipient.getSocketSessionId();
            SocketIOClient client = server.getAllClients().stream()
                    .filter(candidate -> candidate.getSessionId().toString().equals(id)).findFirst().orElse(null);
            ChatActor actor = actors.get(id);
            if (client == null || actor == null) { disconnectedById(id); return; }
            try {
                authentication.authenticate(actor.authorization());
                client.sendEvent("message", json.writeValueAsString(Map.of("conversationId", event.conversationId())));
            } catch (RuntimeException | JsonProcessingException ex) {
                client.disconnect();
                disconnectedById(id);
            }
        });
    }

    @Scheduled(fixedDelayString="${ccadro.socket.heartbeat-ms:25000}")
    public void heartbeat() {
        actors.forEach((id, actor) -> {
            SocketIOClient client = server.getAllClients().stream()
                    .filter(candidate -> candidate.getSessionId().toString().equals(id)).findFirst().orElse(null);
            if (client == null) { disconnectedById(id); return; }
            try {
                authentication.authenticate(actor.authorization());
                client.sendEvent("heartbeat", Map.of("at", Instant.now().toString()));
            } catch (RuntimeException ex) {
                client.disconnect();
                disconnectedById(id);
            }
        });
    }

    private void disconnectedById(String id) {
        actors.remove(id);
        sessions.deleteBySocketSessionId(id);
    }
}
