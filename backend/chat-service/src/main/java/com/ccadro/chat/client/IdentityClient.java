package com.ccadro.chat.client;

import com.ccadro.chat.dto.response.ContactResponse;
import com.ccadro.chat.dto.response.IntrospectionResponse;
import com.ccadro.chat.exception.AppException;
import com.ccadro.chat.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** HTTP transport to Identity only. Authentication policy belongs to ChatAuthenticationService. */
@Component
public class IdentityClient {
    private final RestClient client;

    public IdentityClient(@Qualifier("identityRestClient") RestClient client) {
        this.client = client;
    }

    public IntrospectionResponse introspect(String token) {
        try {
            JsonNode response = client.post().uri("/api/v1/auth/introspect")
                    .body(Map.of("token", token)).retrieve().body(JsonNode.class);
            JsonNode claims = response == null ? null : response.get("result");
            return claims == null ? new IntrospectionResponse(false, "", "")
                    : new IntrospectionResponse(claims.path("valid").asBoolean(),
                            claims.path("username").asText(), claims.path("scope").asText());
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.IDENTITY_UNAVAILABLE);
        }
    }

    public List<ContactResponse> directory(String authorization) {
        try {
            JsonNode response = client.get().uri("/api/v1/auth/chat-directory")
                    .header("Authorization", authorization).retrieve().body(JsonNode.class);
            if (response == null || !response.path("result").isArray()) {
                throw new AppException(ErrorCode.DIRECTORY_UNAVAILABLE);
            }
            List<ContactResponse> contacts = new ArrayList<>();
            for (JsonNode user : response.path("result")) {
                contacts.add(new ContactResponse(user.path("username").asText(),
                        user.path("fullName").asText(), user.path("role").asText()));
            }
            return contacts;
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.DIRECTORY_UNAVAILABLE);
        }
    }
}
