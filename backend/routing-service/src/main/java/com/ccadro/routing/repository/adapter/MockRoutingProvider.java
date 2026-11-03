package com.ccadro.routing.repository.adapter;

import com.ccadro.routing.entity.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Component("mockRoutingProvider")
public class MockRoutingProvider implements RoutingProvider {

    @Override
    public String getProviderName() {
        return "MOCK";
    }

    @Override
    public List<RouteCandidateData> getRoutes(RouteRequest request) {
        double oLat = request.getOrigin() != null ? request.getOrigin().getLatitude() : 10.762622;
        double oLng = request.getOrigin() != null ? request.getOrigin().getLongitude() : 106.795677;
        double dLat = request.getDestination() != null ? request.getDestination().getLatitude() : 10.931215;
        double dLng = request.getDestination() != null ? request.getDestination().getLongitude() : 106.697426;

        List<RouteCandidateData> candidates = new ArrayList<>();

        // Candidate 1: Green Eco Route (Recommended - Lowest Carbon)
        List<RouteWaypoint> waypointsEco = List.of(
                new RouteWaypoint(oLat, oLng, 1, "Origin Port Departure"),
                new RouteWaypoint((oLat * 0.7 + dLat * 0.3), (oLng * 0.7 + dLng * 0.3), 2, "Vo Chi Cong Ring Road"),
                new RouteWaypoint((oLat * 0.3 + dLat * 0.7), (oLng * 0.3 + dLng * 0.7), 3, "My Phuoc - Tan Van Expressway"),
                new RouteWaypoint(dLat, dLng, 4, "VSIP 1 Arrival")
        );
        String geoJsonEco = String.format(java.util.Locale.ROOT, "{\"type\":\"LineString\",\"coordinates\":[[%f,%f],[%f,%f],[%f,%f],[%f,%f]]}",
                oLng, oLat,
                (oLng * 0.7 + dLng * 0.3), (oLat * 0.7 + dLat * 0.3),
                (oLng * 0.3 + dLng * 0.7), (oLat * 0.3 + dLat * 0.7),
                dLng, dLat);

        candidates.add(new RouteCandidateData(
                "Eco-Green Recommended Route",
                getProviderName(),
                BigDecimal.valueOf(28500.0), // 28.5 km
                BigDecimal.valueOf(2700.0),  // 45 min
                BigDecimal.valueOf(9.12),    // 9.12 liters
                BigDecimal.valueOf(23.95),   // 23.95 kg CO2
                BigDecimal.valueOf(0.9250),  // Composite score
                geoJsonEco,
                waypointsEco
        ));

        // Candidate 2: Fastest Highway Route
        List<RouteWaypoint> waypointsFast = List.of(
                new RouteWaypoint(oLat, oLng, 1, "Origin Port Departure"),
                new RouteWaypoint((oLat * 0.6 + dLat * 0.4) + 0.02, (oLng * 0.6 + dLng * 0.4) + 0.02, 2, "Hanoi Highway Corridor"),
                new RouteWaypoint(dLat, dLng, 3, "VSIP 1 Arrival")
        );
        String geoJsonFast = String.format(java.util.Locale.ROOT, "{\"type\":\"LineString\",\"coordinates\":[[%f,%f],[%f,%f],[%f,%f]]}",
                oLng, oLat,
                (oLng * 0.6 + dLng * 0.4) + 0.02, (oLat * 0.6 + dLat * 0.4) + 0.02,
                dLng, dLat);

        candidates.add(new RouteCandidateData(
                "Fastest Transit Highway Route",
                getProviderName(),
                BigDecimal.valueOf(31200.0), // 31.2 km
                BigDecimal.valueOf(2400.0),  // 40 min
                BigDecimal.valueOf(11.20),
                BigDecimal.valueOf(29.40),
                BigDecimal.valueOf(0.8120),
                geoJsonFast,
                waypointsFast
        ));

        // Candidate 3: Shortest Urban Distance Route
        List<RouteWaypoint> waypointsShort = List.of(
                new RouteWaypoint(oLat, oLng, 1, "Origin Port Departure"),
                new RouteWaypoint((oLat * 0.5 + dLat * 0.5) - 0.01, (oLng * 0.5 + dLng * 0.5) - 0.01, 2, "Pham Van Dong Urban Arterial"),
                new RouteWaypoint(dLat, dLng, 3, "VSIP 1 Arrival")
        );
        String geoJsonShort = String.format(java.util.Locale.ROOT, "{\"type\":\"LineString\",\"coordinates\":[[%f,%f],[%f,%f],[%f,%f]]}",
                oLng, oLat,
                (oLng * 0.5 + dLng * 0.5) - 0.01, (oLat * 0.5 + dLat * 0.5) - 0.01,
                dLng, dLat);

        candidates.add(new RouteCandidateData(
                "Shortest Urban Route",
                getProviderName(),
                BigDecimal.valueOf(26800.0), // 26.8 km
                BigDecimal.valueOf(3300.0),  // 55 min
                BigDecimal.valueOf(10.50),
                BigDecimal.valueOf(27.56),
                BigDecimal.valueOf(0.7640),
                geoJsonShort,
                waypointsShort
        ));

        return candidates;
    }
}
