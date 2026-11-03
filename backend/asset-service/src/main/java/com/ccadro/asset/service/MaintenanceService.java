package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.VehicleMaintenanceRequest;
import com.ccadro.asset.dto.response.VehicleMaintenanceResponse;
import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.entity.VehicleMaintenance;
import com.ccadro.asset.entity.enums.MaintenanceStatus;
import com.ccadro.asset.entity.enums.MaintenanceType;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.VehicleMaintenanceMapper;
import com.ccadro.asset.repository.VehicleMaintenanceRepository;
import com.ccadro.asset.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Quản trị bảo dưỡng và sẵn sàng kỹ thuật phương tiện (Vehicle Maintenance Service - UC02):
 * - Lên lịch bảo dưỡng định kỳ/khẩn cấp.
 * - Khóa xe sang MAINTENANCE ngay lập tức khi phát sinh sự cố kỹ thuật (BRULE-01).
 * - Nghiệm thu hoàn thành bảo dưỡng và mở khóa xe về AVAILABLE.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MaintenanceService {

    VehicleRepository vehicleRepository;
    VehicleMaintenanceRepository vehicleMaintenanceRepository;
    VehicleMaintenanceMapper vehicleMaintenanceMapper;

    public List<VehicleMaintenanceResponse> getVehicleMaintenances(UUID vehicleId) {
        if (!vehicleRepository.existsById(vehicleId)) {
            throw new AppException(ErrorCode.VEHICLE_NOT_FOUND);
        }
        return vehicleMaintenanceMapper.toResponseList(
                vehicleMaintenanceRepository.findByVehicleIdOrderByScheduledDateDesc(vehicleId));
    }

    @Transactional
    public VehicleMaintenanceResponse scheduleMaintenance(VehicleMaintenanceRequest request) {
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        VehicleMaintenance maintenance = vehicleMaintenanceMapper.toEntity(request);

        // BRULE-01: Bảo dưỡng khẩn cấp hoặc sửa chữa khắc phục sẽ khóa trạng thái xe sang MAINTENANCE ngay lập tức
        if (maintenance.getMaintenanceType() == MaintenanceType.EMERGENCY
                || maintenance.getMaintenanceType() == MaintenanceType.CORRECTIVE) {
            maintenance.setStatus(MaintenanceStatus.IN_PROGRESS);
            vehicle.setStatus(VehicleStatus.MAINTENANCE);
        } else {
            maintenance.setStatus(MaintenanceStatus.SCHEDULED);
        }

        return vehicleMaintenanceMapper.toResponse(vehicleMaintenanceRepository.save(maintenance));
    }

    @Transactional
    public VehicleMaintenanceResponse completeMaintenance(UUID maintenanceId) {
        VehicleMaintenance maintenance = vehicleMaintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không tìm thấy phiếu bảo dưỡng"));

        maintenance.setStatus(MaintenanceStatus.COMPLETED);
        maintenance.setCompletedDate(LocalDate.now());

        Vehicle vehicle = vehicleRepository.findById(maintenance.getVehicleId())
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        vehicle.setStatus(VehicleStatus.AVAILABLE);

        return vehicleMaintenanceMapper.toResponse(maintenance);
    }
}

