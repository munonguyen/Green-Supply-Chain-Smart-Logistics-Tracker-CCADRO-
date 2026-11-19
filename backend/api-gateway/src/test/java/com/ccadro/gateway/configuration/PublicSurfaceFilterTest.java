package com.ccadro.gateway.configuration;

import com.ccadro.gateway.service.IdentityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.test.StepVerifier;
import java.net.URI;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import static org.mockito.Mockito.verifyNoInteractions;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PublicSurfaceFilterTest {
    @Autowired WebTestClient http;
    @MockBean IdentityService identity;

    @Test
    void hidesManagementAndInternalEndpointsEvenWithSpoofedAdminHeadersOrBearer() {
        for (String path : new String[] {"/internal/payment-evidence", "/api/v1/internal/commands",
                "/actuator/health", "/api/v1/actuator/env", "/v3/api-docs", "/swagger-ui.html",
                "/swagger-ui/index.html", "/services/assets/v3/api-docs", "/api/v1/notifications/email"}) {
            http.get().uri(path).header("Authorization", "Bearer anything")
                    .header("X-Auth-Scope", "ROLE_ADMIN").exchange()
                    .expectStatus().isNotFound().expectHeader().valueEquals("Cache-Control", "no-store");
        }
        // The boundary must cover write requests as well as normal page navigation.
        http.post().uri("/api/v1/notifications/email").exchange().expectStatus().isNotFound();
        verifyNoInteractions(identity);
    }

    @Test
    void businessApiRequiresBearerAndNeverRedirectsToHtmlLogin() {
        http.get().uri("/api/v1/assets/containers").exchange().expectStatus().isUnauthorized()
                .expectHeader().valueEquals("WWW-Authenticate", "Bearer realm=\"ccadro\"")
                .expectHeader().doesNotExist("Location").expectBody().jsonPath("$.code").isEqualTo(1401);
        verifyNoInteractions(identity);
    }

    @Test
    void encodedSeparatorsAndMatrixParametersCannotBypassTheSurfaceBoundary() {
        PublicSurfaceFilter filter = new PublicSurfaceFilter();
        for (String path : new String[] {"/api/v1/%69nternal/commands", "/services%2fassets/v3/api-docs",
                "/api/v1/assets/../internal/commands", "/api/v1/assets;internal/vehicles",
                "/api/v1/%252e%252e/actuator/env"}) {
            var exchange = MockServerWebExchange.from(MockServerHttpRequest.method(HttpMethod.GET, URI.create(path)).build());
            StepVerifier.create(filter.filter(exchange, ignored -> {
                throw new AssertionError("Hidden path reached downstream: " + path);
            })).verifyComplete();
            assertEquals(HttpStatus.NOT_FOUND, exchange.getResponse().getStatusCode());
        }
    }
}
