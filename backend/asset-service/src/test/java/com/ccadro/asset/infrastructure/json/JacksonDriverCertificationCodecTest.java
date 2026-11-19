package com.ccadro.asset.infrastructure.json;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JacksonDriverCertificationCodecTest {
    private final JacksonDriverCertificationCodec codec = new JacksonDriverCertificationCodec(new ObjectMapper());

    @Test
    void roundTripsQualificationsWithoutLosingUnicodeOrEmptyLists() {
        List<String> qualifications = List.of("An toàn container", "Eco-Driving GLEC v3");
        assertThat(codec.decode(codec.encode(qualifications))).isEqualTo(qualifications);
        assertThat(codec.decode(codec.encode(List.of()))).isEmpty();
    }

    @Test
    void retainsLegacyReadFallbackForMissingOrMalformedData() {
        List<String> defaults = List.of("Eco-Driving GLEC v3", "An Toàn Container");
        assertThat(codec.decode(null)).isEqualTo(defaults);
        for (String value : List.of("", "null", "not-json", "{}")) {
            assertThat(codec.decode(value)).isEqualTo(defaults);
        }
    }

    @Test
    void rejectsSerializationFailureInsteadOfSavingUnrelatedQualifications() throws Exception {
        ObjectMapper brokenMapper = mock(ObjectMapper.class);
        List<String> qualifications = List.of("ADR");
        when(brokenMapper.writeValueAsString(qualifications))
                .thenThrow(new JsonProcessingException("serialization failed") {});
        assertThatThrownBy(() -> new JacksonDriverCertificationCodec(brokenMapper).encode(qualifications))
                .isInstanceOf(IllegalStateException.class).hasCauseInstanceOf(JsonProcessingException.class);
    }
}
