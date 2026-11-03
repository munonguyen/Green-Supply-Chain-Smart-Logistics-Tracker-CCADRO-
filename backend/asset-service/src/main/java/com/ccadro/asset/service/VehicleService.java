package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.VehicleCreateRequest;
import com.ccadro.asset.dto.response.VehicleResponse;
import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.VehicleMapper;
import com.ccadro.asset.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản trị hồ sơ và trạng thái phương tiện (Vehicle Domain Service - UC01):
 * - Tạo xe, kiểm tra trùng lặp biển số và mã xe (BRULE-02).
 * - Cập nhật trạng thái xe (AVAILABLE, MAINTENANCE, ON_TRIP, INACTIVE).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VehicleService {

    VehicleRepository vehicleRepository;
    VehicleMapper vehicleMapper;

    public List<VehicleResponse> getAllVehiclesResponse() {
        return vehicleMapper.toResponseList(vehicleRepository.findAll());
    }

    public VehicleResponse getVehicleResponseById(UUID id) {
        return vehicleMapper.toResponse(findVehicleOrThrow(id));
    }

    @Transactional
    public VehicleResponse createVehicle(VehicleCreateRequest request) {
        if (vehicleRepository.findByVehicleCode(request.getVehicleCode()).isPresent()) {
            throw new AppException(ErrorCode.VEHICLE_ALREADY_EXISTS);
        }
        if (vehicleRepository.findByPlateNumber(request.getPlateNumber()).isPresent()) {
            throw new AppException(ErrorCode.VEHICLE_ALREADY_EXISTS);
        }
        Vehicle vehicle = vehicleMapper.toEntity(request);
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        return vehicleMapper.toResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse updateVehicleStatus(UUID id, VehicleStatus status) {
        Vehicle vehicle = findVehicleOrThrow(id);
        vehicle.setStatus(status);
        return vehicleMapper.toResponse(vehicle);
    }

    public Vehicle findVehicleOrThrow(UUID id) {
        return vehicleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
    }

    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    public Optional<Vehicle> getVehicleByCode(String code) {
        return vehicleRepository.findByVehicleCode(code);
    }
}

