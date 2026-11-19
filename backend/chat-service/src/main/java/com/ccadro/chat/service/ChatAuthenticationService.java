package com.ccadro.chat.service;

import com.ccadro.chat.client.IdentityClient;
import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.exception.ErrorCode;
import java.util.Arrays;
import org.springframework.stereotype.Service;

@Service
public class ChatAuthenticationService {
    private final IdentityClient identityClient;

    public ChatAuthenticationService(IdentityClient identityClient) {
        this.identityClient = identityClient;
    }

    public ChatActor authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() > 8192) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        var claims = identityClient.introspect(authorization.substring(7));
        if (claims == null || !claims.valid() || claims.username() == null || claims.username().isBlank()
                || claims.scope() == null || claims.scope().isBlank()) {
            throw new AppException(ErrorCode.INVALID_SESSION);
        }
        String role = Arrays.stream(claims.scope().split("\\s+"))
                .filter(s -> s.startsWith("ROLE_")).sorted().findFirst().orElse("ROLE_USER").substring(5);
        return new ChatActor(claims.username(), role, authorization);
    }
}
