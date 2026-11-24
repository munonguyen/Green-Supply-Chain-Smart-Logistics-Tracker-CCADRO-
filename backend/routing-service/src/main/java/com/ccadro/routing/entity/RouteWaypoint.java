package com.ccadro.routing.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteWaypoint {
    private double latitude;
    private double longitude;
    private int sequence;
    private String description;
}
