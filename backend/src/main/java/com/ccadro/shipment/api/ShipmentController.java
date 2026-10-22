package com.ccadro.shipment.api;

import com.ccadro.shipment.api.dto.CreateShipmentRequest;
import com.ccadro.shipment.application.ShipmentService;
import com.ccadro.shipment.domain.Shipment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shipments")
@Tag(name = "Shipment Management", description = "Operations on freight shipments")
public class ShipmentController {

    private final ShipmentService shipmentService;

    public ShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    @GetMapping
    @Operation(summary = "List all shipments", description = "Retrieve list of all registered logistics shipments")
    public ResponseEntity<List<Shipment>> getAll() {
        return ResponseEntity.ok(shipmentService.getAllShipments());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get shipment by ID")
    public ResponseEntity<Shipment> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(shipmentService.getShipmentById(id));
    }

    @PostMapping
    @Operation(summary = "Create a new shipment")
    public ResponseEntity<Shipment> create(@Valid @RequestBody CreateShipmentRequest request) {
        Shipment created = shipmentService.createShipment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
