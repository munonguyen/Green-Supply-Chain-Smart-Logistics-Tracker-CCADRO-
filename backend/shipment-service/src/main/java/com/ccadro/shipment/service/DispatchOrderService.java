package com.ccadro.shipment.service;

import com.ccadro.shipment.dto.request.DispatchOrderRequest;
import com.ccadro.shipment.dto.response.DispatchOrderResponse;
import com.ccadro.shipment.entity.DispatchOrder;
import com.ccadro.shipment.exception.AppException;
import com.ccadro.shipment.exception.ErrorCode;
import com.ccadro.shipment.mapper.DispatchOrderMapper;
import com.ccadro.shipment.repository.DispatchOrderRepository;
import com.ccadro.shipment.saga.TripDispatchSagaOrchestrator;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Quản lý lệnh điều vận xuất bến (Dispatch Order Service - UC06):
 * - Kích hoạt quy trình Orchestration Saga phân tán giữa 4 microservices.
 * - Tra cứu lệnh điều vận theo shipmentId.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DispatchOrderService {

    DispatchOrderRepository dispatchOrderRepository;
    DispatchOrderMapper dispatchOrderMapper;
    TripDispatchSagaOrchestrator tripDispatchSagaOrchestrator;

    @Transactional
    public DispatchOrderResponse createDispatchOrder(DispatchOrderRequest request) {
        return tripDispatchSagaOrchestrator.executeDispatchSaga(request);
    }

    public DispatchOrderResponse getDispatchOrderByShipmentId(UUID shipmentId) {
        DispatchOrder order = dispatchOrderRepository.findByShipmentId(shipmentId)
                .orElseThrow(() -> new AppException(ErrorCode.DISPATCH_ORDER_NOT_FOUND));
        return dispatchOrderMapper.toResponse(order);
    }
}

