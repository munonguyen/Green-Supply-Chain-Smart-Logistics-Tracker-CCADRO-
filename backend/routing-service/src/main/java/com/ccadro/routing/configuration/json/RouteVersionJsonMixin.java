package com.ccadro.routing.configuration.json;

import com.ccadro.routing.entity.RouteVersion;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.jackson.JsonMixin;
import org.locationtech.jts.geom.LineString;

/** Keep database geometry out of the existing HTTP JSON contract. */
@JsonMixin(RouteVersion.class)
public abstract class RouteVersionJsonMixin {
    @JsonIgnore
    public abstract LineString getRouteGeometry();
}
