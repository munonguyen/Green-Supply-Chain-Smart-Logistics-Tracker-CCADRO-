package com.ccadro.chat.json;

import com.ccadro.chat.dto.ApiResponse;
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
        JsonNode document = json.readTree(json.writeValueAsBytes(ApiResponse.success(Map.of("occurredAt", occurredAt, "label", "Vận chuyển 🚚"))));
        assertThat(document.at("/result/occurredAt").asText()).isEqualTo(occurredAt.toString());
        assertThat(document.path("code").asInt()).isEqualTo(1000);
        assertThat(document.path("result").path("label").asText()).isEqualTo("Vận chuyển 🚚");
    }
}
