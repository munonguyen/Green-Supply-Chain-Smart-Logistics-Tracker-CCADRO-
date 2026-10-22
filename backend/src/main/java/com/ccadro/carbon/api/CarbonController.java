package com.ccadro.carbon.api;

import com.ccadro.carbon.application.CarbonService;
import com.ccadro.carbon.domain.CarbonBenchmark;
import com.ccadro.carbon.domain.EmissionFactor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/carbon")
@Tag(name = "Carbon Accounting & Benchmark", description = "GLEC v3 green logistics carbon tracking and corridor benchmarking (UC12, UC13)")
public class CarbonController {

    private final CarbonService carbonService;

    public CarbonController(CarbonService carbonService) {
        this.carbonService = carbonService;
    }

    @GetMapping("/factors")
    @Operation(summary = "List emission factors", description = "Returns active emission factors per GLEC framework v3")
    public ResponseEntity<List<EmissionFactor>> getFactors() {
        return ResponseEntity.ok(carbonService.getAllFactors());
    }

    @GetMapping("/benchmarks")
    @Operation(summary = "List corridor carbon benchmarks")
    public ResponseEntity<List<CarbonBenchmark>> getBenchmarks() {
        return ResponseEntity.ok(carbonService.getAllBenchmarks());
    }
}
