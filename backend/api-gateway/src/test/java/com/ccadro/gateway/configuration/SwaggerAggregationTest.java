package com.ccadro.gateway.configuration;

import com.ccadro.gateway.service.IdentityService;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SwaggerAggregationTest {

    static HttpServer mockChat;

    @MockBean
    IdentityService identityService;

    @Autowired
    WebTestClient webTestClient;

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) throws Exception {
        mockChat = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        mockChat.createContext("/v3/api-docs", exchange -> {
            byte[] bytes = "{\"openapi\":\"3.0.1\",\"info\":{\"title\":\"Chat Mock\"}}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        mockChat.start();
        registry.add("CHAT_SERVICE_URL", () -> "http://127.0.0.1:" + mockChat.getAddress().getPort());
    }

    @AfterAll
    static void tearDown() {
        if (mockChat != null) {
            mockChat.stop(0);
        }
    }

    @Test
    void swaggerConfigExposesAllElevenMicroservicesPublicly() {
        webTestClient.get()
                .uri("/v3/api-docs/swagger-config")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.urls.length()").isEqualTo(11)
                .jsonPath("$.urls[?(@.url == '/services/identity/v3/api-docs')]").isNotEmpty()
                .jsonPath("$.urls[?(@.url == '/services/payments/v3/api-docs')]").isNotEmpty()
                .jsonPath("$.urls[?(@.url == '/services/hub-shipper/v3/api-docs')]").isNotEmpty()
                .jsonPath("$.urls[?(@.url == '/services/chat/v3/api-docs')]").isNotEmpty();
    }

    @Test
    void downstreamServiceApiDocsRouteIsAccessibleWithoutJwt() {
        webTestClient.get()
                .uri("/services/chat/v3/api-docs")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.openapi").isEqualTo("3.0.1");
    }
}
