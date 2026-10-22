package com.ccadro.routing.infrastructure.adapter;

import com.ccadro.routing.domain.Location;
import com.ccadro.routing.domain.RouteSegment;
import com.ccadro.routing.domain.TrafficCondition;
import com.ccadro.routing.domain.TrafficProvider;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

@Component("mockTrafficProvider")
public class MockTrafficProvider implements TrafficProvider {

    private final AtomicReference<TrafficCondition> currentCondition = new AtomicReference<>(TrafficCondition.NORMAL);

    @Override
    public TrafficCondition getTraffic(RouteSegment segment) {
        return currentCondition.get();
    }

    @Override
    public TrafficCondition getTrafficForLocation(Location location) {
        return currentCondition.get();
    }

    public void setSimulatedCondition(TrafficCondition condition) {
        this.currentCondition.set(condition);
    }
}
