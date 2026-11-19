package com.ccadro.tracking.infrastructure.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class JacksonRouteWaypointDecoderTest {
    private final JacksonRouteWaypointDecoder decoder = new JacksonRouteWaypointDecoder(new ObjectMapper());

    @Test
    void convertsGeoJsonLongitudeLatitudeToFleetLatitudeLongitude() {
        assertThat(decoder.decode("{\"type\":\"LineString\",\"coordinates\":[[106.7824,10.7623],[106.7145,10.9242]]}"))
                .containsExactly(List.of(10.7623, 106.7824), List.of(10.9242, 106.7145));
    }

    @Test
    void handlesMissingOrMalformedHistoricalRoutesWithoutBreakingFleetReads() {
        for (String value : List.of("", " ", "null", "not-json", "{}", "{\"coordinates\":null}")) {
            assertThat(decoder.decode(value)).isEmpty();
        }
        assertThat(decoder.decode(null)).isEmpty();
        assertThat(decoder.decode("{\"coordinates\":[null,[1],[\"bad\",2],[106,10]]}"))
                .containsExactly(List.of(10.0, 106.0));
    }
}
