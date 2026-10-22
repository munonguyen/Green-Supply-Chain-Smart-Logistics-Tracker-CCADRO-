package com.ccadro.routing.domain;

import java.math.BigDecimal;
import java.util.List;

public class RouteCandidateData {
    private String candidateName;
    private String providerName;
    private BigDecimal distanceMeters;
    private BigDecimal durationSeconds;
    private BigDecimal estimatedFuelLiters;
    private BigDecimal estimatedCo2Kg;
    private BigDecimal compositeScore;
    private String geometryGeoJson;
    private List<RouteWaypoint> waypoints;

    public RouteCandidateData() {}

    public RouteCandidateData(String candidateName, String providerName, BigDecimal distanceMeters, BigDecimal durationSeconds, BigDecimal estimatedFuelLiters, BigDecimal estimatedCo2Kg, BigDecimal compositeScore, String geometryGeoJson, List<RouteWaypoint> waypoints) {
        this.candidateName = candidateName;
        this.providerName = providerName;
        this.distanceMeters = distanceMeters;
        this.durationSeconds = durationSeconds;
        this.estimatedFuelLiters = estimatedFuelLiters;
        this.estimatedCo2Kg = estimatedCo2Kg;
        this.compositeScore = compositeScore;
        this.geometryGeoJson = geometryGeoJson;
        this.waypoints = waypoints;
    }

    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }
    public BigDecimal getDistanceMeters() { return distanceMeters; }
    public void setDistanceMeters(BigDecimal distanceMeters) { this.distanceMeters = distanceMeters; }
    public BigDecimal getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(BigDecimal durationSeconds) { this.durationSeconds = durationSeconds; }
    public BigDecimal getEstimatedFuelLiters() { return estimatedFuelLiters; }
    public void setEstimatedFuelLiters(BigDecimal estimatedFuelLiters) { this.estimatedFuelLiters = estimatedFuelLiters; }
    public BigDecimal getEstimatedCo2Kg() { return estimatedCo2Kg; }
    public void setEstimatedCo2Kg(BigDecimal estimatedCo2Kg) { this.estimatedCo2Kg = estimatedCo2Kg; }
    public BigDecimal getCompositeScore() { return compositeScore; }
    public void setCompositeScore(BigDecimal compositeScore) { this.compositeScore = compositeScore; }
    public String getGeometryGeoJson() { return geometryGeoJson; }
    public void setGeometryGeoJson(String geometryGeoJson) { this.geometryGeoJson = geometryGeoJson; }
    public List<RouteWaypoint> getWaypoints() { return waypoints; }
    public void setWaypoints(List<RouteWaypoint> waypoints) { this.waypoints = waypoints; }
}
