package com.ccadro.gateway.configuration;

import com.ccadro.gateway.dto.ApiResponse;
import com.ccadro.gateway.dto.response.IntrospectResponse;
import com.ccadro.gateway.service.IdentityService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
@Slf4j
@FieldDefaults(level = AccessLevel.PACKAGE, makeFinal = true)
public class AuthenticationFilter implements GlobalFilter, Ordered {
    private static final String JTI_BLACKLIST_PREFIX = "ccadro:auth:bl:jti:";
    private static final String SESSION_REVOKED_PREFIX = "ccadro:auth:session:revoked:";
    private static final String USER_REVOKED_BEFORE_PREFIX = "ccadro:auth:revoked_before:";

    IdentityService identityService;
    ObjectMapper objectMapper;
    ReactiveStringRedisTemplate reactiveRedisTemplate;

    public AuthenticationFilter(IdentityService identityService, ObjectMapper objectMapper) {
        this(identityService, objectMapper, null);
    }

    @Autowired
    public AuthenticationFilter(
            IdentityService identityService,
            ObjectMapper objectMapper,
            @Autowired(required = false) ReactiveStringRedisTemplate reactiveRedisTemplate) {
        this.identityService = identityService;
        this.objectMapper = objectMapper;
        this.reactiveRedisTemplate = reactiveRedisTemplate;
    }

    @NonFinal
    String[] publicEndpoints = {
            "/auth/token",
            "/auth/refresh",
            "/auth/introspect",
            "/auth/logout",
            "/auth/register",
            "/careers/apply",
            "/careers/status",
            "/careers/openings",
            "/payments/webhook/.*",
            "/health.*",
            "/actuator/.*"
    };

    @Value("${app.api-prefix:/api/v1}")
    @NonFinal
    String apiPrefix;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        log.debug("Enter authentication filter for path: {}", exchange.getRequest().getURI().getPath());

        // Prevent client header spoofing by clearing internal identity headers on all requests
        ServerHttpRequest sanitizedRequest = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove("X-Auth-Username");
                    headers.remove("X-Auth-Email");
                    headers.remove("X-Internal-Token");
                    headers.remove("X-Auth-Scope");
                    headers.remove("X-Auth-Hub-Code");
                    headers.remove("X-Auth-Shipper-Code");
                    headers.remove("X-Auth-Session-Id");
                })
                .build();

        if (isPublicEndpoint(sanitizedRequest)) {
            return chain.filter(exchange.mutate().request(sanitizedRequest).build());
        }

        String path = sanitizedRequest.getURI().getPath();
        String token = null;
        List<String> authHeader = sanitizedRequest.getHeaders().get(HttpHeaders.AUTHORIZATION);
        if (!CollectionUtils.isEmpty(authHeader)) {
            token = authHeader.get(0).replace("Bearer ", "").trim();
        } else if (path.equals(apiPrefix + "/notifications/stream")
                || path.equals(apiPrefix + "/tracking/stream")) {
            // Browser EventSource cannot set Authorization headers, so SSE stream allows ?token=<jwt>
            String queryToken = sanitizedRequest.getQueryParams().getFirst("token");
            if (queryToken != null && !queryToken.isBlank()) {
                token = queryToken.trim();
            }
        }
        if (token == null || token.isBlank()) {
            return unauthenticated(exchange.getResponse());
        }

        final String rawToken = token;
        return isRevokedInRedis(rawToken).flatMap(revoked -> {
            if (Boolean.TRUE.equals(revoked)) {
                log.debug("Gateway rejected revoked JWT via Redis Hot-Blacklist");
                return unauthenticated(exchange.getResponse());
            }
            return identityService.introspect(rawToken).flatMap(introspectResponse -> {
                IntrospectResponse claims = introspectResponse != null ? introspectResponse.getResult() : null;
                if (claims != null && claims.isValid()) {
                    if (!isAuthorized(path, sanitizedRequest.getMethod(), claims.getScope(), claims.getCustomerId())) {
                        return forbidden(exchange.getResponse());
                    }
                    ServerHttpRequest authenticatedRequest = sanitizedRequest.mutate()
                            .header("X-Auth-Email", claims.getEmail() != null ? claims.getEmail() : "")
                            .header("X-Auth-Username", claims.getUsername() != null ? claims.getUsername() : "")
                            .header("X-Auth-Scope", claims.getScope() != null ? claims.getScope() : "")
                            .header("X-Auth-Hub-Code", claims.getAssignedHubCode() != null ? claims.getAssignedHubCode() : "")
                            .header("X-Auth-Shipper-Code", claims.getAssignedShipperCode() != null ? claims.getAssignedShipperCode() : "")
                            .header("X-Auth-Customer-Id", claims.getCustomerId() != null ? claims.getCustomerId() : "")
                            .header("X-Auth-Session-Id", claims.getSessionId() != null ? claims.getSessionId() : "")
                            .build();
                    return chain.filter(exchange.mutate().request(authenticatedRequest).build());
                }
                return unauthenticated(exchange.getResponse());
            }).onErrorResume(throwable -> unauthenticated(exchange.getResponse()));
        });
    }

    /**
     * Kiểm tra nhanh O(1) trên Redis trước khi forward sang Identity Service:
     * 1) JTI có nằm trong Redis Blacklist không
     * 2) Session ID (sid) đã bị thu hồi chưa
     * 3) User đã đổi mật khẩu / logout-all sau thời điểm phát hành JWT (iat) chưa
     */
    private Mono<Boolean> isRevokedInRedis(String token) {
        if (reactiveRedisTemplate == null || token == null || token.isBlank()) {
            return Mono.just(false);
        }
        JwtPayloadPeek peek = peekJwtPayload(token);
        if (peek == null) {
            return Mono.just(false);
        }

        Mono<Boolean> jtiCheck = (peek.jti != null && !peek.jti.isBlank())
                ? reactiveRedisTemplate.hasKey(JTI_BLACKLIST_PREFIX + peek.jti).onErrorReturn(false)
                : Mono.just(false);

        Mono<Boolean> sidCheck = (peek.sid != null && !peek.sid.isBlank())
                ? reactiveRedisTemplate.hasKey(SESSION_REVOKED_PREFIX + peek.sid).onErrorReturn(false)
                : Mono.just(false);

        Mono<Boolean> userRevokedCheck = (peek.sub != null && !peek.sub.isBlank() && peek.iatSec > 0)
                ? reactiveRedisTemplate.opsForValue()
                        .get(USER_REVOKED_BEFORE_PREFIX + peek.sub.toLowerCase(Locale.ROOT).trim())
                        .map(val -> {
                            try {
                                return peek.iatSec < Long.parseLong(val.trim());
                            } catch (NumberFormatException ignored) {
                                return false;
                            }
                        })
                        .defaultIfEmpty(false)
                        .onErrorReturn(false)
                : Mono.just(false);

        return Mono.zip(jtiCheck, sidCheck, userRevokedCheck)
                .map(tuple -> Boolean.TRUE.equals(tuple.getT1())
                        || Boolean.TRUE.equals(tuple.getT2())
                        || Boolean.TRUE.equals(tuple.getT3()))
                .onErrorReturn(false);
    }

    private JwtPayloadPeek peekJwtPayload(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode node = objectMapper.readTree(new String(decoded, StandardCharsets.UTF_8));
            String jti = node.hasNonNull("jti") ? node.get("jti").asText() : null;
            String sid = node.hasNonNull("sid") ? node.get("sid").asText() : null;
            String sub = node.hasNonNull("sub") ? node.get("sub").asText() : null;
            long iatSec = node.hasNonNull("iat") ? node.get("iat").asLong(0) : 0;
            return new JwtPayloadPeek(jti, sid, sub, iatSec);
        } catch (Exception ignored) {
            return null;
        }
    }

    private record JwtPayloadPeek(String jti, String sid, String sub, long iatSec) {}

    private boolean isAuthorized(String path, HttpMethod method, String scope, String customerId) {
        Set<String> roles = new java.util.HashSet<>();
        if (scope != null) {
            Arrays.stream(scope.split("\\s+")).filter(token -> token.startsWith("ROLE_"))
                    .map(token -> token.substring(5)).forEach(roles::add);
        }
        if (roles.contains("ADMIN")) return true;
        String verb = method != null ? method.name() : "GET";

        if (path.startsWith(apiPrefix + "/users") || path.startsWith(apiPrefix + "/roles")
                || path.startsWith(apiPrefix + "/permissions") || path.startsWith(apiPrefix + "/companies")
                || path.startsWith(apiPrefix + "/branches") || path.startsWith(apiPrefix + "/staff")) {
            return path.equals(apiPrefix + "/users/me") || roles.contains("DISPATCHER")
                    || roles.contains("SAFETY_MANAGER") || roles.contains("ESG_AUDITOR");
        }
        if (path.startsWith(apiPrefix + "/auth/hub-accounts")) {
            return roles.contains("HUB_MANAGER") || roles.contains("HUB_AUDITOR");
        }
        if (path.startsWith(apiPrefix + "/shipments")) {
            if (path.contains("/customer/")) {
                String requestedCustomer = path.substring(path.indexOf("/customer/") + "/customer/".length());
                return roles.contains("CUSTOMER") && customerId != null && !customerId.isBlank()
                        && requestedCustomer.equalsIgnoreCase(customerId);
            }
            if (verb.equals("POST") && path.equals(apiPrefix + "/shipments"))
                return roles.contains("CUSTOMER") || roles.contains("DISPATCHER");
            return verb.equals("GET") ? roles.contains("DISPATCHER") || roles.contains("ESG_AUDITOR")
                    : roles.contains("DISPATCHER");
        }
        if (path.startsWith(apiPrefix + "/routing") || path.startsWith(apiPrefix + "/routes")) {
            return roles.contains("DISPATCHER") || roles.contains("ESG_AUDITOR");
        }
        if (path.startsWith(apiPrefix + "/tracking")) {
            if (path.contains("/telemetry")) return roles.contains("DRIVER");
            if (path.contains("/reroute-proposals/") && path.endsWith("/decision")) return roles.contains("DISPATCHER");
            if (path.endsWith("/start") || path.endsWith("/complete")) return roles.contains("DISPATCHER");
            return roles.contains("DISPATCHER") || roles.contains("SAFETY_MANAGER")
                    || roles.contains("ESG_AUDITOR");
        }
        if (path.startsWith(apiPrefix + "/assets")) return authorizeAssets(path, verb, roles);
        if (path.startsWith(apiPrefix + "/incidents")) {
            if (path.endsWith("/resolve") || path.contains("/demerits/") && path.endsWith("/review"))
                return roles.contains("SAFETY_MANAGER");
            if (verb.equals("POST")) return roles.contains("DRIVER");
            return roles.contains("DISPATCHER") || roles.contains("SAFETY_MANAGER");
        }
        if (path.startsWith(apiPrefix + "/carbon")) {
            if (verb.equals("GET")) return roles.contains("DISPATCHER") || roles.contains("ESG_AUDITOR")
                    || roles.contains("CUSTOMER");
            return roles.contains("DISPATCHER") || roles.contains("ESG_AUDITOR") || roles.contains("DRIVER");
        }
        if (path.startsWith(apiPrefix + "/notifications")) {
            if (path.endsWith("/broadcast")) return roles.contains("DISPATCHER") || roles.contains("SAFETY_MANAGER");
            if (path.endsWith("/acknowledge")) return roles.contains("DISPATCHER");
            if (path.equals(apiPrefix + "/notifications/email")) return false;
            return roles.contains("DISPATCHER") || roles.contains("SAFETY_MANAGER") || roles.contains("DRIVER");
        }
        if (path.startsWith(apiPrefix + "/payments") || path.startsWith(apiPrefix + "/contracts")) {
            return roles.contains("CUSTOMER") || roles.contains("DISPATCHER");
        }
        if (path.startsWith(apiPrefix + "/hub-shipper")) {
            return roles.contains("HUB_MANAGER") || roles.contains("HUB_SHIPPER")
                    || roles.contains("HUB_AUDITOR") || roles.contains("SHIPPER");
        }
        if (path.startsWith(apiPrefix + "/chat")) {
            return roles.contains("CUSTOMER") || roles.contains("DRIVER") || roles.contains("DISPATCHER")
                    || roles.contains("HUB_MANAGER") || roles.contains("HUB_SHIPPER") || roles.contains("SHIPPER");
        }
        return true;
    }

    private boolean authorizeAssets(String path, String verb, Set<String> roles) {
        if (path.contains("/shipper-hubs") || path.contains("/shipper-handovers")) {
            if (verb.equals("GET")) return roles.contains("SHIPPER") || roles.contains("HUB_MANAGER")
                    || roles.contains("HUB_SHIPPER") || roles.contains("HUB_AUDITOR");
            return roles.contains("SHIPPER") || roles.contains("HUB_MANAGER") || roles.contains("HUB_SHIPPER");
        }
        if (path.contains("/inspections")) return verb.equals("GET")
                ? roles.contains("SAFETY_MANAGER") || roles.contains("DRIVER") : roles.contains("DRIVER");
        if (path.contains("/maintenances")) return roles.contains("SAFETY_MANAGER");
        if (path.contains("/messages")) return roles.contains("CUSTOMER") || roles.contains("DRIVER")
                || roles.contains("DISPATCHER");
        if (path.contains("/reviews")) return roles.contains("CUSTOMER") || roles.contains("DISPATCHER");
        if (path.contains("/containers") || path.contains("/drivers")) {
            if (!verb.equals("GET")) return roles.contains("DISPATCHER") || roles.contains("SAFETY_MANAGER")
                    || roles.contains("DRIVER") && path.contains("/containers") && path.contains("/epod");
            return roles.contains("DISPATCHER") || roles.contains("SAFETY_MANAGER") || roles.contains("DRIVER")
                    || roles.contains("CUSTOMER") || roles.contains("ESG_AUDITOR");
        }
        return roles.contains("DISPATCHER") || roles.contains("SAFETY_MANAGER");
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private boolean isPublicEndpoint(ServerHttpRequest request) {
        if (HttpMethod.OPTIONS.equals(request.getMethod())) {
            return true;
        }
        String path = request.getURI().getPath();
        // Socket.IO polling/upgrades use the short-lived ticket consumed by the Chat Service.
        if (path.startsWith(apiPrefix + "/chat/socket.io/")
                && (HttpMethod.GET.equals(request.getMethod()) || HttpMethod.POST.equals(request.getMethod()))
                && request.getQueryParams().getFirst("ticket") != null) {
            return true;
        }
        if (path.contains("/v3/api-docs")
                || path.contains("/swagger-ui")
                || path.contains("/webjars")
                || path.contains("/swagger-resources")
                || path.startsWith("/services/")
                || path.matches("/actuator/.*")) {
            return true;
        }
        return Arrays.stream(publicEndpoints)
                .anyMatch(s -> path.matches(apiPrefix + s));
    }

    Mono<Void> unauthenticated(ServerHttpResponse response) {
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(1401)
                .message("Unauthenticated")
                .build();

        String body;
        try {
            body = objectMapper.writeValueAsString(apiResponse);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

        return response.writeWith(
                Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }

    private Mono<Void> forbidden(ServerHttpResponse response) {
        ApiResponse<?> apiResponse = ApiResponse.builder().code(1403).message("Forbidden").build();
        try {
            response.setStatusCode(HttpStatus.FORBIDDEN);
            response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
            return response.writeWith(Mono.just(response.bufferFactory()
                    .wrap(objectMapper.writeValueAsBytes(apiResponse))));
        } catch (JsonProcessingException e) {
            return Mono.error(e);
        }
    }
}
