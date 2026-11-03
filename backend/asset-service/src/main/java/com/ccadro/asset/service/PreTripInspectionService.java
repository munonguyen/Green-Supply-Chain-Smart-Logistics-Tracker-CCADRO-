package com.ccadro.asset.service;

import com.ccadro.asset.dto.ChecklistEvaluation;
import com.ccadro.asset.dto.request.PreTripInspectionRequest;
import com.ccadro.asset.dto.response.PreTripInspectionResponse;
import com.ccadro.asset.entity.PreTripInspection;
import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.exception.InspectionFailedException;
import com.ccadro.asset.mapper.PreTripInspectionMapper;
import com.ccadro.asset.repository.DriverRepository;
import com.ccadro.asset.repository.PreTripInspectionRepository;
import com.ccadro.asset.repository.VehicleRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Kiểm tra an toàn kỹ thuật 6 điểm tiền xuất bến (Pre-Trip Inspection Service - UC03):
 * - Đánh giá 6 tiêu chí an toàn (lốp, phanh, đèn, dầu, chằng buộc, cứu hộ).
 * - Lưu biên bản kiểm tra kể cả khi thất bại (noRollbackFor = InspectionFailedException).
 * - Khóa xe sang MAINTENANCE nếu vi phạm an toàn (BRULE-01).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PreTripInspectionService {

    VehicleRepository vehicleRepository;
    DriverRepository driverRepository;
    PreTripInspectionRepository preTripInspectionRepository;
    PreTripInspectionMapper preTripInspectionMapper;
    ObjectMapper objectMapper;

    @Transactional(noRollbackFor = InspectionFailedException.class)
    public PreTripInspectionResponse submitPreTripInspection(PreTripInspectionRequest request) {
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));

        if (!driverRepository.existsById(request.getDriverId())) {
            throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        }

        ChecklistEvaluation eval = ChecklistEvaluation.from(request);

        vehicle.setStatus(eval.getTargetVehicleStatus());
        PreTripInspection inspection = buildInspectionEntity(request, eval);

        preTripInspectionRepository.save(inspection);

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
        inspection.setChecklistJson(toJson(eval.items()));
        inspection.setStatus(eval.getInspectionStatus());
        inspection.setInspectionTime(Instant.now());
        return inspection;
    }

    private String toJson(Map<String, String> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}

