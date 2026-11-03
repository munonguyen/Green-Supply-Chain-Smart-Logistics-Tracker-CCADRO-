package com.ccadro.shipment.service;

import com.ccadro.shipment.dto.request.DispatchOrderRequest;
import com.ccadro.shipment.dto.request.ShipmentCreationRequest;
import com.ccadro.shipment.dto.response.DispatchOrderResponse;
import com.ccadro.shipment.dto.response.ShipmentResponse;
import com.ccadro.shipment.entity.Shipment;
import com.ccadro.shipment.exception.AppException;
import com.ccadro.shipment.exception.ErrorCode;
import com.ccadro.shipment.exception.ResourceNotFoundException;
import com.ccadro.shipment.mapper.ShipmentMapper;
import com.ccadro.shipment.repository.ShipmentRepository;
import com.ccadro.shipment.util.DistanceUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Quản lý đơn hàng vận tải (Shipment Domain Service - UC04):
 * - Tạo đơn hàng với tọa độ GPS PostGIS (Point 4326).
 * - Chuẩn hóa cự ly Haversine (DistanceUtils).
 * - Cô lập dữ liệu theo khách hàng (BRULE-16).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShipmentService {

    ShipmentRepository shipmentRepository;
    ShipmentMapper shipmentMapper;
    DispatchOrderService dispatchOrderService;

    public List<ShipmentResponse> getAllShipmentResponses() {
        return shipmentMapper.toResponseList(shipmentRepository.findAll());
    }

    public ShipmentResponse getShipmentResponseById(UUID id) {
        Shipment shipment = findShipmentOrThrow(id);
        return shipmentMapper.toResponse(shipment);
    }

    @Transactional
    public ShipmentResponse createShipmentResponse(ShipmentCreationRequest request) {
        if (shipmentRepository.findByShipmentCode(request.getShipmentCode()).isPresent()) {
            throw new AppException(ErrorCode.SHIPMENT_CODE_EXISTS);
        }
        Shipment shipment = shipmentMapper.toEntity(request);
        DistanceUtils.normalizeDistance(shipment, request);
        return shipmentMapper.toResponse(shipmentRepository.save(shipment));
    }

    /**
     * Ủy quyền lệnh điều vận xuất bến sang DispatchOrderService (TASK-17 / UC06)
     */
    @Transactional
    public DispatchOrderResponse createDispatchOrder(DispatchOrderRequest request) {
        return dispatchOrderService.createDispatchOrder(request);
    }

    public DispatchOrderResponse getDispatchOrderByShipmentId(UUID shipmentId) {
        return dispatchOrderService.getDispatchOrderByShipmentId(shipmentId);
    }

    private Shipment findShipmentOrThrow(UUID id) {
        return shipmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND));
    }

    // --- Legacy methods for backward compatibility ---
    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    public Shipment getShipmentById(UUID id) {
        return shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID: " + id));
    }

    public Shipment getShipmentByCode(String code) {
        return shipmentRepository.findByShipmentCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with code: " + code));
    }

    public List<ShipmentResponse> getShipmentsByCustomerId(String customerId) {
        return shipmentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(shipmentMapper::toResponse)
                .toList();
    }
}
