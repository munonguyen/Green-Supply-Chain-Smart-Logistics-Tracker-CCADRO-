package com.ccadro.asset.api;

import com.ccadro.asset.application.AssetService;
import com.ccadro.asset.domain.Driver;
import com.ccadro.asset.domain.Vehicle;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
@Tag(name = "Asset Management", description = "Vehicles and Drivers management")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping("/vehicles")
    @Operation(summary = "List all vehicles", description = "Retrieve all registered logistics fleet vehicles")
    public ResponseEntity<List<Vehicle>> getVehicles() {
        return ResponseEntity.ok(assetService.getAllVehicles());
    }

    @GetMapping("/drivers")
    @Operation(summary = "List all drivers", description = "Retrieve all registered logistics drivers")
    public ResponseEntity<List<Driver>> getDrivers() {
        return ResponseEntity.ok(assetService.getAllDrivers());
    }
}
