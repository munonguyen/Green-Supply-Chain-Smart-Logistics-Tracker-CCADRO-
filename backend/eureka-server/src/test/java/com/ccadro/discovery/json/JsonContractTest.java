package com.ccadro.discovery.json;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import static org.assertj.core.api.Assertions.assertThat;

@JsonTest
class JsonContractTest {
    @Autowired
    ObjectMapper json;

    @Test
    void preservesUnicodeAndIso8601Dates() throws Exception {
        Instant occurredAt = Instant.parse("2026-11-19T08:30:00Z");
        JsonNode document = json.readTree(json.writeValueAsBytes(Map.of("occurredAt", occurredAt, "label", "Vận chuyển 🚚")));
        assertThat(document.at("/occurredAt").asText()).isEqualTo(occurredAt.toString());
        assertThat(document.path("label").asText()).isEqualTo("Vận chuyển 🚚");
    }
}
