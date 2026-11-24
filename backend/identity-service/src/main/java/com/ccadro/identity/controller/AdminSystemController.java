package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.util.CallerAuthUtils;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import jakarta.annotation.PreDestroy;

@RestController
@RequestMapping("/api/v1/admin/system")
public class AdminSystemController {

    private static final List<String> EXPECTED_SERVICES = List.of(
            "api-gateway", "identity-service", "asset-service", "shipment-service", "routing-service",
            "tracking-service", "carbon-service", "incident-service", "payment-service",
            "notification-service", "hub-shipper-service", "chat-service"
    );

    private final DiscoveryClient discoveryClient;
    private final RestClient healthClient;
    private final ExecutorService probesExecutor = new java.util.concurrent.ThreadPoolExecutor(
            12, 12, 0L, TimeUnit.MILLISECONDS, new java.util.concurrent.ArrayBlockingQueue<>(48),
            new java.util.concurrent.ThreadPoolExecutor.AbortPolicy());

    @PreDestroy
    public void stopProbes() { probesExecutor.shutdownNow(); }

    public AdminSystemController(DiscoveryClient discoveryClient) {
        this.discoveryClient = discoveryClient;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(700);
        requestFactory.setReadTimeout(1200);
        this.healthClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health(
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        CallerAuthUtils.requireAdmin(callerScope, "Chỉ ADMIN được xem tình trạng service nội bộ.");
        Instant checkedAt = Instant.now();
        List<CompletableFuture<Map<String, Object>>> probes = EXPECTED_SERVICES.stream()
                .map(this::probeService)
                .toList();
        CompletableFuture.allOf(probes.toArray(CompletableFuture[]::new))
                .completeOnTimeout(null, 3, TimeUnit.SECONDS)
                .join();

        List<Map<String, Object>> services = new ArrayList<>();
        for (int index = 0; index < EXPECTED_SERVICES.size(); index++) {
            CompletableFuture<Map<String, Object>> probe = probes.get(index);
            if (probe.isDone() && !probe.isCompletedExceptionally() && probe.getNow(null) != null) {
                services.add(probe.getNow(null));
            } else {
                services.add(Map.of(
                        "serviceId", EXPECTED_SERVICES.get(index),
                        "status", "CHECK_TIMEOUT",
                        "instances", 0,
                        "healthyInstances", 0
                ));
            }
        }
        long up = services.stream().filter(service -> "UP".equals(service.get("status"))).count();
        long notRegistered = services.stream().filter(service -> "NOT_REGISTERED".equals(service.get("status"))).count();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("checkedAt", checkedAt.toString());
        result.put("expectedServiceCount", EXPECTED_SERVICES.size());
        result.put("healthyServiceCount", up);
        result.put("notRegisteredServiceCount", notRegistered);
        result.put("services", services);
        result.put("scope", "runtime registry and actuator health only; data completeness is reported separately");
        return ApiResponse.success(result);
    }

    private CompletableFuture<Map<String, Object>> probeService(String serviceId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<ServiceInstance> instances = discoveryClient.getInstances(serviceId);
                if (instances == null || instances.isEmpty()) {
                    return Map.of("serviceId", serviceId, "status", "NOT_REGISTERED", "instances", 0, "healthyInstances", 0);
                }
                int healthy = 0;
                for (ServiceInstance instance : instances) {
                    if (probeInstance(instance, serviceId)) healthy++;
                }
                String status = healthy == instances.size() ? "UP" : healthy > 0 ? "DEGRADED" : "DOWN";
                return Map.of(
                        "serviceId", serviceId,
                        "status", status,
                        "instances", instances.size(),
                        "healthyInstances", healthy
                );
            } catch (Exception ignored) {
                return Map.of("serviceId", serviceId, "status", "CHECK_FAILED", "instances", 0, "healthyInstances", 0);
            }
        }, probesExecutor);
    }

    private boolean probeInstance(ServiceInstance instance, String serviceId) {
        try {
            URI base = instance.getUri();
            if (base == null || base.getHost() == null || base.getUserInfo() != null
                    || !("http".equalsIgnoreCase(base.getScheme()) || "https".equalsIgnoreCase(base.getScheme()))) {
                return false;
            }
            // Gateway deliberately hides technical endpoints. Its public read-only route checks
            // both gateway availability and routing to Identity without exposing Actuator.
            boolean gateway = "api-gateway".equals(serviceId);
            URI healthUri = base.resolve(gateway ? "/api/v1/careers/openings" : "/actuator/health");
            Map<?, ?> payload = healthClient.get().uri(healthUri).retrieve().body(Map.class);
            return payload != null && (gateway
                    ? Integer.valueOf(1000).equals(payload.get("code"))
                    : "UP".equalsIgnoreCase(String.valueOf(payload.get("status"))));
        } catch (Exception ignored) {
            return false;
        }
    }
}
