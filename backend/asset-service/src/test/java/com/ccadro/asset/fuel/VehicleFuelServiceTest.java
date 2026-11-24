package com.ccadro.asset.fuel;

import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.repository.VehicleRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.ccadro.asset.fuel.VehicleFuelDtos.*;

class VehicleFuelServiceTest {
    @Test void sourceFactorsAndMarketSnapshotAreExplicitAndLowSulfurDoesNotClaimCo2Reduction() {
        var c=new VietnamFuelCatalog(); assertEquals(5,c.all().size());
        assertEquals(0,c.find("DIESEL_DO_005S").physicalCo2KgPerLiter().compareTo(c.find("DIESEL_DO_0001S").physicalCo2KgPerLiter()));
        BigDecimal diesel=new BigDecimal("10.21").divide(VietnamFuelCatalog.GALLON_LITERS,8,java.math.RoundingMode.HALF_UP);
        assertEquals(0,diesel.compareTo(c.find("DIESEL_DO_0001S").physicalCo2KgPerLiter()));
        assertEquals(BigDecimal.valueOf(28140),c.find("DIESEL_DO_0001S").priceRegion1());
        assertNull(c.find("BIODIESEL_B20"));assertNull(c.find("GASOLINE_RON95"));
    }
    @Test void euro5CannotUseHighSulfurOrGasolineEvenIfCheaper() {
        var f=new Fixture("DIESEL","EURO_5");
        var a=f.service.assess(f.id,f.scenario(List.of("DIESEL_DO_005S","DIESEL_DO_0001S","E10_RON95_III"),50),"ROLE_DISPATCHER");
        assertEquals("DIESEL_DO_0001S",a.recommendedFuelCode());
        assertFalse(candidate(a,"DIESEL_DO_005S").compatible());assertFalse(candidate(a,"E10_RON95_III").eligible());
        assertEquals(new BigDecimal("30.000"),candidate(a,"DIESEL_DO_0001S").liters());
        assertEquals(new BigDecimal("844200.00"),candidate(a,"DIESEL_DO_0001S").costVnd());
    }
    @Test void equalDieselCarbonChoosesLowerCostWithoutInventedSavings() {
        var f=new Fixture("DIESEL","EURO_2");f.profile.setMinQualityLevel(2);f.profile.setMaxSulfurPpm(500);
        var a=f.service.assess(f.id,f.scenario(List.of("DIESEL_DO_005S","DIESEL_DO_0001S"),100),"ROLE_DISPATCHER");
        assertEquals("DIESEL_DO_005S",a.recommendedFuelCode());
        assertEquals(0,candidate(a,"DIESEL_DO_005S").physicalCo2DeltaKg().signum());
        assertFalse(candidate(a,"DIESEL_DO_0001S").pareto());
    }
    @Test void unknownFuelOrUnsupportedPowertrainCannotSilentlyFallBackToDiesel() {
        var f=new Fixture("HYBRID","EURO_5");
        assertThrows(AppException.class,()->f.service.assess(f.id,f.scenario(List.of(),50),"ROLE_DISPATCHER"));
        var diesel=new Fixture("DIESEL","EURO_5");
        assertThrows(AppException.class,()->diesel.service.assess(diesel.id,diesel.scenario(List.of("MAZUT"),50),"ROLE_DISPATCHER"));
    }
    @Test void noConfirmedSupplyReturnsNoRecommendationAndPremiumLimitCanRejectAll() {
        var f=new Fixture("DIESEL","EURO_5");
        assertNull(f.service.assess(f.id,f.scenario(List.of(),50),"ROLE_DISPATCHER").recommendedFuelCode());
        var s=f.scenario(List.of("DIESEL_DO_0001S"),50);
        s=new Scenario(s.distanceKm(),s.extraIdleHours(),s.idleLitersPerHour(),1,50,"PHYSICAL_CO2",s.availableFuelCodes(),Map.of("DIESEL_DO_0001S",new BigDecimal("40000")),Map.of(),BigDecimal.ZERO);
        // Same baseline quote is used consistently, so its own cost has zero premium.
        assertEquals("DIESEL_DO_0001S",f.service.assess(f.id,s,"ROLE_DISPATCHER").recommendedFuelCode());
        f.profile.setMinQualityLevel(2);f.profile.setMaxSulfurPpm(500);f.vehicle.setEuroStandard("EURO_2");f.profile.setSelectedFuelCode("DIESEL_DO_005S");
        assertNull(f.service.assess(f.id,s,"ROLE_DISPATCHER").recommendedFuelCode());
    }
    @Test void gasolineRespectsRonAndEthanolLimitsAndSeparatesBiogenicCo2() {
        var f=new Fixture("GASOLINE","EURO_2");f.profile.setSelectedFuelCode("E5_RON92_II");f.profile.setMinQualityLevel(2);f.profile.setMinRon(92);f.profile.setMaxEthanolPct(5);
        var a=f.service.assess(f.id,f.scenario(List.of("E5_RON92_II","E10_RON95_III"),100),"ROLE_ESG_AUDITOR");
        assertEquals("E5_RON92_II",a.recommendedFuelCode());assertFalse(candidate(a,"E10_RON95_III").compatible());
        f.profile.setMaxEthanolPct(10);f.profile.setMinRon(95);
        assertThrows(AppException.class,()->f.service.assess(f.id,f.scenario(List.of("E10_RON95_III"),50),"ROLE_DISPATCHER"));
        f.profile.setMinRon(92);
        a=f.service.assess(f.id,f.scenario(List.of("E5_RON92_II","E10_RON95_III"),100),"ROLE_DISPATCHER");
        var e10=candidate(a,"E10_RON95_III");assertTrue(e10.liters().compareTo(new BigDecimal("30"))>0);
        assertTrue(e10.biogenicCo2Kg().signum()>0);assertTrue(e10.physicalCo2Kg().compareTo(e10.fossilCo2Kg())>0);
        assertTrue(e10.physicalCo2Kg().subtract(e10.fossilCo2Kg()).subtract(e10.biogenicCo2Kg()).abs().compareTo(new BigDecimal("0.01"))<=0);
    }
    @Test void measuredConsumptionAndIdleTimeDriveActualScenarioNotFuelMarketingGrade() {
        var f=new Fixture("DIESEL","EURO_2");f.profile.setMinQualityLevel(2);f.profile.setMaxSulfurPpm(500);
        var s=new Scenario(new BigDecimal("100"),new BigDecimal("2"),new BigDecimal("3"),2,100,"PHYSICAL_CO2",
            List.of("DIESEL_DO_005S","DIESEL_DO_0001S"),Map.of("DIESEL_DO_005S",new BigDecimal("20000")),Map.of("DIESEL_DO_005S",new BigDecimal("25")),null);
        var a=f.service.assess(f.id,s,"ROLE_DISPATCHER");var low=candidate(a,"DIESEL_DO_005S");
        assertEquals(new BigDecimal("31.000"),low.liters());assertEquals(new BigDecimal("620000.00"),low.costVnd());assertEquals("USER_MEASURED",low.consumptionBasis());assertEquals("USER_QUOTE",low.priceBasis());
        assertEquals("DIESEL_DO_005S",a.recommendedFuelCode());
    }
    @Test void fossilObjectiveSeparatesBioCarbonAndCanChooseE10OnlyWhenCompatible() {
        var f=new Fixture("GASOLINE","EURO_2");f.profile.setSelectedFuelCode("E5_RON92_II");f.profile.setMinQualityLevel(2);f.profile.setMinRon(92);f.profile.setMaxEthanolPct(10);
        var scenario=new Scenario(new BigDecimal("100"),BigDecimal.ZERO,BigDecimal.ZERO,1,100,"FOSSIL_CO2",List.of("E5_RON92_II","E10_RON95_III"),Map.of(),Map.of(),null);
        var result=f.service.assess(f.id,scenario,"ROLE_DISPATCHER");
        assertEquals("E10_RON95_III",result.recommendedFuelCode());
        assertTrue(candidate(result,"E10_RON95_III").fossilCo2Kg().compareTo(candidate(result,"E5_RON92_II").fossilCo2Kg())<0);
        assertTrue(candidate(result,"E10_RON95_III").biogenicCo2Kg().compareTo(candidate(result,"E5_RON92_II").biogenicCo2Kg())>0);
    }
    @Test void weightChangesChooseBetweenTwoParetoOptionsAndDoNotMixAccountingBoundaries() {
        var f=new Fixture("DIESEL","EURO_2");f.profile.setMinQualityLevel(2);f.profile.setMaxSulfurPpm(500);
        var available=List.of("DIESEL_DO_005S","DIESEL_DO_0001S");
        var overrides=Map.of("DIESEL_DO_005S",new BigDecimal("30"),"DIESEL_DO_0001S",new BigDecimal("25"));
        var quotes=Map.of("DIESEL_DO_005S",new BigDecimal("20000"),"DIESEL_DO_0001S",new BigDecimal("30000"));
        var lowCost=new Scenario(new BigDecimal("100"),BigDecimal.ZERO,BigDecimal.ZERO,1,0,"PHYSICAL_CO2",available,quotes,overrides,null);
        var lowCarbon=new Scenario(new BigDecimal("100"),BigDecimal.ZERO,BigDecimal.ZERO,1,100,"PHYSICAL_CO2",available,quotes,overrides,null);
        assertEquals("DIESEL_DO_005S",f.service.assess(f.id,lowCost,"ROLE_DISPATCHER").recommendedFuelCode());
        var result=f.service.assess(f.id,lowCarbon,"ROLE_DISPATCHER");
        assertEquals("DIESEL_DO_0001S",result.recommendedFuelCode());
        assertTrue(candidate(result,"DIESEL_DO_005S").pareto());assertTrue(candidate(result,"DIESEL_DO_0001S").pareto());
        assertEquals("ESTIMATED_TTW_CO2_ONLY",result.scope());
    }
    @Test void annualFleetTotalsExcludeUnconfiguredOrMissingMileageAndPreventStaleWrites() {
        var f=new Fixture("DIESEL","EURO_5");f.profile.setAnnualKm(new BigDecimal("10000"));
        when(f.vehicles.findAll()).thenReturn(List.of(f.vehicle,Vehicle.builder().id(UUID.randomUUID()).vehicleCode("OTHER").plateNumber("OTHER").fuelType("DIESEL").euroStandard("EURO_5").build()));
        when(f.profiles.findAll()).thenReturn(List.of(f.profile));
        var overview=f.service.overview("ROLE_ESG_AUDITOR");assertEquals(1,overview.coveredVehicles());assertEquals(1,overview.configuredVehicles());assertEquals(2,overview.vehicles().size());assertTrue(overview.annualPhysicalCo2Kg().signum()>0);
        var body=new SaveProfile("DIESEL_DO_0001S",new BigDecimal("30"),null,null,null,10,5,"Manual engine fuel requirements","Measured log with loaded truck",-1L);
        assertThrows(AppException.class,()->f.service.save(f.id,body,"dispatcher","ROLE_DISPATCHER"));
        assertThrows(AppException.class,()->f.service.save(f.id,body,"auditor","ROLE_ESG_AUDITOR"));
        assertThrows(AppException.class,()->f.service.overview("ROLE_DRIVER"));
        assertThrows(AppException.class,()->f.service.overview("ROLE_SHIPPER"));
        verify(f.profiles,never()).saveAndFlush(any());
    }
    private static Candidate candidate(Assessment a,String code) {return a.candidates().stream().filter(c->c.fuelCode().equals(code)).findFirst().orElseThrow();}
    private static class Fixture {
        final UUID id=UUID.randomUUID();final VehicleRepository vehicles=mock(VehicleRepository.class);final VehicleFuelProfileRepository profiles=mock(VehicleFuelProfileRepository.class);
        final EntityManager em=mock(EntityManager.class);final VietnamFuelCatalog catalog=new VietnamFuelCatalog();final VehicleFuelService service=new VehicleFuelService(vehicles,profiles,catalog,em);
        final Vehicle vehicle;final VehicleFuelProfile profile=new VehicleFuelProfile();
        Fixture(String family,String euro) {
            vehicle=Vehicle.builder().id(id).vehicleCode("TEST-FUEL").plateNumber("99TEST").fuelType(family).euroStandard(euro).status(VehicleStatus.AVAILABLE).build();
            profile.setVehicleId(id);profile.setSelectedFuelCode("DIESEL_DO_0001S");profile.setConsumptionPer100Km(new BigDecimal("30"));profile.setMinQualityLevel(5);profile.setMaxSulfurPpm(10);
            profile.setCompatibilityEvidence("Verified OEM manual");profile.setConsumptionEvidence("Measured loaded operation");profile.setUpdatedAt(Instant.now());profile.setUpdatedBy("dispatcher");
            when(vehicles.findById(id)).thenReturn(Optional.of(vehicle));when(em.find(Vehicle.class,id,LockModeType.PESSIMISTIC_WRITE)).thenReturn(vehicle);when(profiles.findById(id)).thenReturn(Optional.of(profile));
        }
        Scenario scenario(List<String> available,int carbon) {return new Scenario(new BigDecimal("100"),BigDecimal.ZERO,BigDecimal.ZERO,1,carbon,"PHYSICAL_CO2",available,Map.of(),Map.of(),null);}
    }
}
