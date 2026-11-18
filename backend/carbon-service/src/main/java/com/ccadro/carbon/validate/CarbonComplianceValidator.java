package com.ccadro.carbon.validate;

import com.ccadro.carbon.entity.ProofOfDelivery;
import com.ccadro.carbon.exception.AppException;
import com.ccadro.carbon.exception.ErrorCode;
import com.ccadro.carbon.repository.ProofOfDeliveryRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Validator cho quy trình nộp ePOD & hạch toán phát thải GLEC v3 (UC11 / UC12).
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CarbonComplianceValidator {

    ProofOfDeliveryRepository proofOfDeliveryRepository;

    public void ensurePodNotYetSubmitted(UUID tripId) {
        if (proofOfDeliveryRepository.findByTripId(tripId).isPresent()) {
            throw new AppException(ErrorCode.POD_ALREADY_SUBMITTED);
        }
    }

    public void requirePositiveActualDistance(ProofOfDelivery pod) {
        if (pod.getActualDistanceKm() == null || pod.getActualDistanceKm().compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Thiếu cự ly thực tế đã thẩm định; không thể hạch toán GPS_ACTUAL"
            );
        }
    }
}

