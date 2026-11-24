package com.ccadro.asset.fuel;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.ContainerType;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.VehicleRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static com.ccadro.asset.fuel.FuelAutomationDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FuelStationAutomationServiceTest {

    @Test
    void authorizePumpBlocksHighSulfurDieselForEuro5AndReeferGenset() {
        var f = new Fixture();
        var decisionEuro5Bad = f.service.authorizePump("DEPOT-CATLAI-01",
            new AuthorizePumpRequest("NZ-DO2-02", "VEHICLE", "VEH-01", BigDecimal.valueOf(120)),
            "ROLE_DISPATCHER");
        assertFalse(decisionEuro5Bad.allowed());
        assertEquals("BLOCKED", decisionEuro5Bad.decisionStatus());
        assertTrue(String.join(" ", decisionEuro5Bad.reasons()).contains("10 ppm"));

        var decisionReeferOk = f.service.authorizePump("DEPOT-CATLAI-01",
            new AuthorizePumpRequest("NZ-DO5-01", "CONTAINER_GENSET", "CCLU-619284-5", BigDecimal.valueOf(100)),
            "ROLE_DISPATCHER");
        assertTrue(decisionReeferOk.allowed());
        assertEquals("APPROVED", decisionReeferOk.decisionStatus());
    }

    @Test
    void ingestTransactionsDeductsStockCalculatesCo2AndEnforcesIdempotency() {
        var f = new Fixture();
        var req = new IngestTransactionRequest("TX-RFID-9001", "NZ-DO5-01", "VEHICLE", "VEH-01",
            BigDecimal.valueOf(100), null, BigDecimal.valueOf(12500), null, "DEPOT_RFID", "HD-001", Instant.now());
        var first = f.service.ingestTransactions("DEPOT-CATLAI-01", List.of(req, req), "rfid-bot", "ROLE_DISPATCHER");
        assertEquals(2, first.size());
        assertEquals("AUTHORIZED", first.get(0).validationStatus());
        assertEquals(new BigDecimal("269.720"), first.get(0).physicalCo2Kg());
        assertEquals(new BigDecimal("29900.00"), f.nozzleEuro5.getCurrentStockLiters());
    }

    @Test
    void ingestFlagsPumpVsTankMismatchAndOdometerRollbackWithoutDeductingStock() {
        var f = new Fixture();
        var prevTx = new FuelPumpTransaction();
        prevTx.setOdometerKm(new BigDecimal("50000"));
        when(f.txs.findFirstByAssetKindAndAssetCodeAndValidationStatusOrderByPumpedAtDesc("VEHICLE", "VEH-01", "AUTHORIZED"))
            .thenReturn(Optional.of(prevTx));

        var req = new IngestTransactionRequest("TX-ANOMALY-1", "NZ-DO5-01", "VEHICLE", "VEH-01",
            BigDecimal.valueOf(200), null, BigDecimal.valueOf(49500), null, "DEPOT_RFID", "HD-002", Instant.now(),
            BigDecimal.valueOf(20), BigDecimal.valueOf(35));
        var res = f.service.ingestTransactions("DEPOT-CATLAI-01", List.of(req), "rfid-bot", "ROLE_DISPATCHER");
        assertEquals("FLAGGED_ANOMALY", res.get(0).validationStatus());
        assertTrue(res.get(0).validationReason().contains("Odometer"));
        assertTrue(res.get(0).validationReason().contains("bình"));
        assertEquals(new BigDecimal("30000.00"), f.nozzleEuro5.getCurrentStockLiters());
    }

    @Test
    void batchOptimizeEvaluatesBothTrucksAndReeferContainerGensets() {
        var f = new Fixture();
        var res = f.service.batchOptimizeFleet(
            new BatchOptimizeRequest(BigDecimal.valueOf(300), BigDecimal.valueOf(12), 60, "PHYSICAL_CO2", null, null),
            "ROLE_DISPATCHER");
        assertEquals(2, res.totalAssetsEvaluated());
        assertEquals(2, res.optimizedAssetsCount());
        assertTrue(res.rows().stream().anyMatch(r -> "CONTAINER_GENSET".equals(r.assetKind()) && "DEPOT-CATLAI-01".equals(r.recommendedStationCode())));
    }

    private static class Fixture {
        final FuelStationRepository stations = mock(FuelStationRepository.class);
        final FuelStationNozzleRepository nozzles = mock(FuelStationNozzleRepository.class);
        final ContainerFuelUnitRepository units = mock(ContainerFuelUnitRepository.class);
        final FuelPumpTransactionRepository txs = mock(FuelPumpTransactionRepository.class);
        final VehicleRepository vehicles = mock(VehicleRepository.class);
        final ContainerRepository containers = mock(ContainerRepository.class);
        final VehicleFuelProfileRepository profiles = mock(VehicleFuelProfileRepository.class);
        final EntityManager em = mock(EntityManager.class);
        final VietnamFuelCatalog catalog = new VietnamFuelCatalog();
        final VehicleFuelService fuelService = new VehicleFuelService(vehicles, profiles, catalog, em);
        final FuelStationAutomationService service = new FuelStationAutomationService(
            stations, nozzles, units, txs, vehicles, containers, profiles, fuelService, catalog);

        final FuelStation station = new FuelStation();
        final FuelStationNozzle nozzleEuro5 = new FuelStationNozzle();
        final FuelStationNozzle nozzleDo2 = new FuelStationNozzle();
        final Vehicle truck = new Vehicle();
        final Container reefer = new Container();
        final Map<String, FuelPumpTransaction> txStore = new HashMap<>();

        Fixture() {
            station.setId(UUID.randomUUID());
            station.setStationCode("DEPOT-CATLAI-01");
            station.setName("Depot Cát Lái");
            station.setStationType("INTERNAL_DEPOT");
            station.setPriceRegion(1);
            station.setActive(true);

            nozzleEuro5.setId(UUID.randomUUID());
            nozzleEuro5.setStationId(station.getId());
            nozzleEuro5.setNozzleCode("NZ-DO5-01");
            nozzleEuro5.setFuelCode("DIESEL_DO_0001S");
            nozzleEuro5.setTankCapacityLiters(new BigDecimal("40000"));
            nozzleEuro5.setCurrentStockLiters(new BigDecimal("30000.00"));
            nozzleEuro5.setUnitPriceVnd(new BigDecimal("27900"));
            nozzleEuro5.setActive(true);

            nozzleDo2.setId(UUID.randomUUID());
            nozzleDo2.setStationId(station.getId());
            nozzleDo2.setNozzleCode("NZ-DO2-02");
            nozzleDo2.setFuelCode("DIESEL_DO_005S");
            nozzleDo2.setTankCapacityLiters(new BigDecimal("30000"));
            nozzleDo2.setCurrentStockLiters(new BigDecimal("18000.00"));
            nozzleDo2.setUnitPriceVnd(new BigDecimal("26100"));
            nozzleDo2.setActive(true);

            truck.setId(UUID.randomUUID());
            truck.setVehicleCode("VEH-01");
            truck.setPlateNumber("51C-12345");
            truck.setFuelType("DIESEL");
            truck.setEuroStandard("EURO_5");
            truck.setStatus(VehicleStatus.AVAILABLE);

            var profile = new VehicleFuelProfile();
            profile.setVehicleId(truck.getId());
            profile.setSelectedFuelCode("DIESEL_DO_0001S");
            profile.setConsumptionPer100Km(new BigDecimal("30"));
            profile.setMinQualityLevel(5);
            profile.setMaxSulfurPpm(10);

            reefer.setId(UUID.randomUUID());
            reefer.setContainerCode("CCLU-619284-5");
            reefer.setContainerType(ContainerType.REEFER_40FT);
            reefer.setIsReefer(true);
            reefer.setStatus(ContainerStatus.AVAILABLE);

            when(stations.findAll()).thenReturn(List.of(station));
            when(stations.findByStationCode("DEPOT-CATLAI-01")).thenReturn(Optional.of(station));
            when(nozzles.findByStationIdOrderByNozzleCodeAsc(station.getId())).thenReturn(List.of(nozzleEuro5, nozzleDo2));
            when(nozzles.findByStationIdAndNozzleCode(station.getId(), "NZ-DO5-01")).thenReturn(Optional.of(nozzleEuro5));
            when(nozzles.findByStationIdAndNozzleCode(station.getId(), "NZ-DO2-02")).thenReturn(Optional.of(nozzleDo2));
            when(vehicles.findByVehicleCode("VEH-01")).thenReturn(Optional.of(truck));
            when(vehicles.findById(truck.getId())).thenReturn(Optional.of(truck));
            when(vehicles.findAll()).thenReturn(List.of(truck));
            when(profiles.findById(truck.getId())).thenReturn(Optional.of(profile));
            when(profiles.findAll()).thenReturn(List.of(profile));
            when(containers.findByContainerCode("CCLU-619284-5")).thenReturn(Optional.of(reefer));
            when(containers.findAll()).thenReturn(List.of(reefer));
            when(units.findAll()).thenReturn(List.of());
            when(txs.findByTransactionRef(any())).thenAnswer(i -> Optional.ofNullable(txStore.get(i.getArgument(0))));
            when(txs.save(any())).thenAnswer(i -> {
                FuelPumpTransaction t = i.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                txStore.put(t.getTransactionRef(), t);
                return t;
            });
        }
    }
}
