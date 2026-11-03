package com.ccadro.shipment.validator;

import com.ccadro.shipment.dto.ApiResponse;
import com.ccadro.shipment.entity.Shipment;
import com.ccadro.shipment.exception.AppException;
import com.ccadro.shipment.exception.ErrorCode;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Validator nghiệp vụ điều phối xuất bến (UC06, BRULE-01, BRULE-03):
 * - Đối soát trạng thái sẵn sàng kỹ thuật của xe (AVAILABLE vs MAINTENANCE/IN_TRANSIT)
 * - Kiểm soát tải trọng hàng hóa không vượt quá tải trọng định mức của phương tiện (Chống quá tải)
 * - Đối soát tính khả dụng của tài xế (AVAILABLE)
 */
@Component
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DispatchEligibilityValidator {

    RestClient assetRestClient;

    public DispatchEligibilityValidator(@Value("${services.asset.url:http://localhost:8081}") String assetServiceUrl) {
        this.assetRestClient = RestClient.builder().baseUrl(assetServiceUrl).build();
    }

    /**
     * Xác thực điều kiện xuất bến của phương tiện và tài xế trước khi phát hành lệnh điều phối.
     */
    public void validateVehicleAndDriverEligibility(Shipment shipment, UUID vehicleId, UUID driverId) {
        validateVehicle(shipment, vehicleId);
        validateDriver(driverId);
    }

    private void validateVehicle(Shipment shipment, UUID vehicleId) {
        try {
            ApiResponse<Map<String, Object>> vehicleResp = assetRestClient.get()
                    .uri("/api/v1/assets/vehicles/{id}", vehicleId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (vehicleResp == null || vehicleResp.getResult() == null) {
                throw new AppException(ErrorCode.VEHICLE_NOT_FOUND);
            }

            Map<String, Object> vehicleData = vehicleResp.getResult();
            String status = String.valueOf(vehicleData.get("status"));

            // BRULE-01: Phương tiện phải ở trạng thái sẵn sàng (AVAILABLE)
            if (!"AVAILABLE".equalsIgnoreCase(status)) {
                throw new AppException(ErrorCode.VEHICLE_MAINTENANCE_REQUIRED,
                        "Phương tiện không ở trạng thái sẵn sàng (status = " + status + ")");
            }

            // BRULE-03: Kiểm tra chống quá tải trọng xe
            Object maxPayloadObj = vehicleData.get("maxPayloadTons");
            if (maxPayloadObj != null && shipment.getCargoWeightTons() != null) {
                BigDecimal maxPayload = new BigDecimal(maxPayloadObj.toString());
                if (shipment.getCargoWeightTons().compareTo(maxPayload) > 0) {
                    throw new AppException(ErrorCode.INVALID_CARGO_WEIGHT,
                            "Khối lượng hàng (" + shipment.getCargoWeightTons()
                                    + " tấn) vượt tải trọng xe (" + maxPayload + " tấn)!");
                }
            }
        } catch (HttpClientErrorException.NotFound e) {
            throw new AppException(ErrorCode.VEHICLE_NOT_FOUND);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Không thể kết nối trực tiếp tới Asset Service để đối soát xe: {}", e.getMessage());
        }
    }

    private void validateDriver(UUID driverId) {
        try {
            ApiResponse<Map<String, Object>> driverResp = assetRestClient.get()
                    .uri("/api/v1/assets/drivers/{id}", driverId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (driverResp == null || driverResp.getResult() == null) {
                throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
            }

            String driverStatus = String.valueOf(driverResp.getResult().get("status"));
            if (!"AVAILABLE".equalsIgnoreCase(driverStatus)) {
                throw new AppException(ErrorCode.DRIVER_NOT_AVAILABLE);
            }
        } catch (HttpClientErrorException.NotFound e) {
            throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Không thể kết nối trực tiếp tới Asset Service để đối soát tài xế: {}", e.getMessage());
        }
    }

    /**
     * Đồng bộ cập nhật trạng thái phương tiện -> IN_TRANSIT và tài xế -> ON_DUTY sau khi xuất bến thành công.
     */
    public void updateAssetStatusesOnDispatch(UUID vehicleId, UUID driverId) {
        try {
            assetRestClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/assets/vehicles/{id}/status")
                            .queryParam("status", "IN_TRANSIT")
                            .build(vehicleId))
                    .retrieve()
                    .toBodilessEntity();

            assetRestClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/assets/drivers/{id}/status")
                            .queryParam("status", "ON_TRIP")
                            .build(driverId))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Cập nhật trạng thái thành công: Xe {} -> IN_TRANSIT, Tài xế {} -> ON_TRIP", vehicleId, driverId);
        } catch (Exception e) {
            log.warn("Không thể cập nhật trạng thái xe/tài xế sang IN_TRANSIT/ON_DUTY: {}", e.getMessage());
        }
    }
}

