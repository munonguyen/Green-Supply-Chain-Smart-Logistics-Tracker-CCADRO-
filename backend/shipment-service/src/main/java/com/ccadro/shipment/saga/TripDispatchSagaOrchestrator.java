package com.ccadro.shipment.saga;

import com.ccadro.shipment.dto.request.DispatchOrderRequest;
import com.ccadro.shipment.dto.response.DispatchOrderResponse;
import com.ccadro.shipment.entity.DispatchOrder;
import com.ccadro.shipment.entity.OutboxEvent;
import com.ccadro.shipment.entity.SagaStateLog;
import com.ccadro.shipment.entity.Shipment;
import com.ccadro.shipment.exception.AppException;
import com.ccadro.shipment.exception.ErrorCode;
import com.ccadro.shipment.mapper.DispatchOrderMapper;
import com.ccadro.shipment.repository.DispatchOrderRepository;
import com.ccadro.shipment.repository.OutboxEventRepository;
import com.ccadro.shipment.repository.SagaStateLogRepository;
import com.ccadro.shipment.repository.ShipmentRepository;
import com.ccadro.shipment.validator.DispatchEligibilityValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Trip Dispatch Orchestration Saga (UC06):
 * Quản lý giao dịch phân tán giữa 4 Microservices (Shipment, Asset, Routing, Tracking)
 * Tự động chạy Compensating Transactions mở khóa xe/tài xế nếu các bước sau bị sự cố.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripDispatchSagaOrchestrator {

    final ShipmentRepository shipmentRepository;
    final DispatchOrderRepository dispatchOrderRepository;
    final SagaStateLogRepository sagaStateLogRepository;
    final OutboxEventRepository outboxEventRepository;
    final DispatchEligibilityValidator dispatchEligibilityValidator;
    final DispatchOrderMapper dispatchOrderMapper;
    final ObjectMapper objectMapper;

    @Value("${services.routing.url:http://localhost:8083}")
    String routingServiceUrl = "http://localhost:8083";

    @Value("${services.tracking.url:http://localhost:8084}")
    String trackingServiceUrl = "http://localhost:8084";

    @Value("${services.asset.url:http://localhost:8081}")
    String assetServiceUrl = "http://localhost:8081";

    @Value("${ccadro.dispatch.strict-remote-validation:true}")
    boolean strictRemoteValidation = true;

    @Transactional(noRollbackFor = AppException.class)
    public DispatchOrderResponse executeDispatchSaga(DispatchOrderRequest request) {
        Shipment shipment = shipmentRepository.findById(request.getShipmentId())
                .orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND));

        if (Boolean.TRUE.equals(shipment.getIsDeleted())) {
            throw new AppException(ErrorCode.SHIPMENT_NOT_FOUND);
        }

        if ("DISPATCHED".equalsIgnoreCase(shipment.getStatus())
                || dispatchOrderRepository.existsByShipmentId(shipment.getId())) {
            throw new AppException(ErrorCode.SHIPMENT_ALREADY_DISPATCHED);
        }

        if (dispatchOrderRepository.existsByDispatchCode(request.getDispatchCode())) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Mã lệnh điều phối đã tồn tại: " + request.getDispatchCode());
        }

        // Bước 1: Khởi tạo bản ghi Saga Log & Dispatch Order tạm thời
        SagaStateLog sagaLog = SagaStateLog.builder()
                .sagaType("TRIP_DISPATCH_SAGA_UC06")
                .shipmentId(shipment.getId())
                .vehicleId(request.getVehicleId())
                .driverId(request.getDriverId())
                .currentStep("STEP_1_RESERVE_ASSET")
                .sagaStatus("STARTED")
                .build();
        sagaStateLogRepository.save(sagaLog);

        DispatchOrder dispatchOrder = dispatchOrderMapper.toEntity(request);
        dispatchOrder.setStatus("PROCESSING");
        dispatchOrder.setDispatchedAt(Instant.now());
        dispatchOrderRepository.save(dispatchOrder);

        boolean assetLocked = false;
        try {
            // Bước 2: Thẩm định điều kiện xuất bến & Khóa tài sản (Asset Service)
            dispatchEligibilityValidator.validateVehicleAndDriverEligibility(
                    shipment, request.getVehicleId(), request.getDriverId());
            dispatchEligibilityValidator.updateAssetStatusesOnDispatch(
                    request.getVehicleId(), request.getDriverId());
            assetLocked = true;

            sagaLog.setCurrentStep("STEP_2_LOCK_ROUTE");
            sagaStateLogRepository.save(sagaLog);

            // Bước 3: Xác minh hoặc gán phiên bản lộ trình (Routing Service)
            UUID activeRouteVersionId = verifyActiveRoute(shipment.getId());

            sagaLog.setCurrentStep("STEP_3_CREATE_TRIP");
            sagaStateLogRepository.save(sagaLog);

            // Bước 4: Khởi tạo chuyến xe tại Tracking Service
            registerTripWithTrackingService(shipment.getId(), request.getVehicleId(), request.getDriverId(), activeRouteVersionId,
                    shipment.getCustomerId());

            // Bước 5: Hoàn tất thành công (SUCCEEDED)
            dispatchOrder.setStatus("ASSIGNED");
            dispatchOrderRepository.save(dispatchOrder);

            shipment.setStatus("DISPATCHED");
            shipment.setAssignedVehicleId(request.getVehicleId());
            shipment.setAssignedDriverId(request.getDriverId());
            shipment.setUpdatedAt(Instant.now());
            shipmentRepository.save(shipment);

            sagaLog.setCurrentStep("COMPLETED");
            sagaLog.setSagaStatus("SUCCEEDED");
            sagaStateLogRepository.save(sagaLog);

            // Lưu sự kiện vào Transactional Outbox (Chống lỗi Dual-Write)
            saveOutboxEvent("DISPATCH_ORDER", dispatchOrder.getId(), "SHIPMENT_DISPATCHED",
                    "ccadro.shipment.dispatched", Map.of(
                            "dispatchCode", dispatchOrder.getDispatchCode(),
                            "shipmentId", shipment.getId(),
                            "vehicleId", request.getVehicleId(),
                            "driverId", request.getDriverId()
                    ));

            return dispatchOrderMapper.toResponse(dispatchOrder);

        } catch (Exception ex) {
            log.error("Saga TRIP_DISPATCH_SAGA_UC06 thất bại tại bước {}: {}", sagaLog.getCurrentStep(), ex.getMessage());
            sagaLog.setSagaStatus("COMPENSATING");
            sagaLog.setFailureReason(ex.getMessage());
            sagaStateLogRepository.save(sagaLog);

            // Giao dịch bù trừ (Compensating Transaction) nếu xe/tài xế đã bị khóa
            if (assetLocked) {
                compensateAssetReservation(request.getVehicleId(), request.getDriverId());
            }

            dispatchOrder.setStatus("FAILED");
            dispatchOrderRepository.save(dispatchOrder);

            sagaLog.setCurrentStep("COMPENSATED");
            sagaLog.setSagaStatus("ROLLED_BACK");
            sagaStateLogRepository.save(sagaLog);

            saveOutboxEvent("DISPATCH_ORDER", dispatchOrder.getId(), "SAGA_COMPENSATED",
                    "ccadro.shipment.saga-compensated", Map.of(
                            "dispatchCode", dispatchOrder.getDispatchCode(),
                            "reason", ex.getMessage()
                    ));

            if (ex instanceof AppException appException) {
                throw appException;
            }
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Lỗi điều phối Saga: " + ex.getMessage());
        }
    }

    private UUID verifyActiveRoute(UUID shipmentId) {
        try {
            RestClient routingClient = RestClient.builder().baseUrl(routingServiceUrl).build();
            com.ccadro.shipment.dto.ApiResponse<Map<String, Object>> resp = routingClient.get()
                    .uri("/api/v1/routing/versions/{shipmentId}/active", shipmentId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (resp != null && resp.getResult() != null && resp.getResult().get("id") != null) {
                return UUID.fromString(resp.getResult().get("id").toString());
            }
            if (strictRemoteValidation) {
                throw new AppException(ErrorCode.ROUTE_NOT_FOUND,
                        "Đơn hàng " + shipmentId + " chưa có RouteVersion hiệu lực trước khi điều phối");
            }
            return null;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            if (strictRemoteValidation) {
                throw new AppException(ErrorCode.ROUTE_NOT_FOUND,
                        "Không thể xác minh RouteVersion từ Routing Service cho đơn hàng " + shipmentId + ": " + e.getMessage());
            }
            log.info("Non-strict mode: Chưa có phiên bản lộ trình chủ động cho đơn hàng {} ({})", shipmentId, e.getMessage());
            return null;
        }
    }

    private void registerTripWithTrackingService(
            UUID shipmentId, UUID vehicleId, UUID driverId, UUID activeRouteVersionId, String companyCode) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("shipmentId", shipmentId);
            body.put("vehicleId", vehicleId);
            body.put("driverId", driverId);
            body.put("companyCode", companyCode);
            if (activeRouteVersionId != null) {
                body.put("activeRouteVersionId", activeRouteVersionId);
            }

            RestClient trackingClient = RestClient.builder().baseUrl(trackingServiceUrl).build();
            trackingClient.post()
                    .uri("/api/v1/tracking/trips")
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            if (strictRemoteValidation) {
                throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Không thể khởi tạo chuyến xe tại Tracking Service cho đơn " + shipmentId + ": " + e.getMessage());
            }
            log.warn("Non-strict mode: Tracking service chưa ghi nhận chuyến cho đơn {}: {}", shipmentId, e.getMessage());
        }
    }

    /**
     * Giao dịch bù trừ (Compensating Transaction): Mở khóa phương tiện và tài xế về AVAILABLE.
     */
    private void compensateAssetReservation(UUID vehicleId, UUID driverId) {
        try {
            RestClient assetClient = RestClient.builder().baseUrl(assetServiceUrl).build();
            assetClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/assets/vehicles/{id}/status")
                            .queryParam("status", "AVAILABLE")
                            .build(vehicleId))
                    .retrieve()
                    .toBodilessEntity();

            assetClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/assets/drivers/{id}/status")
                            .queryParam("status", "AVAILABLE")
                            .build(driverId))
                    .retrieve()
                    .toBodilessEntity();
            log.warn("Đã thực hiện bù trừ Saga thành công: Mở khóa Xe {} và Tài xế {} về AVAILABLE", vehicleId, driverId);
        } catch (Exception e) {
            log.error("Lỗi khi thực hiện bù trừ giải phóng xe/tài xế: {}", e.getMessage());
        }
    }

    private void saveOutboxEvent(String aggregateType, UUID aggregateId, String eventType, String topic, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .kafkaTopic(topic)
                    .payloadJson(json)
                    .status("PENDING")
                    .retryCount(0)
                    .createdAt(Instant.now())
                    .build();
            outboxEventRepository.save(outboxEvent);
        } catch (Exception e) {
            log.error("Không thể ghi Outbox Event: {}", e.getMessage());
        }
    }
}

