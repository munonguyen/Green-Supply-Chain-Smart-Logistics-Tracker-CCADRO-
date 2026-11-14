package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.*;
import com.ccadro.asset.dto.response.*;
import com.ccadro.asset.entity.*;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.DriverStatus;
import com.ccadro.asset.entity.enums.VehicleStatus;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Facade Service điều phối tổng thể phân hệ Tài sản & Phương tiện (Asset Module - UC01, UC02, UC03).
 * Phân rã nghiệp vụ chi tiết vào 5 dịch vụ chuyên trách:
 * 1. VehicleService: Quản trị phương tiện
 * 2. DriverService: Quản trị hồ sơ tài xế
 * 3. ContainerService: Quản trị thùng hàng và smart telematics
 * 4. MaintenanceService: Bảo dưỡng & sẵn sàng kỹ thuật
 * 5. PreTripInspectionService: Biên bản kiểm tra an toàn 6 điểm
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AssetService {

    VehicleService vehicleService;
    DriverService driverService;
    ContainerService containerService;
    MaintenanceService maintenanceService;
    PreTripInspectionService preTripInspectionService;
    ThirdPartyHandoverService thirdPartyHandoverService;

    // --- Vehicle APIs ---
    public List<VehicleResponse> getAllVehiclesResponse() {
        return vehicleService.getAllVehiclesResponse();
    }

    public VehicleResponse getVehicleResponseById(UUID id) {
        return vehicleService.getVehicleResponseById(id);
    }

    @Transactional
    public VehicleResponse createVehicle(VehicleCreateRequest request) {
        return vehicleService.createVehicle(request);
    }

    @Transactional
    public VehicleResponse updateVehicleStatus(UUID id, VehicleStatus status) {
        return vehicleService.updateVehicleStatus(id, status);
    }

    public List<Vehicle> getAllVehicles() {
        return vehicleService.getAllVehicles();
    }

    public Optional<Vehicle> getVehicleByCode(String code) {
        return vehicleService.getVehicleByCode(code);
    }

    // --- Driver APIs ---
    public List<DriverResponse> getAllDriversResponse(DriverStatus status, String licenseClass) {
        return driverService.getAllDriversResponse(status, licenseClass);
    }

    public List<DriverResponse> getAllDriversResponse() {
        return driverService.getAllDriversResponse(null, null);
    }

    public DriverResponse getDriverResponseById(UUID id) {
        return driverService.getDriverResponseById(id);
    }

    @Transactional
    public DriverResponse createDriver(DriverCreateRequest request) {
        return driverService.createDriver(request);
    }

    @Transactional
    public DriverResponse updateDriverProfile(UUID id, DriverUpdateRequest request) {
        return driverService.updateDriverProfile(id, request);
    }

    @Transactional
    public DriverResponse updateDriverStatus(UUID id, DriverStatus status) {
        return driverService.updateDriverStatus(id, status);
    }

    public List<DriverReviewResponse> getDriverReviews(UUID driverId) {
        return driverService.getDriverReviews(driverId);
    }

    @Transactional
    public DriverReviewResponse addDriverReview(UUID driverId, DriverReviewRequest request) {
        return driverService.addDriverReview(driverId, request);
    }

    public List<DriverDispatchMessageResponse> getDriverDispatchMessages(UUID driverId) {
        return driverService.getDriverDispatchMessages(driverId);
    }

    @Transactional
    public DriverDispatchMessageResponse sendDispatchMessage(UUID driverId, DriverDispatchMessageRequest request) {
        return driverService.sendDispatchMessage(driverId, request);
    }

    @Transactional
    public int markDriverMessagesAsRead(UUID driverId, String viewerRole) {
        return driverService.markMessagesAsRead(driverId, viewerRole);
    }

    public List<Driver> getAllDrivers() {
        return driverService.getAllDrivers();
    }

    public Optional<Driver> getDriverByCode(String code) {
        return driverService.getDriverByCode(code);
    }

    // --- Container APIs ---
    public List<ContainerResponse> getAllContainersResponse() {
        return containerService.getAllContainersResponse(null, null);
    }

    public List<ContainerResponse> getAllContainersResponse(ContainerStatus status, UUID driverId) {
        return containerService.getAllContainersResponse(status, driverId);
    }

    public ContainerResponse getContainerByCode(String containerCode) {
        return containerService.getContainerByCode(containerCode);
    }

    @Transactional
    public ContainerResponse createContainer(ContainerCreateRequest request) {
        return containerService.createContainer(request);
    }

    @Transactional
    public ContainerResponse updateContainerTelemetry(String containerCode, ContainerTelemetryUpdateRequest request) {
        return containerService.updateTelemetry(containerCode, request);
    }

    @Transactional
    public ContainerResponse assignContainerTrip(String containerCode, ContainerAssignTripRequest request) {
        return containerService.assignTrip(containerCode, request);
    }

    @Transactional
    public ContainerResponse submitContainerEpod(String containerCode, ContainerEpodRequest request) {
        return containerService.submitEpod(containerCode, request);
    }

    @Transactional
    public ContainerResponse updateContainerStatus(String containerCode, ContainerStatus status) {
        return containerService.updateStatus(containerCode, status);
    }

    // --- Maintenance APIs ---
    public List<VehicleMaintenanceResponse> getVehicleMaintenances(UUID vehicleId) {
        return maintenanceService.getVehicleMaintenances(vehicleId);
    }

    @Transactional
    public VehicleMaintenanceResponse scheduleMaintenance(VehicleMaintenanceRequest request) {
        return maintenanceService.scheduleMaintenance(request);
    }

    @Transactional
    public VehicleMaintenanceResponse completeMaintenance(UUID maintenanceId) {
        return maintenanceService.completeMaintenance(maintenanceId);
    }

    // --- Pre-Trip Inspection APIs ---
    @Transactional
    public PreTripInspectionResponse submitPreTripInspection(PreTripInspectionRequest request) {
        return preTripInspectionService.submitPreTripInspection(request);
    }

    public PreTripInspectionResponse getLatestInspectionByVehicle(UUID vehicleId) {
        return preTripInspectionService.getLatestInspectionByVehicle(vehicleId);
    }

    // --- Third-Party Destination Shipper (3PL) Handover APIs ---
    public List<ThirdPartyHandoverResponse> getAllShipperHandovers() {
        return thirdPartyHandoverService.getAllHandovers();
    }

    @Transactional
    public ThirdPartyHandoverResponse updateShipperHandoverStatus(
            String containerCode, ThirdPartyHandoverUpdateRequest request) {
        return thirdPartyHandoverService.updateHandoverStatus(containerCode, request);
    }

    @Transactional
    public ThirdPartyHandoverResponse syncShipperWebhook(String containerCode) {
        return thirdPartyHandoverService.syncWebhook(containerCode);
    }
}
