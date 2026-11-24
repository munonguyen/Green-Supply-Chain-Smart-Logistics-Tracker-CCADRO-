package com.ccadro.asset.service;

import com.ccadro.asset.dto.ChecklistEvaluation;
import com.ccadro.asset.dto.request.PreTripInspectionRequest;
import com.ccadro.asset.dto.response.PreTripInspectionResponse;
import com.ccadro.asset.entity.PreTripInspection;
import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.exception.InspectionFailedException;
import com.ccadro.asset.mapper.PreTripInspectionMapper;
import com.ccadro.asset.repository.DriverRepository;
import com.ccadro.asset.repository.PreTripInspectionRepository;
import com.ccadro.asset.repository.VehicleRepository;
import com.ccadro.asset.validate.AssetBusinessValidator;
import com.ccadro.asset.application.port.InspectionChecklistEncoder;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Kiểm tra an toàn kỹ thuật 6 điểm tiền xuất bến (Pre-Trip Inspection Service - UC03):
 * - Đánh giá 6 tiêu chí an toàn (lốp, phanh, đèn, dầu, chằng buộc, cứu hộ).
 * - Lưu biên bản kiểm tra kể cả khi thất bại (noRollbackFor = InspectionFailedException).
 * - Khóa xe sang MAINTENANCE nếu vi phạm an toàn (BRULE-01).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor(onConstructor_ = @Autowired)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PreTripInspectionService {

    VehicleRepository vehicleRepository;
    DriverRepository driverRepository;
    PreTripInspectionRepository preTripInspectionRepository;
    PreTripInspectionMapper preTripInspectionMapper;
    InspectionChecklistEncoder checklistEncoder;
    AssetBusinessValidator assetBusinessValidator;

    @Transactional(noRollbackFor = InspectionFailedException.class)
    public PreTripInspectionResponse submitPreTripInspection(PreTripInspectionRequest request) {
        Vehicle vehicle = assetBusinessValidator.requireVehicleForPreTrip(request.getVehicleId());
        assetBusinessValidator.requireDriverExists(request.getDriverId());

        ChecklistEvaluation eval = ChecklistEvaluation.from(request);

        if (vehicle.getStatus() == VehicleStatus.MAINTENANCE && eval.allPassed()) {
            throw new AppException(ErrorCode.VEHICLE_MAINTENANCE_REQUIRED,
                    "Xe đang trong trạng thái bảo dưỡng (MAINTENANCE), cần Safety Manager nghiệm thu hoàn tất bảo dưỡng trước khi xuất bến.");
        }

        if (!eval.allPassed() || vehicle.getStatus() != VehicleStatus.ASSIGNED) {
            vehicle.setStatus(eval.getTargetVehicleStatus());
        }
        PreTripInspection inspection = buildInspectionEntity(request, eval);

        preTripInspectionRepository.save(inspection);

        if (request.getDriverId() != null) {
            driverRepository.findById(request.getDriverId()).ifPresent(drv -> {
                drv.setPreTripPassed(eval.allPassed());
                String timeStr = java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
                        .withZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                        .format(Instant.now());
                drv.setPreTripTime(eval.allPassed()
                        ? timeStr + " (6/6 Đạt)"
                        : timeStr + " (Không đạt " + eval.failuresCount() + " mục)");
                driverRepository.save(drv);
            });
        }

        if (!eval.allPassed()) {
            throw new InspectionFailedException(ErrorCode.PRE_TRIP_INSPECTION_FAILED);
        }

        return preTripInspectionMapper.toResponse(inspection);
    }

    public PreTripInspectionResponse getLatestInspectionByVehicle(UUID vehicleId) {
        PreTripInspection inspection = preTripInspectionRepository
                .findFirstByVehicleIdOrderByInspectionTimeDesc(vehicleId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Chưa có biên bản kiểm tra an toàn cho phương tiện này"));
        return preTripInspectionMapper.toResponse(inspection);
    }

    private PreTripInspection buildInspectionEntity(PreTripInspectionRequest request, ChecklistEvaluation eval) {
        PreTripInspection inspection = preTripInspectionMapper.toEntity(request);
        inspection.setCriticalFailuresCount(eval.failuresCount());
        inspection.setChecklistJson(checklistEncoder.encode(eval.items()));
        inspection.setStatus(eval.getInspectionStatus());
        inspection.setInspectionTime(Instant.now());
        return inspection;
    }

}

