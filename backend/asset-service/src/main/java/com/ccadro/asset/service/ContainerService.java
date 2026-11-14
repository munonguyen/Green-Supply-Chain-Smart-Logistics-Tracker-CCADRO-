package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ContainerAssignTripRequest;
import com.ccadro.asset.dto.request.ContainerCreateRequest;
import com.ccadro.asset.dto.request.ContainerEpodRequest;
import com.ccadro.asset.dto.request.ContainerTelemetryUpdateRequest;
import com.ccadro.asset.dto.response.ContainerResponse;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.ContainerMapper;
import com.ccadro.asset.repository.ContainerRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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
    ContainerMapper containerMapper;

    public List<ContainerResponse> getAllContainersResponse(ContainerStatus status, UUID driverId) {
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
        return containerMapper.toResponseList(containers);
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
    public ContainerResponse updateTelemetry(String containerCode, ContainerTelemetryUpdateRequest request) {
        Container container = containerRepository.findByContainerCode(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        if (request.getLastLatitude() != null) container.setLastLatitude(request.getLastLatitude());
        if (request.getLastLongitude() != null) container.setLastLongitude(request.getLastLongitude());
        if (request.getLastLocationName() != null) container.setLastLocationName(request.getLastLocationName());
        if (request.getProgressPct() != null) container.setProgressPct(request.getProgressPct());
        if (request.getSpeedKmh() != null) container.setSpeedKmh(request.getSpeedKmh());
        if (request.getEtaMinutes() != null) container.setEtaMinutes(request.getEtaMinutes());
        if (request.getSupplyAirTempC() != null) container.setSupplyAirTempC(request.getSupplyAirTempC());
        if (request.getReturnAirTempC() != null) container.setReturnAirTempC(request.getReturnAirTempC());
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
        Container container = containerRepository.findByContainerCode(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        container.setAssignedShipmentId(request.getAssignedShipmentId());
        container.setAssignedShipmentCode(request.getAssignedShipmentCode());
        container.setAssignedDriverId(request.getAssignedDriverId());
        container.setDriverName(request.getDriverName());
        container.setDriverPhone(request.getDriverPhone());
        container.setDriverLicense(request.getDriverLicense());
        if (request.getDriverSafetyScore() != null) {
            container.setDriverSafetyScore(request.getDriverSafetyScore());
        }
        container.setAssignedVehicleId(request.getAssignedVehicleId());
        container.setVehicleLicensePlate(request.getVehicleLicensePlate());
        container.setVehicleTypeLabel(request.getVehicleTypeLabel());
        container.setOriginName(request.getOriginName());
        container.setDestinationName(request.getDestinationName());
        container.setStatus(ContainerStatus.IN_TRANSIT);

        return containerMapper.toResponse(containerRepository.save(container));
    }

    @Transactional
    public ContainerResponse submitEpod(String containerCode, ContainerEpodRequest request) {
        Container container = containerRepository.findByContainerCode(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        container.setCompletedAt(Instant.now());
        container.setEpodRecipient(request.getRecipientName());
        container.setEpodSignature(request.getSignature());
        container.setStatus(ContainerStatus.DELIVERED);
        container.setProgressPct(BigDecimal.valueOf(100.0));
        container.setSpeedKmh(BigDecimal.ZERO);
        container.setEtaMinutes(0);
        container.setESealStatus("UNLOCKED_AUTHORIZED");

        return containerMapper.toResponse(containerRepository.save(container));
    }

    @Transactional
    public ContainerResponse updateStatus(String containerCode, ContainerStatus status) {
        Container container = containerRepository.findByContainerCode(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container có mã: " + containerCode));

        container.setStatus(status);
        return containerMapper.toResponse(containerRepository.save(container));
    }
}
