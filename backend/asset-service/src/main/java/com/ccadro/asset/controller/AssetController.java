package com.ccadro.asset.controller;

import com.ccadro.asset.dto.ApiResponse;
import com.ccadro.asset.dto.request.*;
import com.ccadro.asset.dto.response.*;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.DriverStatus;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.service.AssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Asset Management", description = "UC01, UC02, UC03 - Fleet vehicles, drivers, smart containers, maintenance & pre-trip safety inspection")
public class AssetController {

    AssetService assetService;

    // --- UC01: Vehicles ---
    @GetMapping("/vehicles")
    @Operation(summary = "List all vehicles (UC01)")
    public ApiResponse<List<VehicleResponse>> getVehicles() {
        return ApiResponse.success(assetService.getAllVehiclesResponse());
    }

    @GetMapping("/vehicles/{id}")
    @Operation(summary = "Get vehicle by ID")
    public ApiResponse<VehicleResponse> getVehicleById(@PathVariable UUID id) {
        return ApiResponse.success(assetService.getVehicleResponseById(id));
    }

    @PostMapping("/vehicles")
    @Operation(summary = "Register new vehicle (UC01, BRULE-02)")
    public ApiResponse<VehicleResponse> createVehicle(@RequestBody @Valid VehicleCreateRequest request) {
        return ApiResponse.success("Đăng ký phương tiện thành công", assetService.createVehicle(request));
    }

    @PutMapping("/vehicles/{id}/status")
    @Operation(summary = "Update vehicle operational status")
    public ApiResponse<VehicleResponse> updateVehicleStatus(
            @PathVariable UUID id,
            @RequestParam VehicleStatus status) {
        return ApiResponse.success("Cập nhật trạng thái phương tiện thành công",
                assetService.updateVehicleStatus(id, status));
    }

    // --- UC01: Drivers ---
    @GetMapping("/drivers")
    @Operation(summary = "List all drivers (UC01)")
    public ApiResponse<List<DriverResponse>> getDrivers() {
        return ApiResponse.success(assetService.getAllDriversResponse());
    }

    @GetMapping("/drivers/{id}")
    @Operation(summary = "Get driver by ID")
    public ApiResponse<DriverResponse> getDriverById(@PathVariable UUID id) {
        return ApiResponse.success(assetService.getDriverResponseById(id));
    }

    @PostMapping("/drivers")
    @Operation(summary = "Register new driver (UC01, BRULE-02)")
    public ApiResponse<DriverResponse> createDriver(@RequestBody @Valid DriverCreateRequest request) {
        return ApiResponse.success("Đăng ký tài xế thành công", assetService.createDriver(request));
    }

    @PutMapping("/drivers/{id}/status")
    @Operation(summary = "Update driver status")
    public ApiResponse<DriverResponse> updateDriverStatus(
            @PathVariable UUID id,
            @RequestParam DriverStatus status) {
        return ApiResponse.success("Cập nhật trạng thái tài xế thành công",
                assetService.updateDriverStatus(id, status));
    }

    // --- UC01: Smart Containers & IoT Telematics ---
    @GetMapping("/containers")
    @Operation(summary = "List all containers with optional status and driver filters (UC01)")
    public ApiResponse<List<ContainerResponse>> getContainers(
            @RequestParam(required = false) ContainerStatus status,
            @RequestParam(required = false) UUID driverId) {
        return ApiResponse.success(assetService.getAllContainersResponse(status, driverId));
    }

    @GetMapping("/containers/{containerCode}")
    @Operation(summary = "Get container details & telematics by ISO container code (UC01)")
    public ApiResponse<ContainerResponse> getContainerByCode(@PathVariable String containerCode) {
        return ApiResponse.success(assetService.getContainerByCode(containerCode));
    }

    @PostMapping("/containers")
    @Operation(summary = "Register new container (UC01, BRULE-02)")
    public ApiResponse<ContainerResponse> createContainer(@RequestBody @Valid ContainerCreateRequest request) {
        return ApiResponse.success("Đăng ký container thành công", assetService.createContainer(request));
    }

    @PutMapping("/containers/{containerCode}/telemetry")
    @Operation(summary = "Update live IoT telematics, sensor data, and e-seal status")
    public ApiResponse<ContainerResponse> updateContainerTelemetry(
            @PathVariable String containerCode,
            @RequestBody ContainerTelemetryUpdateRequest request) {
        return ApiResponse.success("Cập nhật dữ liệu viễn thông container thành công",
                assetService.updateContainerTelemetry(containerCode, request));
    }

    @PutMapping("/containers/{containerCode}/assign-trip")
    @Operation(summary = "Assign container to shipment, driver, and prime mover vehicle")
    public ApiResponse<ContainerResponse> assignContainerTrip(
            @PathVariable String containerCode,
            @RequestBody ContainerAssignTripRequest request) {
        return ApiResponse.success("Gán chuyến vận chuyển cho container thành công",
                assetService.assignContainerTrip(containerCode, request));
    }

    @PostMapping("/containers/{containerCode}/epod")
    @Operation(summary = "Submit electronic proof of delivery (ePOD) and mark container delivered")
    public ApiResponse<ContainerResponse> submitContainerEpod(
            @PathVariable String containerCode,
            @RequestBody @Valid ContainerEpodRequest request) {
        return ApiResponse.success("Ký nhận biên bản giao hàng điện tử (ePOD) thành công",
                assetService.submitContainerEpod(containerCode, request));
    }

    @PutMapping("/containers/{containerCode}/status")
    @Operation(summary = "Update container lifecycle status")
    public ApiResponse<ContainerResponse> updateContainerStatus(
            @PathVariable String containerCode,
            @RequestParam ContainerStatus status) {
        return ApiResponse.success("Cập nhật trạng thái container thành công",
                assetService.updateContainerStatus(containerCode, status));
    }

    // --- UC02 & BRULE-01: Vehicle Maintenance ---
    @GetMapping("/vehicles/{vehicleId}/maintenances")
    @Operation(summary = "Get maintenance history for a vehicle (UC02)")
    public ApiResponse<List<VehicleMaintenanceResponse>> getVehicleMaintenances(@PathVariable UUID vehicleId) {
        return ApiResponse.success(assetService.getVehicleMaintenances(vehicleId));
    }

    @PostMapping("/maintenances")
    @Operation(summary = "Schedule or start vehicle maintenance (UC02, BRULE-01)")
    public ApiResponse<VehicleMaintenanceResponse> scheduleMaintenance(
            @RequestBody @Valid VehicleMaintenanceRequest request) {
        return ApiResponse.success("Đã ghi nhận phiếu bảo dưỡng phương tiện",
                assetService.scheduleMaintenance(request));
    }

    @PutMapping("/maintenances/{maintenanceId}/complete")
    @Operation(summary = "Complete maintenance and restore vehicle availability (UC02, BRULE-01)")
    public ApiResponse<VehicleMaintenanceResponse> completeMaintenance(@PathVariable UUID maintenanceId) {
        return ApiResponse.success("Hoàn tất bảo dưỡng, phương tiện đã sẵn sàng (AVAILABLE)",
                assetService.completeMaintenance(maintenanceId));
    }

    // --- UC03 & BRULE-01: Pre-Trip Safety Inspection ---
    @PostMapping({"/inspections", "/inspections/pre-trip"})
    @Operation(summary = "Submit 6-point pre-trip safety inspection (UC03, BRULE-01)")
    public ApiResponse<PreTripInspectionResponse> inspection(
            @RequestBody @Valid PreTripInspectionRequest preTripInspectionRequest) {
        return ApiResponse.success("Kiểm tra an toàn trước chuyến đạt yêu cầu",
                assetService.submitPreTripInspection(preTripInspectionRequest));
    }

    @GetMapping("/vehicles/{vehicleId}/inspections/latest")
    @Operation(summary = "Get latest pre-trip inspection for vehicle (UC03)")
    public ApiResponse<PreTripInspectionResponse> getLatestInspection(@PathVariable UUID vehicleId) {
        return ApiResponse.success(assetService.getLatestInspectionByVehicle(vehicleId));
    }
}
