package com.ccadro.tracking.configuration.json;

import com.ccadro.tracking.entity.TelemetryEvent;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.jackson.JsonMixin;
import org.locationtech.jts.geom.Point;

/** Keep database geometry out of the existing HTTP JSON contract. */
@JsonMixin(TelemetryEvent.class)
public abstract class TelemetryEventJsonMixin {
    @JsonIgnore
    public abstract Point getLocationGeom();
}
