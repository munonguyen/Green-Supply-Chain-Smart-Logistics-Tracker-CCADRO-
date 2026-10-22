package com.ccadro.routing.domain;

public class RouteSegment {
    private Location start;
    private Location end;
    private double lengthMeters;
    private String roadName;

    public RouteSegment() {}

    public RouteSegment(Location start, Location end, double lengthMeters, String roadName) {
        this.start = start;
        this.end = end;
        this.lengthMeters = lengthMeters;
        this.roadName = roadName;
    }

    public Location getStart() { return start; }
    public void setStart(Location start) { this.start = start; }
    public Location getEnd() { return end; }
    public void setEnd(Location end) { this.end = end; }
    public double getLengthMeters() { return lengthMeters; }
    public void setLengthMeters(double lengthMeters) { this.lengthMeters = lengthMeters; }
    public String getRoadName() { return roadName; }
    public void setRoadName(String roadName) { this.roadName = roadName; }
}
