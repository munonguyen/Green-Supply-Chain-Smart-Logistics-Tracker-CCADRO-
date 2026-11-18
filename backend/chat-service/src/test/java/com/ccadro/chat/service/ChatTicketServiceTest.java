package com.ccadro.chat.service;

import com.ccadro.chat.dto.ChatActor;
import java.time.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatTicketServiceTest {
    @Test void ticketsExpireAndCannotBeReplayed() {
        Clock clock = mock(Clock.class);
        Instant start = Instant.parse("2026-01-01T00:00:00Z");
        when(clock.instant()).thenReturn(start);
        var tickets = new ChatTicketService(clock);
        var actor = new ChatActor("alice", "CUSTOMER", "Bearer secret");
        String valid = tickets.issue(actor).ticket();
        assertThat(valid).hasSize(43).doesNotContain("secret");
        assertThat(tickets.consume(valid)).isEqualTo(actor);
        assertThatThrownBy(() -> tickets.consume(valid)).isInstanceOf(com.ccadro.chat.exception.AppException.class);
        String expired = tickets.issue(actor).ticket();
        when(clock.instant()).thenReturn(start.plusSeconds(30));
        assertThatThrownBy(() -> tickets.consume(expired)).isInstanceOf(com.ccadro.chat.exception.AppException.class);
    }
}
