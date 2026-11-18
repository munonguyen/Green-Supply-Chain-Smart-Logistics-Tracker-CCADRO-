package com.ccadro.carbon.service;

import com.ccadro.carbon.dto.ApiResponse;
import com.ccadro.carbon.dto.request.EmissionCalculationRequest;
import com.ccadro.carbon.dto.request.PodSubmissionRequest;
import com.ccadro.carbon.dto.response.PodResponse;
import com.ccadro.carbon.entity.ProofOfDelivery;
import com.ccadro.carbon.exception.AppException;
import com.ccadro.carbon.exception.ErrorCode;
import com.ccadro.carbon.mapper.PodMapper;
import com.ccadro.carbon.repository.ProofOfDeliveryRepository;
import com.ccadro.carbon.validate.CarbonComplianceValidator;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Quản trị xác nhận giao hàng điện tử (Electronic Proof of Delivery - ePOD - UC11):
 * - Ghi nhận cự ly thực tế GPS (GPS_ACTUAL).
 * - Đối soát tải trọng thực tế từ shipment-service & loại nhiên liệu từ asset-service trước khi hạch toán GLEC v3.
 * - Đồng bộ đóng trạng thái chuyến xe (COMPLETED) tại tracking-service.
 */
@Service
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PodService {

    ProofOfDeliveryRepository proofOfDeliveryRepository;
    PodMapper podMapper;

    @Lazy
    EmissionAccountingService emissionAccountingService;

    CarbonComplianceValidator carbonComplianceValidator;

    public PodService(
            ProofOfDeliveryRepository proofOfDeliveryRepository,
            PodMapper podMapper,
            @Lazy EmissionAccountingService emissionAccountingService) {
        this(proofOfDeliveryRepository, podMapper, emissionAccountingService,
                new CarbonComplianceValidator(proofOfDeliveryRepository));
    }

    @Autowired
    public PodService(
            ProofOfDeliveryRepository proofOfDeliveryRepository,
            PodMapper podMapper,
            @Lazy EmissionAccountingService emissionAccountingService,
            CarbonComplianceValidator carbonComplianceValidator) {
        this.proofOfDeliveryRepository = proofOfDeliveryRepository;
        this.podMapper = podMapper;
        this.emissionAccountingService = emissionAccountingService;
        this.carbonComplianceValidator = carbonComplianceValidator;
    }

    @NonFinal
    @Value("${services.shipment.url:http://localhost:8082}")
    String shipmentServiceUrl = "http://localhost:8082";

    @NonFinal
    @Value("${services.asset.url:http://localhost:8081}")
    String assetServiceUrl = "http://localhost:8081";

    @NonFinal
    @Value("${services.tracking.url:http://localhost:8084}")
    String trackingServiceUrl = "http://localhost:8084";

    @Transactional
    public PodResponse submitPodAndCalculateEmissions(PodSubmissionRequest request) {
        carbonComplianceValidator.ensurePodNotYetSubmitted(request.getTripId());

        ProofOfDelivery pod = podMapper.toEntity(request);
        pod.setDeliveryTime(Instant.now());
        pod.setDistanceSource("GPS_ACTUAL");
        pod.setIsQualityApproved(false);
        carbonComplianceValidator.requirePositiveActualDistance(pod);
        ProofOfDelivery savedPod = proofOfDeliveryRepository.save(pod);

        ShipmentVehicleContext context = resolveShipmentAndVehicleContext(request);

        EmissionCalculationRequest calcRequest = EmissionCalculationRequest.builder()
                .tripId(request.getTripId())
                .calculationType("POST_TRIP_ACCOUNTING")
                .cargoPayloadTons(context.payloadTons())
                .totalDistanceKm(savedPod.getActualDistanceKm())
                .emptyRunningDistanceKm(BigDecimal.ZERO)
                .fuelType(context.fuelType())
                .euroStandard(context.euroStandard())
                .build();
        emissionAccountingService.calculateGlecV3Emissions(calcRequest);

        completeTripBestEffort(request.getTripId());

        return podMapper.toResponse(savedPod);
    }

    private ShipmentVehicleContext resolveShipmentAndVehicleContext(PodSubmissionRequest request) {
        BigDecimal payloadTons = request.getCargoPayloadTons();
        String fuelType = request.getFuelType();
        String euroStandard = request.getEuroStandard();
        UUID vehicleId = null;

        if (payloadTons == null || fuelType == null || fuelType.isBlank() || euroStandard == null || euroStandard.isBlank()) {
            try {
                RestClient shipmentClient = RestClient.builder().baseUrl(shipmentServiceUrl).build();
                ApiResponse<Map<String, Object>> shipResp = shipmentClient.get()
                        .uri("/api/v1/shipments/{id}", request.getShipmentId())
                        .retrieve()
                        .body(new ParameterizedTypeReference<>() {});
                if (shipResp != null && shipResp.getResult() != null) {
                    Map<String, Object> shipData = shipResp.getResult();
                    if (payloadTons == null && shipData.get("cargoWeightTons") != null) {
                        payloadTons = new BigDecimal(shipData.get("cargoWeightTons").toString());
                    }
                    if (shipData.get("assignedVehicleId") != null) {
                        vehicleId = UUID.fromString(shipData.get("assignedVehicleId").toString());
                    }
                }
            } catch (Exception ex) {
                log.warn("Không thể tra cứu tải trọng Shipment {} từ shipment-service ({}), dùng giá trị dự phòng",
                        request.getShipmentId(), ex.getMessage());
            }
        }

        if (vehicleId != null && (fuelType == null || fuelType.isBlank() || euroStandard == null || euroStandard.isBlank())) {
            try {
                RestClient assetClient = RestClient.builder().baseUrl(assetServiceUrl).build();
                ApiResponse<Map<String, Object>> vehResp = assetClient.get()
                        .uri("/api/v1/assets/vehicles/{id}", vehicleId)
                        .retrieve()
                        .body(new ParameterizedTypeReference<>() {});
                if (vehResp != null && vehResp.getResult() != null) {
                    Map<String, Object> veh = vehResp.getResult();
                    if ((fuelType == null || fuelType.isBlank()) && veh.get("fuelType") != null) {
                        fuelType = veh.get("fuelType").toString();
                    }
                    if ((euroStandard == null || euroStandard.isBlank()) && veh.get("euroStandard") != null) {
                        euroStandard = veh.get("euroStandard").toString();
                    }
                }
            } catch (Exception ex) {
                log.warn("Không thể tra cứu loại nhiên liệu phương tiện {} từ asset-service ({})", vehicleId, ex.getMessage());
            }
        }

        if (payloadTons == null || payloadTons.signum() <= 0 || fuelType == null || fuelType.isBlank() || euroStandard == null || euroStandard.isBlank())
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,"Thiếu tải trọng, nhiên liệu hoặc tiêu chuẩn phương tiện thực tế");
        return new ShipmentVehicleContext(payloadTons, fuelType.trim().toUpperCase(), euroStandard.trim().toUpperCase());
    }

    private void completeTripBestEffort(UUID tripId) {
        try {
            RestClient trackingClient = RestClient.builder().baseUrl(trackingServiceUrl).build();
            trackingClient.put()
                    .uri("/api/v1/tracking/trips/{tripId}/complete", tripId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.debug("Đồng bộ hoàn thành Trip {} sang tracking-service bỏ qua ({})", tripId, ex.getMessage());
        }
    }

    private record ShipmentVehicleContext(BigDecimal payloadTons, String fuelType, String euroStandard) {}
}
