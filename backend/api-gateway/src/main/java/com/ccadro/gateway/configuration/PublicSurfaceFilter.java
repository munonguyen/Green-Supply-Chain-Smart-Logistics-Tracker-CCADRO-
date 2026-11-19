package com.ccadro.gateway.configuration;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/** External boundary, including local WebFlux endpoints that bypass Gateway GlobalFilters. */
@Component
public class PublicSurfaceFilter implements WebFilter, Ordered {
    private static final Set<String> PRIVATE_SEGMENTS = Set.of(
            "internal", "actuator", "api-docs", "swagger-ui", "swagger-ui.html", "swagger-resources", "webjars");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String rawPath = exchange.getRequest().getURI().getRawPath().toLowerCase(Locale.ROOT);
        boolean ambiguousPath = rawPath.contains("%2f") || rawPath.contains("%5c")
                || rawPath.contains("%2e") || rawPath.contains("%25")
                || path.contains(";") || path.contains("\\") || path.contains("//")
                || Arrays.asList(path.split("/")).contains("..");
        boolean privatePath = path.equals("/services") || path.startsWith("/services/")
                || Arrays.stream(path.split("/")).anyMatch(PRIVATE_SEGMENTS::contains);
        // These commands are used directly by trusted services, never by public clients.
        boolean internalCommand = path.equals("/api/v1/notifications/email")
                || path.startsWith("/api/v1/notifications/email/");
        if (ambiguousPath || privatePath || internalCommand) {
            exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
            exchange.getResponse().getHeaders().set(HttpHeaders.CACHE_CONTROL, "no-store");
            return exchange.getResponse().setComplete();
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
