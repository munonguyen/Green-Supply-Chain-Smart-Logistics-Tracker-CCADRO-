package com.ccadro.routing.api;

import com.ccadro.routing.application.RoutingService;
import com.ccadro.routing.domain.RouteCandidate;
import com.ccadro.routing.domain.RouteCandidateData;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/routing")
@Tag(name = "Routing Operations", description = "Multi-criteria green route planning (UC05)")
public class RoutingController {

    private final RoutingService routingService;

    public RoutingController(RoutingService routingService) {
        this.routingService = routingService;
    }

    @PostMapping("/calculate/{shipmentId}")
    @Operation(summary = "Calculate route candidates for shipment", description = "Generates and scores route options via active routing provider")
    public ResponseEntity<List<RouteCandidateData>> calculateRoutes(@PathVariable UUID shipmentId) {
        return ResponseEntity.ok(routingService.calculateRoutesForShipment(shipmentId));
    }

    @GetMapping("/candidates/{shipmentId}")
    @Operation(summary = "Get candidate routes for shipment")
    public ResponseEntity<List<RouteCandidate>> getCandidates(@PathVariable UUID shipmentId) {
        return ResponseEntity.ok(routingService.getSavedCandidates(shipmentId));
    }
}
