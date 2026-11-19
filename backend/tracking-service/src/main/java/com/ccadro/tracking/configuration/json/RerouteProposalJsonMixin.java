package com.ccadro.tracking.configuration.json;

import com.ccadro.tracking.entity.RerouteProposal;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.jackson.JsonMixin;
import org.locationtech.jts.geom.LineString;

/** Keep database geometry out of the existing HTTP JSON contract. */
@JsonMixin(RerouteProposal.class)
public abstract class RerouteProposalJsonMixin {
    @JsonIgnore
    public abstract LineString getProposedGeometry();
}
