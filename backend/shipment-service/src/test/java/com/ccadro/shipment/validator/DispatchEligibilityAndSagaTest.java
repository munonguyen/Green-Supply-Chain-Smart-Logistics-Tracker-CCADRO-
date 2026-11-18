package com.ccadro.shipment.validator;

import com.ccadro.shipment.dto.request.DispatchOrderRequest;
import com.ccadro.shipment.entity.Shipment;
import com.ccadro.shipment.exception.AppException;
import com.ccadro.shipment.exception.ErrorCode;
import com.ccadro.shipment.mapper.DispatchOrderMapper;
import com.ccadro.shipment.repository.DispatchOrderRepository;
import com.ccadro.shipment.repository.OutboxEventRepository;
import com.ccadro.shipment.repository.SagaStateLogRepository;
import com.ccadro.shipment.repository.ShipmentRepository;
import com.ccadro.shipment.saga.TripDispatchSagaOrchestrator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class DispatchEligibilityAndSagaTest {

    @Mock
    ShipmentRepository shipmentRepository;
    @Mock
    DispatchOrderRepository dispatchOrderRepository;
    @Mock
    SagaStateLogRepository sagaStateLogRepository;
    @Mock
    OutboxEventRepository outboxEventRepository;
    @Mock
    DispatchOrderMapper dispatchOrderMapper;

    @Test
    void validator_shouldRejectMaintenanceVehicleAndOverweightCargoAndPassValidDriver() {
        UUID vehicleId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();
        Shipment heavyShipment = Shipment.builder()
                .id(UUID.randomUUID())
                .shipmentCode("SHP-2026-8801")
                .cargoWeightTons(BigDecimal.valueOf(18.0))
                .status("PLANNED")
                .build();

        // Case 1: Vehicle under maintenance must throw VEHICLE_MAINTENANCE_REQUIRED
        RestClient.Builder b1 = RestClient.builder().baseUrl("http://asset-service");
        MockRestServiceServer s1 = MockRestServiceServer.bindTo(b1).build();
        s1.expect(requestTo("http://asset-service/api/v1/assets/vehicles/" + vehicleId))
                .andRespond(withSuccess("{\"code\":1000,\"result\":{\"status\":\"MAINTENANCE\",\"maxPayloadTons\":20.0}}", MediaType.APPLICATION_JSON));

        DispatchEligibilityValidator v1 = new DispatchEligibilityValidator(b1.build(), true);
        AppException maintEx = assertThrows(AppException.class,
                () -> v1.validateVehicleAndDriverEligibility(heavyShipment, vehicleId, driverId));
        assertEquals(ErrorCode.VEHICLE_MAINTENANCE_REQUIRED, maintEx.getErrorCode());

        // Case 2: Cargo exceeding vehicle maxPayloadTons must throw INVALID_CARGO_WEIGHT
        RestClient.Builder b2 = RestClient.builder().baseUrl("http://asset-service");
        MockRestServiceServer s2 = MockRestServiceServer.bindTo(b2).build();
        s2.expect(requestTo("http://asset-service/api/v1/assets/vehicles/" + vehicleId))
                .andRespond(withSuccess("{\"code\":1000,\"result\":{\"status\":\"AVAILABLE\",\"maxPayloadTons\":12.0}}", MediaType.APPLICATION_JSON));

        DispatchEligibilityValidator v2 = new DispatchEligibilityValidator(b2.build(), true);
        AppException weightEx = assertThrows(AppException.class,
                () -> v2.validateVehicleAndDriverEligibility(heavyShipment, vehicleId, driverId));
        assertEquals(ErrorCode.INVALID_CARGO_WEIGHT, weightEx.getErrorCode());

        // Case 3: Available vehicle with sufficient payload + valid AVAILABLE driver succeeds
        RestClient.Builder b3 = RestClient.builder().baseUrl("http://asset-service");
        MockRestServiceServer s3 = MockRestServiceServer.bindTo(b3).build();
        s3.expect(requestTo("http://asset-service/api/v1/assets/vehicles/" + vehicleId))
                .andRespond(withSuccess("{\"code\":1000,\"result\":{\"status\":\"AVAILABLE\",\"maxPayloadTons\":22.0}}", MediaType.APPLICATION_JSON));
        s3.expect(requestTo("http://asset-service/api/v1/assets/drivers/" + driverId))
                .andRespond(withSuccess("{\"code\":1000,\"result\":{\"status\":\"AVAILABLE\",\"licenseExpiry\":\"2029-12-31\"}}", MediaType.APPLICATION_JSON));

        DispatchEligibilityValidator v3 = new DispatchEligibilityValidator(b3.build(), true);
        assertDoesNotThrow(() -> v3.validateVehicleAndDriverEligibility(heavyShipment, vehicleId, driverId));
        s3.verify();
    }

    @Test
    void dispatchSaga_shouldBlockDuplicateDispatchOnAlreadyDispatchedShipment() {
        TripDispatchSagaOrchestrator orchestrator = new TripDispatchSagaOrchestrator(
                shipmentRepository,
                dispatchOrderRepository,
                sagaStateLogRepository,
                outboxEventRepository,
                mock(DispatchEligibilityValidator.class),
                dispatchOrderMapper,
                new ObjectMapper()
        );

        UUID shipmentId = UUID.randomUUID();
        Shipment alreadyDispatched = Shipment.builder()
                .id(shipmentId)
                .shipmentCode("SHP-2026-001")
                .status("DISPATCHED")
                .build();
        when(shipmentRepository.findById(shipmentId)).thenReturn(Optional.of(alreadyDispatched));

        AppException ex = assertThrows(AppException.class, () -> orchestrator.executeDispatchSaga(
                DispatchOrderRequest.builder()
                        .dispatchCode("DSP-DUP-01")
                        .shipmentId(shipmentId)
                        .vehicleId(UUID.randomUUID())
                        .driverId(UUID.randomUUID())
                        .build()
        ));
        assertEquals(ErrorCode.SHIPMENT_ALREADY_DISPATCHED, ex.getErrorCode());
    }
}
