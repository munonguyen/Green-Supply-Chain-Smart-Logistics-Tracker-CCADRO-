package com.ccadro.chat.service;

import com.ccadro.chat.client.IdentityClient;
import com.ccadro.chat.dto.response.IntrospectionResponse;
import com.ccadro.chat.exception.AppException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatAuthenticationServiceTest {
    private final IdentityClient identity = mock(IdentityClient.class);
    private final ChatAuthenticationService service = new ChatAuthenticationService(identity);

    @Test
    void missingAuthorizationNeverCallsIdentity() {
        assertThatThrownBy(() -> service.authenticate(null)).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.authenticate("Basic alice")).isInstanceOf(AppException.class);
        verifyNoInteractions(identity);
    }

    @Test
    void revokedIdentityCannotBecomeAnActor() {
        when(identity.introspect("revoked")).thenReturn(new IntrospectionResponse(false, "alice", "ROLE_ADMIN"));
        assertThatThrownBy(() -> service.authenticate("Bearer revoked")).isInstanceOf(AppException.class);
    }

    @Test
    void actorUsesVerifiedClaimsAndDoesNotPrintBearerInDebugOutput() {
        when(identity.introspect("private-token"))
                .thenReturn(new IntrospectionResponse(true, "alice", "READ\tROLE_CUSTOMER"));
        var actor = service.authenticate("Bearer private-token");
        assertThat(actor.username()).isEqualTo("alice");
        assertThat(actor.role()).isEqualTo("CUSTOMER");
        assertThat(actor.authorization()).isEqualTo("Bearer private-token");
        assertThat(actor.toString()).doesNotContain("private-token", "Bearer");
    }
}
