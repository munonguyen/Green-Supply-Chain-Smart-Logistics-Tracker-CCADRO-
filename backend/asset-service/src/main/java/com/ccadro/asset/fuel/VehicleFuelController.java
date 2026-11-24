package com.ccadro.asset.fuel;

import com.ccadro.asset.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import static com.ccadro.asset.fuel.VehicleFuelDtos.*;
import static com.ccadro.asset.fuel.FuelAutomationDtos.*;

@RestController @RequestMapping("/api/v1/assets") @RequiredArgsConstructor
public class VehicleFuelController {
    private final VehicleFuelService service;
    private final FuelStationAutomationService automation;
    @GetMapping("/vehicle-fuels")
    public ApiResponse<Catalog> overview(@RequestHeader(value="X-Auth-Scope",required=false)String scope) {return ApiResponse.success(service.overview(scope));}
    @GetMapping("/vehicles/{id}/fuel-profile")
    public ApiResponse<VehicleFuelProfile> profile(@PathVariable UUID id,@RequestHeader(value="X-Auth-Scope",required=false)String scope) {return ApiResponse.success(service.profile(id,scope));}
    @PutMapping("/vehicles/{id}/fuel-profile")
    public ApiResponse<VehicleFuelProfile> save(@PathVariable UUID id,@RequestBody @Valid SaveProfile body,
        @RequestHeader(value="X-Auth-Username",required=false)String actor,@RequestHeader(value="X-Auth-Scope",required=false)String scope) {return ApiResponse.success(service.save(id,body,actor,scope));}
    @PostMapping("/vehicles/{id}/fuel-assessment")
    public ApiResponse<Assessment> assess(@PathVariable UUID id,@RequestBody @Valid Scenario body,
        @RequestHeader(value="X-Auth-Scope",required=false)String scope) {return ApiResponse.success(service.assess(id,body,scope));}

    @GetMapping("/fuel-stations")
    public ApiResponse<List<StationSummary>> stations(@RequestHeader(value="X-Auth-Scope",required=false)String scope) {
        return ApiResponse.success(automation.listStations(scope));
    }
    @PostMapping("/fuel-stations")
    public ApiResponse<StationSummary> createStation(@RequestBody @Valid CreateStationRequest body,
        @RequestHeader(value="X-Auth-Scope",required=false)String scope) {
        return ApiResponse.success(automation.createStation(body,scope));
    }
    @PostMapping("/fuel-stations/{stationCode}/authorize")
    public ApiResponse<AuthorizePumpDecision> authorizePump(@PathVariable String stationCode,@RequestBody @Valid AuthorizePumpRequest body,
        @RequestHeader(value="X-Auth-Scope",required=false)String scope) {
        return ApiResponse.success(automation.authorizePump(stationCode,body,scope));
    }
    @PostMapping("/fuel-stations/{stationCode}/transactions")
    public ApiResponse<List<TransactionRecord>> ingestTransactions(@PathVariable String stationCode,
        @RequestBody @Valid List<IngestTransactionRequest> body,
        @RequestHeader(value="X-Auth-Username",required=false)String actor,
        @RequestHeader(value="X-Auth-Scope",required=false)String scope) {
        return ApiResponse.success(automation.ingestTransactions(stationCode,body,actor,scope));
    }
    @GetMapping("/fuel-transactions")
    public ApiResponse<List<TransactionRecord>> listTransactions(@RequestHeader(value="X-Auth-Scope",required=false)String scope) {
        return ApiResponse.success(automation.listTransactions(scope));
    }
    @GetMapping("/container-fuel-units")
    public ApiResponse<List<ContainerFuelSummary>> listContainerFuelUnits(@RequestHeader(value="X-Auth-Scope",required=false)String scope) {
        return ApiResponse.success(automation.listContainerFuelUnits(scope));
    }
    @PostMapping("/vehicle-fuels/batch-optimize")
    public ApiResponse<BatchOptimizeResponse> batchOptimize(@RequestBody @Valid BatchOptimizeRequest body,
        @RequestHeader(value="X-Auth-Scope",required=false)String scope) {
        return ApiResponse.success(automation.batchOptimizeFleet(body,scope));
    }
}
