package com.ccadro.routing.entity;

public class RouteWaypoint {
    private double latitude;
    private double longitude;
    private int sequence;
    private String description;

    public RouteWaypoint() {}

    public RouteWaypoint(double latitude, double longitude, int sequence, String description) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.sequence = sequence;
        this.description = description;
    }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public int getSequence() { return sequence; }
    public void setSequence(int sequence) { this.sequence = sequence; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
