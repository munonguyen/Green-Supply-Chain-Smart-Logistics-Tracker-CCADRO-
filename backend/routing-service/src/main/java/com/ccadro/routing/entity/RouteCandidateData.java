package com.ccadro.routing.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteCandidateData {
    private UUID candidateId;
    private String candidateName;
    private String providerName;
    private BigDecimal distanceMeters;
    private BigDecimal durationSeconds;
    private BigDecimal estimatedFuelLiters;
    private BigDecimal estimatedCo2Kg;
    private BigDecimal compositeScore;
    private String geometryGeoJson;
    private List<RouteWaypoint> waypoints;
    private String routingMetadataJson;

    public RouteCandidateData(UUID candidateId, String candidateName, String providerName, BigDecimal distanceMeters,
            BigDecimal durationSeconds, BigDecimal estimatedFuelLiters, BigDecimal estimatedCo2Kg,
            BigDecimal compositeScore, String geometryGeoJson, List<RouteWaypoint> waypoints) {
        this(candidateId, candidateName, providerName, distanceMeters, durationSeconds, estimatedFuelLiters,
            estimatedCo2Kg, compositeScore, geometryGeoJson, waypoints, null);
    }

    public RouteCandidateData(String candidateName, String providerName, BigDecimal distanceMeters, BigDecimal durationSeconds, BigDecimal estimatedFuelLiters, BigDecimal estimatedCo2Kg, BigDecimal compositeScore, String geometryGeoJson, List<RouteWaypoint> waypoints) {
        this(null, candidateName, providerName, distanceMeters, durationSeconds, estimatedFuelLiters,
                estimatedCo2Kg, compositeScore, geometryGeoJson, waypoints);
    }
}
