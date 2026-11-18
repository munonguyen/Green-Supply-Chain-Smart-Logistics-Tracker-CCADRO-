package com.ccadro.chat.service;

import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.exception.ErrorCode;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Local single-use tickets avoid exposing a long-lived JWT in URLs or subprotocols. */
@Service
public class ChatTicketService {
    private record Ticket(ChatActor actor, Instant expiresAt) {}
    public record TicketResponse(String ticket, int expiresInSeconds) {}
    private final Map<String, Ticket> tickets = new HashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    public ChatTicketService() { this(Clock.systemUTC()); }
    public ChatTicketService(Clock clock) { this.clock = clock; }

    public synchronized TicketResponse issue(ChatActor actor) {
        tickets.values().removeIf(t -> !t.expiresAt().isAfter(clock.instant()));
        if (tickets.size() >= 4096) throw AppException.invalidRequest("Quá nhiều yêu cầu kết nối chat, vui lòng thử lại");
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tickets.put(value, new Ticket(actor, clock.instant().plusSeconds(30)));
        return new TicketResponse(value, 30);
    }

    public synchronized ChatActor consume(String value) {
        if (value == null || value.length() != 43) throw new AppException(ErrorCode.INVALID_SESSION);
        Ticket ticket = tickets.remove(value);
        if (ticket == null || !ticket.expiresAt().isAfter(clock.instant())) throw new AppException(ErrorCode.INVALID_SESSION);
        return ticket.actor();
    }
}
