package com.ccadro.tracking.configuration.json;

import com.ccadro.tracking.entity.DeviationAlert;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.jackson.JsonMixin;
import org.locationtech.jts.geom.Point;

/** Keep database geometry out of the existing HTTP JSON contract. */
@JsonMixin(DeviationAlert.class)
public abstract class DeviationAlertJsonMixin {
    @JsonIgnore
    public abstract Point getLocationGeom();
}
