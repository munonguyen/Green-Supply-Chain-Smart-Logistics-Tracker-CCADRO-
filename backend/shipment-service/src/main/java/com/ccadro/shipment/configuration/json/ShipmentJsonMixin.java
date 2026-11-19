package com.ccadro.shipment.configuration.json;

import com.ccadro.shipment.entity.Shipment;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.jackson.JsonMixin;
import org.locationtech.jts.geom.Point;

/** Keep database geometry out of the existing HTTP JSON contract. */
@JsonMixin(Shipment.class)
public abstract class ShipmentJsonMixin {
    @JsonIgnore
    public abstract Point getOriginGeom();

    @JsonIgnore
    public abstract Point getDestinationGeom();
}
