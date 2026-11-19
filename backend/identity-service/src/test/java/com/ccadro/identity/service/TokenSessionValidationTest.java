package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.IntrospectRequest;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.entity.UserSession;
import com.ccadro.identity.repository.*;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TokenSessionValidationTest {
    private static final String KEY = "a".repeat(128);
    private final UserRepository users = mock(UserRepository.class);
    private final UserSessionRepository sessions = mock(UserSessionRepository.class);
    private final UUID userId = UUID.randomUUID();
    private final UUID sessionId = UUID.randomUUID();
    private AuthenticationService service;
    private String token;

    @BeforeEach void setUp() throws Exception {
        service = new AuthenticationService(users, mock(InvalidatedTokenRepository.class), mock(HubIamAccountRepository.class),
                mock(HubAuthAuditLogRepository.class), mock(RoleRepository.class), new BCryptPasswordEncoder(), sessions, null);
        service.SIGNER_KEY = KEY;
        User user = User.builder().id(userId).username("driver").status("ACTIVE")
                .roles(Set.of(Role.builder().name("DRIVER").build())).build();
        when(users.findByUsername("driver")).thenReturn(Optional.of(user));
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), new JWTClaimsSet.Builder()
                .subject("driver").issuer("ccadro.com").jwtID(UUID.randomUUID().toString())
                .issueTime(Date.from(Instant.now())).expirationTime(Date.from(Instant.now().plusSeconds(600)))
                .claim("sid", sessionId.toString()).build());
        jwt.sign(new MACSigner(KEY));
        token = jwt.serialize();
    }

    private UserSession session() {
        return UserSession.builder().id(sessionId).userId(userId).username("driver")
                .expiresAt(Instant.now().plusSeconds(600)).build();
    }

    @Test void rejectsDeletedOrMissingSession() {
        when(sessions.findById(sessionId)).thenReturn(Optional.empty());
        assertFalse(service.introspect(new IntrospectRequest(token)).isValid());
    }

    @Test void rejectsSessionBelongingToAnotherUserAndExpiredOrRevokedSessions() {
        UserSession other = session(); other.setUserId(UUID.randomUUID());
        UserSession expired = session(); expired.setExpiresAt(Instant.now().minusSeconds(1));
        UserSession revoked = session(); revoked.setRevoked(true);
        for (UserSession invalid : List.of(other, expired, revoked)) {
            when(sessions.findById(sessionId)).thenReturn(Optional.of(invalid));
            assertFalse(service.introspect(new IntrospectRequest(token)).isValid());
        }
    }

    @Test void acceptsOnlyExistingActiveSessionBoundToAuthenticatedUser() {
        when(sessions.findById(sessionId)).thenReturn(Optional.of(session()));
        assertTrue(service.introspect(new IntrospectRequest(token)).isValid());
    }
}
