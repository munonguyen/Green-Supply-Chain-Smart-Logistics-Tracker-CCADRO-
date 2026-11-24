package com.ccadro.routing.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteSegment {
    private Location start;
    private Location end;
    private double lengthMeters;
    private String roadName;
}
