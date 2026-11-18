package com.ccadro.discovery;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.cloud.netflix.eureka.server.EurekaServerAutoConfiguration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpClientErrorException;
import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

/** Real registry + separate client application: register, renew, report health, unregister. */
@SpringBootTest(classes=EurekaServerApplication.class, webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties={"eureka.client.service-url.defaultZone=http://127.0.0.1:1/eureka/", "eureka.server.my-url=http://127.0.0.1:1/eureka/", "eureka.server.response-cache-update-interval-ms=500", "eureka.server.use-read-only-response-cache=false"})
class EurekaRegistryIntegrationTest {
    @LocalServerPort int port;
    @Autowired RestClient.Builder http;

    @Test void registryDashboardAndClientHealthLifecycle() {
        var registry = http.baseUrl("http://127.0.0.1:" + port).build();
        assertThat(registry.get().uri("/").retrieve().body(String.class)).contains("Instances currently registered with Eureka");
        String instanceId = "probe-" + UUID.randomUUID();
        // Explicit command arguments override the server module's application.yaml for this child app.
        try (var client = new SpringApplicationBuilder(ProbeApplication.class).run(
                "--spring.application.name=registry-probe", "--server.port=0", "--server.address=127.0.0.1",
                "--eureka.client.enabled=true", "--eureka.client.register-with-eureka=true", "--eureka.client.fetch-registry=false",
                "--eureka.client.service-url.defaultZone=http://127.0.0.1:" + port + "/eureka/",
                "--eureka.client.jersey.enabled=false", "--eureka.client.healthcheck.enabled=true", "--eureka.client.initial-instance-info-replication-interval-seconds=1",
                "--eureka.client.instance-info-replication-interval-seconds=1", "--eureka.instance.instance-id=" + instanceId,
                "--eureka.instance.hostname=127.0.0.1", "--eureka.instance.lease-renewal-interval-in-seconds=1",
                "--eureka.instance.lease-expiration-duration-in-seconds=10")) {
            String path = "/eureka/apps/REGISTRY-PROBE/" + instanceId;
            await().ignoreException(HttpClientErrorException.NotFound.class).atMost(Duration.ofSeconds(40)).untilAsserted(() -> {
                var data = instance(registry, path);
                assertThat(data.path("status").asText()).isEqualTo("UP");
                assertThat(data.path("port").path("$").asInt()).isPositive();
            });
            long firstRenewal = instance(registry, path).path("leaseInfo").path("lastRenewalTimestamp").asLong();
            await().ignoreException(HttpClientErrorException.NotFound.class).atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                    assertThat(instance(registry, path).path("leaseInfo").path("lastRenewalTimestamp").asLong()).isGreaterThan(firstRenewal));
            client.getBean(ProbeHealth.class).healthy.set(false);
            await().ignoreException(HttpClientErrorException.NotFound.class).atMost(Duration.ofSeconds(15)).untilAsserted(() ->
                    assertThat(instance(registry, path).path("status").asText()).isEqualTo("DOWN"));
        }
        await().ignoreException(HttpClientErrorException.NotFound.class).atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThatThrownBy(() -> instance(registry, "/eureka/apps/REGISTRY-PROBE/" + instanceId))
                        .isInstanceOf(HttpClientErrorException.NotFound.class));
    }

    private JsonNode instance(RestClient registry, String path) {
        return registry.get().uri(path).header("Accept", "application/json").retrieve().body(JsonNode.class).path("instance");
    }

    @TestConfiguration(proxyBeanMethods=false)
    @EnableAutoConfiguration(exclude=EurekaServerAutoConfiguration.class)
    static class ProbeApplication {
        @Bean ProbeHealth probeHealth() { return new ProbeHealth(); }
    }
    static class ProbeHealth implements HealthIndicator {
        final AtomicBoolean healthy = new AtomicBoolean(true);
        @Override public Health health() { return healthy.get() ? Health.up().build() : Health.down().build(); }
    }
}
