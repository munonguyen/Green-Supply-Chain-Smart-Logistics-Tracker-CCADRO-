package com.ccadro.incident.configuration.json;

import com.ccadro.incident.entity.FieldIncident;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.jackson.JsonMixin;
import org.locationtech.jts.geom.Point;

/** Keep database geometry out of the existing HTTP JSON contract. */
@JsonMixin(FieldIncident.class)
public abstract class FieldIncidentJsonMixin {
    @JsonIgnore
    public abstract Point getIncidentLocation();
}
