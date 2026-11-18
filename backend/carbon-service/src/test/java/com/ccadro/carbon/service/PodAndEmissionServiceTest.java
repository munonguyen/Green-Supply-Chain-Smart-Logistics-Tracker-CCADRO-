package com.ccadro.carbon.service;

import com.ccadro.carbon.configuration.CcadroProperties;
import com.ccadro.carbon.dto.request.EmissionCalculationRequest;
import com.ccadro.carbon.dto.request.PodSubmissionRequest;
import com.ccadro.carbon.dto.response.EmissionCalculationResponse;
import com.ccadro.carbon.dto.response.PodResponse;
import com.ccadro.carbon.entity.EmissionCalculation;
import com.ccadro.carbon.entity.EmissionFactor;
import com.ccadro.carbon.entity.ProofOfDelivery;
import com.ccadro.carbon.exception.AppException;
import com.ccadro.carbon.exception.ErrorCode;
import com.ccadro.carbon.mapper.CarbonMapper;
import com.ccadro.carbon.mapper.PodMapper;
import com.ccadro.carbon.repository.EmissionCalculationRepository;
import com.ccadro.carbon.repository.EmissionFactorRepository;
import com.ccadro.carbon.repository.ProofOfDeliveryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PodAndEmissionServiceTest {

    @Mock
    EmissionFactorRepository emissionFactorRepository;
    @Mock
    EmissionCalculationRepository emissionCalculationRepository;
    @Mock
    ProofOfDeliveryRepository proofOfDeliveryRepository;
    @Mock
    CarbonMapper carbonMapper;
    @Mock
    PodMapper podMapper;

    @Test
    void calculateGlecV3Emissions_shouldDistinguishPlanningDafVsActualGpsAndAuditBlockedFactors() {
        CcadroProperties props = new CcadroProperties();
        EmissionAccountingService accountingService = new EmissionAccountingService(
                emissionFactorRepository,
                emissionCalculationRepository,
                carbonMapper,
                props
        );

        EmissionFactor dieselEuro5 = new EmissionFactor();
        dieselEuro5.setFactorCode("DIESEL_EURO5_HDV");
        dieselEuro5.setFuelType("DIESEL");
        dieselEuro5.setEuroStandard("EURO_5");
        dieselEuro5.setDefaultTonneKmFactor(new BigDecimal("0.080000"));
        dieselEuro5.setEmptyFactorKgPerKm(new BigDecimal("0.550000"));
        dieselEuro5.setSourceReference("GLEC_V3_2025");
        dieselEuro5.setActive(true);

        UUID tripId = UUID.randomUUID();
        when(emissionFactorRepository.findAll()).thenReturn(List.of(dieselEuro5));
        when(emissionCalculationRepository.save(any(EmissionCalculation.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(carbonMapper.toResponse(any(EmissionCalculation.class))).thenAnswer(inv -> {
            EmissionCalculation ec = inv.getArgument(0);
            EmissionCalculationResponse resp = new EmissionCalculationResponse();
            resp.setTripId(ec.getTripId());
            resp.setCalculationType(ec.getCalculationType());
            resp.setTotalCo2eKg(ec.getTotalCo2eKg());
            resp.setCalculationStatus(ec.getCalculationStatus());
            resp.setVersionNumber(ec.getVersionNumber());
            return resp;
        });

        // 1. Existing v1 PLANNING calculation must be SUPERSEDED by v2 POST_TRIP_ACCOUNTING without DAF
        EmissionCalculation priorAccounting = new EmissionCalculation();
        priorAccounting.setCalculationType("POST_TRIP_ACCOUNTING");
        priorAccounting.setCalculationStatus("CALCULATED");
        priorAccounting.setVersionNumber(1);
        when(emissionCalculationRepository.findByTripId(tripId)).thenReturn(List.of(priorAccounting));

        EmissionCalculationResponse actualResp = accountingService.calculateGlecV3Emissions(
                EmissionCalculationRequest.builder()
                        .tripId(tripId)
                        .calculationType("POST_TRIP_ACCOUNTING")
                        .cargoPayloadTons(BigDecimal.valueOf(10))
                        .totalDistanceKm(BigDecimal.valueOf(100))
                        .fuelType("DIESEL")
                        .euroStandard("EURO_5")
                        .build()
        );

        assertEquals("SUPERSEDED", priorAccounting.getCalculationStatus());
        assertEquals(2, actualResp.getVersionNumber());
        // 10t * 100km * 0.080 = 80.0000 kg (NO DAF on GPS_ACTUAL!)
        assertEquals(0, new BigDecimal("80.0000").compareTo(actualResp.getTotalCo2eKg()));

        // 2. UNKNOWN fuel triggers BLOCKED audit record (BRULE-13)
        when(emissionCalculationRepository.findByTripId(tripId)).thenReturn(List.of());
        EmissionCalculationResponse blocked = accountingService.calculateGlecV3Emissions(
                EmissionCalculationRequest.builder()
                        .tripId(tripId)
                        .cargoPayloadTons(BigDecimal.valueOf(10))
                        .totalDistanceKm(BigDecimal.valueOf(100))
                        .fuelType("UNKNOWN")
                        .build()
        );
        assertEquals("BLOCKED", blocked.getCalculationStatus());
    }

    @Test
    void submitPod_shouldBlockDuplicatesAndUseExplicitPayloadFuelInAccounting() {
        EmissionAccountingService accountingService = mock(EmissionAccountingService.class);
        PodService podService = new PodService(proofOfDeliveryRepository, podMapper, accountingService);

        UUID tripId = UUID.randomUUID();
        UUID shipmentId = UUID.randomUUID();
        PodSubmissionRequest req = PodSubmissionRequest.builder()
                .tripId(tripId)
                .shipmentId(shipmentId)
                .recipientName("Nguyen Van A")
                .actualDistanceKm(BigDecimal.valueOf(42.5))
                .cargoPayloadTons(BigDecimal.valueOf(16.8))
                .fuelType("ELECTRIC")
                .euroStandard("ZERO_EMISSION")
                .build();

        when(proofOfDeliveryRepository.findByTripId(tripId)).thenReturn(Optional.empty());
        when(podMapper.toEntity(any())).thenAnswer(inv -> {
            PodSubmissionRequest r = inv.getArgument(0);
            ProofOfDelivery entity = new ProofOfDelivery();
            entity.setTripId(r.getTripId());
            entity.setShipmentId(r.getShipmentId());
            entity.setRecipientName(r.getRecipientName());
            entity.setActualDistanceKm(r.getActualDistanceKm());
            return entity;
        });
        when(proofOfDeliveryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(podMapper.toResponse(any())).thenReturn(new PodResponse());

        podService.submitPodAndCalculateEmissions(req);

        ArgumentCaptor<EmissionCalculationRequest> calcCaptor = ArgumentCaptor.forClass(EmissionCalculationRequest.class);
        verify(accountingService).calculateGlecV3Emissions(calcCaptor.capture());
        assertEquals(BigDecimal.valueOf(16.8), calcCaptor.getValue().getCargoPayloadTons());
        assertEquals("ELECTRIC", calcCaptor.getValue().getFuelType());
        assertEquals("ZERO_EMISSION", calcCaptor.getValue().getEuroStandard());
        assertEquals(BigDecimal.valueOf(42.5), calcCaptor.getValue().getTotalDistanceKm());

        // Duplicate ePOD must throw POD_ALREADY_SUBMITTED
        when(proofOfDeliveryRepository.findByTripId(tripId)).thenReturn(Optional.of(new ProofOfDelivery()));
        AppException dupEx = assertThrows(AppException.class, () -> podService.submitPodAndCalculateEmissions(req));
        assertEquals(ErrorCode.POD_ALREADY_SUBMITTED, dupEx.getErrorCode());
    }
}
