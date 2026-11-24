package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ContainerAssignTripRequest;
import com.ccadro.asset.dto.request.ContainerCscUpdateRequest;
import com.ccadro.asset.dto.request.ContainerCreateRequest;
import com.ccadro.asset.dto.request.ContainerEpodRequest;
import com.ccadro.asset.dto.request.ContainerManifestItemCreateRequest;
import com.ccadro.asset.dto.request.ContainerTelemetryUpdateRequest;
import com.ccadro.asset.dto.response.ContainerResponse;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.Driver;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.DriverStatus;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.ContainerMapper;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.DriverRepository;
import com.ccadro.asset.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản trị thùng hàng và container thông minh (Smart Container & IoT Telematics - UC01 & Driver Operations).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ContainerService {

    ContainerRepository containerRepository;
    DriverRepository driverRepository;
    VehicleRepository vehicleRepository;
    ContainerMapper containerMapper;
    DriverDispatchEligibility driverEligibility;
    ContainerControlService controlService;

    public List<ContainerResponse> getAllContainersResponse(ContainerStatus status, UUID driverId) {
        return getAllContainersResponse(status, driverId, null, false);
    }

    public List<ContainerResponse> getAllContainersResponse(
            ContainerStatus status,
            UUID driverId,
            String q,
            boolean includeDeleted) {
        List<Container> containers;
        if (status != null && driverId != null) {
            containers = containerRepository.findByStatusAndAssignedDriverId(status, driverId);
        } else if (status != null) {
            containers = containerRepository.findByStatus(status);
        } else if (driverId != null) {
            containers = containerRepository.findByAssignedDriverId(driverId);
        } else {
            containers = containerRepository.findAll();
        }
        List<Container> active = containers.stream()
                .filter(c -> includeDeleted || !Boolean.TRUE.equals(c.getIsDeleted()))
                .toList();
        List<Container> ranked = ElasticSearchSupport.filterAndRank(
                active,
                q,
                c -> List.of(
                        new ElasticSearchSupport.WeightedField(c.getContainerCode(), 5.0),
                        new ElasticSearchSupport.WeightedField(c.getAssignedShipmentCode(), 4.5),
                        new ElasticSearchSupport.WeightedField(c.getVehicleLicensePlate(), 3.5),
                        new ElasticSearchSupport.WeightedField(c.getDriverName(), 3.5),
                        new ElasticSearchSupport.WeightedField(c.getOriginName(), 2.5),
                        new ElasticSearchSupport.WeightedField(c.getDestinationName(), 2.5),
                        new ElasticSearchSupport.WeightedField(c.getOwnerName(), 2.5),
                        new ElasticSearchSupport.WeightedField(c.getESealNumber(), 3.0),
                        new ElasticSearchSupport.WeightedField(c.getStatus() != null ? c.getStatus().name() : "", 1.5)
                )
        );
        return containerMapper.toResponseList(ranked);
    }

    @Transactional
    public ContainerResponse softDeleteContainer(String containerCode, String deletedBy) {
        Container container = containerRepository.findForControlUpdate(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));
        container.setIsDeleted(true);
        container.setDeletedAt(Instant.now());
        container.setDeletedBy(deletedBy != null && !deletedBy.isBlank() ? deletedBy : "ADMIN");
        return containerMapper.toResponse(containerRepository.save(container));
    }

    @Transactional
    public ContainerResponse restoreContainer(String containerCode) {
        Container container = containerRepository.findForControlUpdate(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));
        container.setIsDeleted(false);
        container.setDeletedAt(null);
        container.setDeletedBy(null);
        return containerMapper.toResponse(containerRepository.save(container));
    }

    public ContainerResponse getContainerByCode(String containerCode) {
        Container container = containerRepository.findByContainerCode(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));
        return containerMapper.toResponse(container);
    }

    @Transactional
    public ContainerResponse createContainer(ContainerCreateRequest request) {
        if (containerRepository.findByContainerCode(request.getContainerCode()).isPresent()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã container đã tồn tại: " + request.getContainerCode());
        }
        Container container = containerMapper.toEntity(request);
        if (container.getStatus() == null) {
            container.setStatus(ContainerStatus.AVAILABLE);
        }
        return containerMapper.toResponse(containerRepository.save(container));
    }

    @Transactional
    public ContainerResponse updateCscData(String containerCode, ContainerCscUpdateRequest request) {
        Container container = containerRepository.findForControlUpdate(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Không tìm thấy container có mã: " + containerCode));
        if (container.getStatus() == ContainerStatus.IN_TRANSIT
                || (container.getStatus() == ContainerStatus.ASSIGNED
                    && controlService.isConfirmed(containerCode, "DEPARTURE"))) {
            throw new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT,
                    "Không sửa hồ sơ CSC sau khi xuất bến");
        }
        container.setCscApprovalCountry(clean(request.getCscApprovalCountry()));
        container.setCscApprovalReference(clean(request.getCscApprovalReference()));
        container.setCscManufactureDate(request.getCscManufactureDate());
        String scheme = clean(request.getCscInspectionScheme());
        container.setCscInspectionScheme(scheme);
        if ("PERIODIC".equals(scheme)) {
            container.setCscNextExaminationDate(request.getCscNextExaminationDate());
            container.setCscAcepProgramNumber(null);
        } else if ("ACEP".equals(scheme)) {
            container.setCscNextExaminationDate(null);
            container.setCscAcepProgramNumber(clean(request.getCscAcepProgramNumber()));
        } else {
            container.setCscNextExaminationDate(null);
            container.setCscAcepProgramNumber(null);
        }
        return containerMapper.toResponse(containerRepository.save(container));
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional
    public void checkManifestAddition(String code, ContainerManifestItemCreateRequest request) {
        Container container = containerRepository.findForControlUpdate(code)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));
        if (Boolean.TRUE.equals(container.getIsDeleted()) || (container.getStatus() != ContainerStatus.AVAILABLE
                && container.getStatus() != ContainerStatus.ASSIGNED)
                || (controlService.hasActiveRound(code) && controlService.isConfirmed(code, "PREPARATION"))) {
            throw new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT, "Manifest chỉ được thêm trước khi xác nhận chuẩn bị");
        }
        if (container.getAssignedShipmentCode() != null
                && !container.getAssignedShipmentCode().equals(request.getShipmentCode().trim())) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã vận đơn phải trùng vận đơn được phân công");
        }
        if (Boolean.TRUE.equals(request.getRequiresColdChain())
                && (!Boolean.TRUE.equals(container.getIsReefer()) || request.getRequiredTempC() == null)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Hàng chuỗi lạnh cần container lạnh và nhiệt độ yêu cầu");
        }
    }

    @Transactional
    public ContainerResponse updateTelemetry(String containerCode, ContainerTelemetryUpdateRequest request) {
        return updateTelemetry(containerCode, request, null);
    }

    @Transactional
    public ContainerResponse updateTelemetry(String containerCode, ContainerTelemetryUpdateRequest request, Instant positionObservedAt) {
        Container container = containerRepository.findForControlUpdate(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        boolean hasPosition = request.getLastLatitude() != null && request.getLastLongitude() != null;
        if ((request.getLastLatitude() == null) != (request.getLastLongitude() == null)
                || (hasPosition && (request.getLastLatitude().abs().compareTo(BigDecimal.valueOf(90)) > 0
                || request.getLastLongitude().abs().compareTo(BigDecimal.valueOf(180)) > 0))) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Cần cặp tọa độ GPS hợp lệ");
        }
        boolean signal = hasPosition
                || request.getLastLocationName() != null
                || request.getProgressPct() != null || request.getSpeedKmh() != null || request.getEtaMinutes() != null
                || request.getSupplyAirTempC() != null || request.getReturnAirTempC() != null
                || request.getReeferSetPointTempC() != null || request.getReeferTemperatureAlarmStatus() != null
                || request.getHumidityPct() != null || request.getShockG() != null
                || request.getSolarPowerWatts() != null || request.getBatteryPct() != null
                || request.getESealStatus() != null || request.getESealIntegrityPct() != null;
        Instant receivedAt = Instant.now();
        if (signal) container.setLastTelemetryReceivedAt(receivedAt);
        if (request.getLastLocationName() != null) container.setLastLocationNameAt(receivedAt);
        if (request.getProgressPct() != null) container.setLastProgressAt(receivedAt);
        if (request.getSpeedKmh() != null) container.setLastSpeedAt(receivedAt);
        if (request.getSupplyAirTempC() != null) container.setLastSupplyAirTempAt(receivedAt);
        if (request.getReturnAirTempC() != null) container.setLastReturnAirTempAt(receivedAt);
        if (request.getReeferSetPointTempC() != null) container.setLastReeferSetPointAt(receivedAt);
        if (request.getReeferTemperatureAlarmStatus() != null) container.setLastReeferAlarmAt(receivedAt);
        if (request.getHumidityPct() != null) container.setLastHumidityAt(receivedAt);
        if (request.getShockG() != null) container.setLastShockAt(receivedAt);
        if (request.getSolarPowerWatts() != null) container.setLastSolarPowerAt(receivedAt);
        if (request.getBatteryPct() != null) container.setLastBatteryAt(receivedAt);
        if (request.getEtaMinutes() != null) container.setLastEtaAt(receivedAt);
        if (request.getESealStatus() != null || request.getESealIntegrityPct() != null) {
            container.setLastSealAt(receivedAt);
        }
        if (hasPosition) {
            container.setLastPositionReceivedAt(receivedAt);
            container.setLastPositionObservedAt(positionObservedAt != null ? positionObservedAt : receivedAt);
            container.setLastLatitude(request.getLastLatitude());
            container.setLastLongitude(request.getLastLongitude());
            container.setLastLocationName(request.getLastLocationName());
        } else if (request.getLastLocationName() != null) {
            container.setLastLocationName(request.getLastLocationName());
        }
        if (request.getProgressPct() != null) container.setProgressPct(request.getProgressPct());
        if (request.getSpeedKmh() != null) container.setSpeedKmh(request.getSpeedKmh());
        if (request.getEtaMinutes() != null) container.setEtaMinutes(request.getEtaMinutes());
        if (request.getSupplyAirTempC() != null) container.setSupplyAirTempC(request.getSupplyAirTempC());
        if (request.getReturnAirTempC() != null) container.setReturnAirTempC(request.getReturnAirTempC());
        if (request.getReeferSetPointTempC() != null) container.setReeferSetPointTempC(request.getReeferSetPointTempC());
        if (request.getReeferTemperatureAlarmStatus() != null) container.setReeferTemperatureAlarmStatus(request.getReeferTemperatureAlarmStatus());
        if (request.getHumidityPct() != null) container.setHumidityPct(request.getHumidityPct());
        if (request.getShockG() != null) container.setShockG(request.getShockG());
        if (request.getSolarPowerWatts() != null) container.setSolarPowerWatts(request.getSolarPowerWatts());
        if (request.getBatteryPct() != null) container.setBatteryPct(request.getBatteryPct());
        if (request.getESealStatus() != null) container.setESealStatus(request.getESealStatus());
        if (request.getESealIntegrityPct() != null) container.setESealIntegrityPct(request.getESealIntegrityPct());

        return containerMapper.toResponse(containerRepository.save(container));
    }

    @Transactional
    public ContainerResponse assignTrip(String containerCode, ContainerAssignTripRequest request) {
        Container container = containerRepository.findForControlUpdate(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        boolean controlled = controlService.hasRound(containerCode);
        if (!controlled || !controlService.hasActiveRound(containerCode)) {
            throw new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT,
                    "Mở đợt kiểm soát hiện hành trước khi phân công container");
        }
        if (container.getStatus() != ContainerStatus.AVAILABLE
                || controlService.isConfirmed(containerCode, "DEPARTURE"))
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không phân công lại sau xuất bến; cần hoàn tất đợt hiện tại");
        if (request.getAssignedDriverId() == null) {
            throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        }
        if (request.getAssignedVehicleId() == null || request.getAssignedShipmentId() == null
                || request.getAssignedShipmentCode() == null || request.getAssignedShipmentCode().isBlank()
                || request.getOriginName() == null || request.getOriginName().isBlank()
                || request.getDestinationName() == null || request.getDestinationName().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Thiếu xe, vận đơn hoặc hành trình");
        }
        var vehicle = vehicleRepository.findForAssignment(request.getAssignedVehicleId())
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        Driver assignedDriver = driverRepository.findForAssignment(request.getAssignedDriverId())
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
        var qualification = driverEligibility.requireAvailable(assignedDriver.getId());
        if (vehicle.getStatus() != VehicleStatus.AVAILABLE || Boolean.TRUE.equals(vehicle.getIsDeleted())) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Xe không sẵn sàng phân công");
        }
        vehicle.setStatus(VehicleStatus.ASSIGNED);
        request.setVehicleLicensePlate(vehicle.getPlateNumber());
        request.setVehicleTypeLabel(vehicle.getFuelType());
        container.setAssignedShipmentId(request.getAssignedShipmentId());
        container.setAssignedShipmentCode(request.getAssignedShipmentCode());
        container.setAssignedDriverId(assignedDriver.getId());
        container.setDriverName(assignedDriver.getFullName());
        container.setDriverPhone(assignedDriver.getPhone());
        container.setDriverLicense("GPLX hạng " + qualification.licenseClass());
        container.setDriverSafetyScore(assignedDriver.getRating());
        assignedDriver.setStatus(DriverStatus.ASSIGNED);
        assignedDriver.setAssignedVehiclePlate(vehicle.getPlateNumber());

        container.setAssignedVehicleId(request.getAssignedVehicleId());
        container.setVehicleLicensePlate(request.getVehicleLicensePlate());
        container.setVehicleTypeLabel(request.getVehicleTypeLabel());
        container.setOriginName(request.getOriginName());
        container.setDestinationName(request.getDestinationName());
        container.setStatus(ContainerStatus.ASSIGNED);

        return containerMapper.toResponse(containerRepository.save(container));
    }

    @Transactional
    public ContainerResponse submitEpod(String containerCode, ContainerEpodRequest request) {
        Container container = containerRepository.findForControlUpdate(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        if (controlService.hasRound(containerCode)) {
            if (container.getStatus() == ContainerStatus.DELIVERED) {
                throw new AppException(ErrorCode.POD_ALREADY_SUBMITTED);
            }
            if (container.getStatus() != ContainerStatus.IN_TRANSIT || !controlService.isConfirmed(containerCode, "IN_TRANSIT")) {
                throw new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT, "Cần xác nhận kiểm soát hành trình trước ePOD");
            }
        }
        container.setCompletedAt(Instant.now());
        container.setEpodRecipient(request.getRecipientName());
        container.setEpodSignature(request.getSignature());
        container.setEpodNotes(request.getNotes());
        container.setStatus(ContainerStatus.DELIVERED);
        container.setProgressPct(BigDecimal.valueOf(100.0));
        container.setSpeedKmh(BigDecimal.ZERO);
        container.setEtaMinutes(0);
        container.setESealStatus("UNLOCKED_AUTHORIZED");

        Container saved = containerRepository.save(container);

        // Automatically release assigned driver back to AVAILABLE if no other active trips remain
        if (saved.getAssignedDriverId() != null) {
            boolean hasOtherActive = containerRepository.findByStatusAndAssignedDriverId(
                    ContainerStatus.IN_TRANSIT, saved.getAssignedDriverId()).stream()
                    .anyMatch(c -> !c.getContainerCode().equals(containerCode));
            if (!hasOtherActive) {
                driverRepository.findById(saved.getAssignedDriverId()).ifPresent(drv -> {
                    drv.setStatus(DriverStatus.AVAILABLE);
                    driverRepository.save(drv);
                });
            }
        }

        // Automatically release assigned vehicle back to AVAILABLE if not under MAINTENANCE and no other active container
        if (saved.getAssignedVehicleId() != null) {
            boolean hasOtherActiveVehicle = containerRepository.findByStatusAndAssignedVehicleId(
                    ContainerStatus.IN_TRANSIT, saved.getAssignedVehicleId()).stream()
                    .anyMatch(c -> !c.getContainerCode().equals(containerCode));
            if (!hasOtherActiveVehicle) {
                vehicleRepository.findById(saved.getAssignedVehicleId()).ifPresent(veh -> {
                    if (veh.getStatus() != VehicleStatus.MAINTENANCE) {
                        veh.setStatus(VehicleStatus.AVAILABLE);
                        vehicleRepository.save(veh);
                    }
                });
            }
        }

        return containerMapper.toResponse(saved);
    }

    private Driver resolveDriver(UUID driverId, String phone, String fullName) {
        if (driverId != null) {
            Optional<Driver> byId = driverRepository.findById(driverId);
            if (byId.isPresent()) return byId.get();
        }
        if (phone != null && !phone.isBlank()) {
            Optional<Driver> byPhone = driverRepository.findByPhone(phone.trim());
            if (byPhone.isPresent()) return byPhone.get();
        }
        if (fullName != null && !fullName.isBlank()) {
            return driverRepository.findByFullNameIgnoreCase(fullName.trim()).orElse(null);
        }
        return null;
    }

    @Transactional
    public ContainerResponse updateStatus(String containerCode, ContainerStatus status) {
        Container container = containerRepository.findForControlUpdate(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        if (controlService.hasRound(containerCode) && !(container.getStatus() == ContainerStatus.DELIVERED
                && controlService.isConfirmed(containerCode, "HANDOVER") && status == ContainerStatus.AVAILABLE))
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Cần chuyển trạng thái qua quy trình kiểm soát và ePOD");
        if (status == ContainerStatus.AVAILABLE && controlService.isConfirmed(containerCode, "HANDOVER")) {
            container.setAssignedShipmentId(null);
            container.setAssignedShipmentCode(null);
            container.setAssignedDriverId(null);
            container.setDriverName(null);
            container.setDriverPhone(null);
            container.setDriverLicense(null);
            container.setDriverSafetyScore(null);
            container.setAssignedVehicleId(null);
            container.setVehicleLicensePlate(null);
            container.setVehicleTypeLabel(null);
            container.setOriginName(null);
            container.setDestinationName(null);
            container.setCompletedAt(null);
            container.setEpodRecipient(null);
            container.setEpodSignature(null);
            container.setEpodNotes(null);
        }
        container.setStatus(status);
        return containerMapper.toResponse(containerRepository.save(container));
    }
}
