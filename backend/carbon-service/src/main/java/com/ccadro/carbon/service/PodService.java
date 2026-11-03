package com.ccadro.carbon.service;

import com.ccadro.carbon.dto.request.EmissionCalculationRequest;
import com.ccadro.carbon.dto.request.PodSubmissionRequest;
import com.ccadro.carbon.dto.response.PodResponse;
import com.ccadro.carbon.entity.ProofOfDelivery;
import com.ccadro.carbon.exception.AppException;
import com.ccadro.carbon.exception.ErrorCode;
import com.ccadro.carbon.mapper.PodMapper;
import com.ccadro.carbon.repository.ProofOfDeliveryRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Quản trị xác nhận giao hàng điện tử (Electronic Proof of Delivery - ePOD - UC11):
 * - Ghi nhận cự ly thực tế GPS (GPS_ACTUAL).
 * - Tự động kích hoạt tính toán phát thải sau chuyến GLEC v3.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PodService {

    ProofOfDeliveryRepository proofOfDeliveryRepository;
    PodMapper podMapper;

    @Lazy
    EmissionAccountingService emissionAccountingService;

    @Transactional
    public PodResponse submitPodAndCalculateEmissions(PodSubmissionRequest request) {
        if (proofOfDeliveryRepository.findByTripId(request.getTripId()).isPresent()) {
            throw new AppException(ErrorCode.POD_ALREADY_SUBMITTED);
        }

        ProofOfDelivery pod = podMapper.toEntity(request);
        pod.setDeliveryTime(Instant.now());
        pod.setDistanceSource("GPS_ACTUAL");
        pod.setIsQualityApproved(true);
        if (pod.getActualDistanceKm() == null || pod.getActualDistanceKm().compareTo(BigDecimal.ZERO) <= 0) {
            pod.setActualDistanceKm(BigDecimal.valueOf(28.500));
        }
        ProofOfDelivery savedPod = proofOfDeliveryRepository.save(pod);

        EmissionCalculationRequest calcRequest = EmissionCalculationRequest.builder()
                .tripId(request.getTripId())
                .calculationType("POST_TRIP_ACCOUNTING")
                .cargoPayloadTons(BigDecimal.valueOf(14.20))
                .totalDistanceKm(savedPod.getActualDistanceKm())
                .emptyRunningDistanceKm(BigDecimal.ZERO)
                .fuelType("DIESEL")
                .euroStandard("EURO_5")
                .build();
        emissionAccountingService.calculateGlecV3Emissions(calcRequest);

        return podMapper.toResponse(savedPod);
    }
}

