package com.ccadro.routing.configuration.json;

import com.ccadro.routing.entity.RouteCandidate;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.jackson.JsonMixin;
import org.locationtech.jts.geom.LineString;

/** Keep database geometry out of the existing HTTP JSON contract. */
@JsonMixin(RouteCandidate.class)
public abstract class RouteCandidateJsonMixin {
    @JsonIgnore
    public abstract LineString getRouteGeometry();
}
