package com.ccadro.gateway.configuration;

import com.ccadro.gateway.dto.ApiResponse;
import com.ccadro.gateway.dto.response.IntrospectResponse;
import com.ccadro.gateway.service.IdentityService;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChatRouteTest {
    static HttpServer chat;
    static volatile String forwardedToken, forwardedUser;
    @MockBean IdentityService identity;
    @Autowired WebTestClient http;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) throws Exception {
        chat=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        chat.createContext("/api/v1/chat/conversations", exchange -> {
            forwardedToken=exchange.getRequestHeaders().getFirst("Authorization");
            forwardedUser=exchange.getRequestHeaders().getFirst("X-Auth-Username");
            byte[] bytes="{\"code\":1000,\"result\":[]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin","http://localhost:5173");
            exchange.sendResponseHeaders(200,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });
        chat.start();
        registry.add("CHAT_SERVICE_URL", () -> "http://127.0.0.1:"+chat.getAddress().getPort());
    }
    @AfterAll static void stop() { chat.stop(0); }
    @Test void realGatewayRouteRequiresJwtAndPreservesBearerForChatRevalidation() {
        http.get().uri("/api/v1/chat/conversations").exchange().expectStatus().isUnauthorized();
        when(identity.introspect("valid-token")).thenReturn(Mono.just(ApiResponse.<IntrospectResponse>builder()
                .code(1000).result(IntrospectResponse.builder().valid(true).username("alice").scope("ROLE_CUSTOMER").build()).build()));
        http.get().uri("/api/v1/chat/conversations").header("Authorization","Bearer valid-token")
                .header("X-Auth-Username","spoofed").header("Origin", "http://localhost:5173").exchange().expectStatus().isOk()
                .expectHeader().values("Access-Control-Allow-Origin", values -> assertEquals(1, values.size()))
                .expectBody().jsonPath("$.result.length()").isEqualTo(0);
        assertEquals("Bearer valid-token",forwardedToken);
        assertEquals("alice",forwardedUser);
    }
}
