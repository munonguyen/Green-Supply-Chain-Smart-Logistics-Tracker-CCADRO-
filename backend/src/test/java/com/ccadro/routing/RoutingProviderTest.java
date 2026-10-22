package com.ccadro.routing;

import com.ccadro.routing.domain.*;
import com.ccadro.routing.infrastructure.adapter.MockRoutingProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RoutingProviderTest {

    private final MockRoutingProvider mockProvider = new MockRoutingProvider();

    @Test
    @DisplayName("MockRoutingProvider should return exactly 3 ranked candidates with valid geometry")
    void testMockRoutingProvider() {
        RouteRequest request = new RouteRequest(
                UUID.randomUUID(),
                new Location(10.762622, 106.795677, "Cat Lai Port"),
                new Location(10.931215, 106.697426, "VSIP 1"),
                BigDecimal.valueOf(15.0),
                "DIESEL",
                "EURO_5"
        );

        List<RouteCandidateData> candidates = mockProvider.getRoutes(request);

        assertThat(candidates).hasSize(3);

        // Check Eco Candidate
        RouteCandidateData ecoCandidate = candidates.get(0);
        assertThat(ecoCandidate.getCandidateName()).contains("Eco-Green");
        assertThat(ecoCandidate.getDistanceMeters()).isGreaterThan(BigDecimal.ZERO);
        assertThat(ecoCandidate.getEstimatedCo2Kg()).isGreaterThan(BigDecimal.ZERO);
        assertThat(ecoCandidate.getCompositeScore()).isNotNull();
        assertThat(ecoCandidate.getGeometryGeoJson()).contains("LineString");
        assertThat(ecoCandidate.getWaypoints()).isNotEmpty();

        // Check Highway Candidate
        RouteCandidateData fastCandidate = candidates.get(1);
        assertThat(fastCandidate.getCandidateName()).contains("Fastest");

        // Check Urban Candidate
        RouteCandidateData shortCandidate = candidates.get(2);
        assertThat(shortCandidate.getCandidateName()).contains("Shortest");
    }
}
