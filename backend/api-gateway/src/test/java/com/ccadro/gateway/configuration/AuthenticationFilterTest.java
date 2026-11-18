package com.ccadro.gateway.configuration;

import com.ccadro.gateway.dto.ApiResponse;
import com.ccadro.gateway.dto.response.IntrospectResponse;
import com.ccadro.gateway.service.IdentityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.ReactiveValueOperations;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationFilterTest {

        @Mock
        IdentityService identityService;

        @Mock
        GatewayFilterChain filterChain;

        AuthenticationFilter filter;

        @BeforeEach
        void setUp() {
                filter = new AuthenticationFilter(identityService, new ObjectMapper());
                filter.apiPrefix = "/api/v1";
        }

        @Test
        void filter_shouldRejectProtectedEndpointsWithoutBearerToken() {
                MockServerWebExchange exchange = MockServerWebExchange.from(
                                MockServerHttpRequest.get("/api/v1/shipments")
                                                .header("X-Auth-Username", "spoofed_admin")
                                                .header("X-Auth-Scope", "ROLE_ADMIN")
                                                .build());

                StepVerifier.create(filter.filter(exchange, filterChain))
                                .verifyComplete();

                assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
                verifyNoInteractions(filterChain);
        }

        @Test
        void filter_shouldStripSpoofedHeadersOnPublicEndpointsAndInjectTrustedClaimsOnValidJwt() {
                when(filterChain.filter(any())).thenReturn(Mono.empty());

                // 1. Public endpoint (/api/v1/auth/register &
                // /actuator/health)
                MockServerWebExchange publicEx = MockServerWebExchange.from(
                                MockServerHttpRequest.get("/actuator/health")
                                                .header("X-Auth-Scope", "ROLE_ADMIN")
                                                .header("X-Auth-Hub-Code", "HUB-AMATA-BH")
                                                .build());
                StepVerifier.create(filter.filter(publicEx, filterChain)).verifyComplete();

                ArgumentCaptor<ServerWebExchange> publicCaptor = ArgumentCaptor.forClass(ServerWebExchange.class);
                verify(filterChain, times(1)).filter(publicCaptor.capture());
                assertNull(publicCaptor.getValue().getRequest().getHeaders().getFirst("X-Auth-Scope"));
                assertNull(publicCaptor.getValue().getRequest().getHeaders().getFirst("X-Auth-Hub-Code"));

                // 2. Protected endpoint with valid JWT overwrites any spoofed headers with
                // introspected claims
                when(identityService.introspect("valid-jwt-token")).thenReturn(Mono.just(
                                ApiResponse.<IntrospectResponse>builder()
                                                .code(1000)
                                                .result(IntrospectResponse.builder()
                                                                .valid(true)
                                                                .username("shipper")
                                                                .scope("ROLE_HUB_SHIPPER POD_PHOTO_SUBMIT")
                                                                .assignedHubCode("HUB-DINHBANG-BN")
                                                                .assignedShipperCode("SHP-BN-001")
                                                                .build())
                                                .build()));

                MockServerWebExchange protectedEx = MockServerWebExchange.from(
                                MockServerHttpRequest.post("/api/v1/hub-shipper/items/PKG-DB-0001/pod")
                                                .header(HttpHeaders.AUTHORIZATION, "Bearer valid-jwt-token")
                                                .header("X-Auth-Scope", "ROLE_ADMIN")
                                                .header("X-Auth-Hub-Code", "HUB-AMATA-BH")
                                                .build());
                StepVerifier.create(filter.filter(protectedEx, filterChain)).verifyComplete();

                verify(filterChain, times(2)).filter(publicCaptor.capture());
                HttpHeaders downstreamHeaders = publicCaptor.getValue().getRequest().getHeaders();
                assertEquals("shipper", downstreamHeaders.getFirst("X-Auth-Username"));
                assertEquals("ROLE_HUB_SHIPPER POD_PHOTO_SUBMIT", downstreamHeaders.getFirst("X-Auth-Scope"));
                assertEquals("HUB-DINHBANG-BN", downstreamHeaders.getFirst("X-Auth-Hub-Code"));
                assertEquals("SHP-BN-001", downstreamHeaders.getFirst("X-Auth-Shipper-Code"));
                // 3. CORS preflight OPTIONS requests pass through after stripping spoofed
                // headers
                MockServerWebExchange preflightEx = MockServerWebExchange.from(
                                MockServerHttpRequest.options("/api/v1/shipments")
                                                .header("X-Auth-Scope", "ROLE_ADMIN")
                                                .build());
                StepVerifier.create(filter.filter(preflightEx, filterChain)).verifyComplete();
                verify(filterChain, times(3)).filter(publicCaptor.capture());
                assertNull(publicCaptor.getValue().getRequest().getHeaders().getFirst("X-Auth-Scope"));

                // 4. SSE query tokens are authenticated, then checked against the role matrix.
                MockServerWebExchange sseEx = MockServerWebExchange.from(
                                MockServerHttpRequest.get("/api/v1/notifications/stream?token=valid-jwt-token")
                                                .header("X-Auth-Scope", "ROLE_ADMIN")
                                                .build());
                StepVerifier.create(filter.filter(sseEx, filterChain)).verifyComplete();
                assertEquals(HttpStatus.FORBIDDEN, sseEx.getResponse().getStatusCode());

                MockServerWebExchange trackingSseEx = MockServerWebExchange.from(
                                MockServerHttpRequest.get("/api/v1/tracking/stream?token=valid-jwt-token")
                                                .build());
                StepVerifier.create(filter.filter(trackingSseEx, filterChain)).verifyComplete();
                assertEquals(HttpStatus.FORBIDDEN, trackingSseEx.getResponse().getStatusCode());
        }
        @Test
        void socketIoPollingAndUpgradeRequireOneUseTicket() {
                when(filterChain.filter(any())).thenReturn(Mono.empty());
                for (HttpMethod method : new HttpMethod[] {HttpMethod.GET, HttpMethod.POST}) {
                    var polling = MockServerWebExchange.from(MockServerHttpRequest.method(method,
                            "/api/v1/chat/socket.io/?ticket=one-use&EIO=4&transport=polling").build());
                    StepVerifier.create(filter.filter(polling, filterChain)).verifyComplete();
                }
                var upgrade = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/chat/socket.io/?ticket=one-use&EIO=4&transport=websocket")
                        .header("Upgrade", "websocket").header("X-Auth-Username", "spoofed").build());
                StepVerifier.create(filter.filter(upgrade, filterChain)).verifyComplete();
                var captor = ArgumentCaptor.forClass(ServerWebExchange.class);
                verify(filterChain, times(3)).filter(captor.capture());
                assertTrue(captor.getAllValues().stream().allMatch(exchange ->
                        exchange.getRequest().getHeaders().getFirst("X-Auth-Username") == null));
                verifyNoInteractions(identityService);
                for (String path : new String[] {"/api/v1/chat/socket-ticket", "/api/v1/chat/socket.io/", "/api/v1/chat/conversations"}) {
                    var http = MockServerWebExchange.from(MockServerHttpRequest.get(path).build());
                    StepVerifier.create(filter.filter(http, filterChain)).verifyComplete();
                    assertEquals(HttpStatus.UNAUTHORIZED, http.getResponse().getStatusCode());
                }
        }

        @Test
        void enforcesRoleMatrixAtGatewayAfterTrustedTokenIntrospection() {
                when(identityService.introspect("customer-token")).thenReturn(Mono.just(
                                ApiResponse.<IntrospectResponse>builder().result(IntrospectResponse.builder()
                                                .valid(true).username("customer-a").scope("ROLE_CUSTOMER")
                                                .customerId("COMPANY-A").build()).build()));
                when(identityService.introspect("dispatcher-token")).thenReturn(Mono.just(
                                ApiResponse.<IntrospectResponse>builder().result(IntrospectResponse.builder()
                                                .valid(true).username("dispatcher").scope("ROLE_DISPATCHER").build()).build()));
                when(filterChain.filter(any())).thenReturn(Mono.empty());

                var allowedOwnShipments = MockServerWebExchange.from(MockServerHttpRequest.get(
                                "/api/v1/shipments/customer/COMPANY-A")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer customer-token").build());
                StepVerifier.create(filter.filter(allowedOwnShipments, filterChain)).verifyComplete();
                assertNull(allowedOwnShipments.getResponse().getStatusCode());

                var createShipment = MockServerWebExchange.from(MockServerHttpRequest.post("/api/v1/shipments")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer customer-token").build());
                StepVerifier.create(filter.filter(createShipment, filterChain)).verifyComplete();

                var crossCompanyShipments = MockServerWebExchange.from(MockServerHttpRequest.get(
                                "/api/v1/shipments/customer/COMPANY-B")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer customer-token").build());
                StepVerifier.create(filter.filter(crossCompanyShipments, filterChain)).verifyComplete();
                assertEquals(HttpStatus.FORBIDDEN, crossCompanyShipments.getResponse().getStatusCode());

                var customerWritesDispatch = MockServerWebExchange.from(MockServerHttpRequest.post(
                                "/api/v1/shipments/dispatch")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer customer-token").build());
                StepVerifier.create(filter.filter(customerWritesDispatch, filterChain)).verifyComplete();
                assertEquals(HttpStatus.FORBIDDEN, customerWritesDispatch.getResponse().getStatusCode());

                var dispatcherPlansRoute = MockServerWebExchange.from(MockServerHttpRequest.post(
                                "/api/v1/routing/plan")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer dispatcher-token").build());
                StepVerifier.create(filter.filter(dispatcherPlansRoute, filterChain)).verifyComplete();
                assertNull(dispatcherPlansRoute.getResponse().getStatusCode());
                verify(filterChain, times(3)).filter(any());
        }

        @Test
        @SuppressWarnings("unchecked")
        void filter_shouldRejectBlacklistedJwtViaRedisWithoutCallingIdentityService() {
                ReactiveStringRedisTemplate redisTemplate = mock(ReactiveStringRedisTemplate.class);
                ReactiveValueOperations<String, String> valueOps = mock(ReactiveValueOperations.class);
                when(redisTemplate.opsForValue()).thenReturn(valueOps);
                when(redisTemplate.hasKey("ccadro:auth:bl:jti:jti-revoked-001")).thenReturn(Mono.just(true));
                when(redisTemplate.hasKey("ccadro:auth:session:revoked:sid-001")).thenReturn(Mono.just(false));
                when(valueOps.get("ccadro:auth:revoked_before:admin")).thenReturn(Mono.empty());

                AuthenticationFilter redisFilter = new AuthenticationFilter(
                        identityService, new ObjectMapper(), redisTemplate);
                redisFilter.apiPrefix = "/api/v1";

                String payloadJson = "{\"sub\":\"admin\",\"jti\":\"jti-revoked-001\",\"sid\":\"sid-001\",\"iat\":1763370000}";
                String encodedPayload = java.util.Base64.getUrlEncoder().withoutPadding()
                        .encodeToString(payloadJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                String fakeJwt = "eyJhbGciOiJIUzUxMiJ9." + encodedPayload + ".sig";

                MockServerWebExchange ex = MockServerWebExchange.from(
                        MockServerHttpRequest.get("/api/v1/shipments")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + fakeJwt)
                                .build());

                StepVerifier.create(redisFilter.filter(ex, filterChain)).verifyComplete();

                assertEquals(HttpStatus.UNAUTHORIZED, ex.getResponse().getStatusCode());
                verifyNoInteractions(identityService);
                verifyNoInteractions(filterChain);
        }

}
