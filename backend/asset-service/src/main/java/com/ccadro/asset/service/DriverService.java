package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.DriverCreateRequest;
import com.ccadro.asset.dto.response.DriverResponse;
import com.ccadro.asset.entity.Driver;
import com.ccadro.asset.entity.enums.DriverStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.DriverMapper;
import com.ccadro.asset.repository.DriverRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản trị hồ sơ và trạng thái tài xế (Driver Domain Service - UC01):
 * - Tạo hồ sơ tài xế, kiểm tra mã nhân sự duy nhất.
 * - Cập nhật trạng thái trực tuyến (AVAILABLE, ON_TRIP, INACTIVE).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverService {

    DriverRepository driverRepository;
    DriverMapper driverMapper;

    public List<DriverResponse> getAllDriversResponse() {
        return driverMapper.toResponseList(driverRepository.findAll());
    }

    public DriverResponse getDriverResponseById(UUID id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
        return driverMapper.toResponse(driver);
    }

    @Transactional
    public DriverResponse createDriver(DriverCreateRequest request) {
        if (driverRepository.findByDriverCode(request.getDriverCode()).isPresent()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã tài xế đã tồn tại: " + request.getDriverCode());
        }
        Driver driver = driverMapper.toEntity(request);
        return driverMapper.toResponse(driverRepository.save(driver));
    }

    @Transactional
    public DriverResponse updateDriverStatus(UUID id, DriverStatus status) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
        driver.setStatus(status);
        return driverMapper.toResponse(driver);
    }

    public void validateDriverExists(UUID driverId) {
        if (!driverRepository.existsById(driverId)) {
            throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        }
    }

    public List<Driver> getAllDrivers() {
        return driverRepository.findAll();
    }

    public Optional<Driver> getDriverByCode(String code) {
        return driverRepository.findByDriverCode(code);
    }
}

