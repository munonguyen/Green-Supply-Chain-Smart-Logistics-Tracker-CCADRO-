package com.ccadro.tracking.service;

import com.ccadro.tracking.dto.request.CreateTripRequest;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.repository.TripRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TripCodeGeneratorTest {

    private static final Pattern TRIP_CODE_PATTERN = Pattern.compile("^CTA-\\d{8}-[0-9A-F]{20}$");

    @Test
    void generatesReadableCodeWithCompanyPrefixDateAndUniqueSuffix() {
        String first = TripCodeGenerator.generate("A");
        String second = TripCodeGenerator.generate("A");

        assertTrue(TRIP_CODE_PATTERN.matcher(first).matches());
        assertNotEquals(first, second);
    }

    @Test
    void prefixesCodeWithNormalizedCompanyCode() {
        assertTrue(TripCodeGenerator.generate("VINAMILK").startsWith("CTVINAMILK-"));
        assertTrue(TripCodeGenerator.generate("samsung_vn").startsWith("CTSAMSUNGVN-"));
    }

    @Test
    void usesGenericPrefixWhenCompanyCodeIsMissing() {
        assertTrue(TripCodeGenerator.generate(null).startsWith("CTGEN-"));
        assertTrue(TripCodeGenerator.generate("---").startsWith("CTGEN-"));
    }

    @Test
    void createsTripWithGeneratedCompanyCodeInsteadOfCallerSuppliedTripCode() {
        TripRepository repository = mock(TripRepository.class);
        UUID shipmentId = UUID.randomUUID();
        when(repository.findByShipmentId(shipmentId)).thenReturn(Optional.empty());
        when(repository.save(any(Trip.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CreateTripRequest request = CreateTripRequest.builder()
                .shipmentId(shipmentId)
                .vehicleId(UUID.randomUUID())
                .driverId(UUID.randomUUID())
                .companyCode("A")
                .tripCode("CALLER-CHOSEN")
                .build();

        Trip created = new TripService(repository).createOrGetTrip(request);

        assertTrue(created.getTripCode().startsWith("CTA-"));
        assertNotEquals("CALLER-CHOSEN", created.getTripCode());
        verify(repository).save(any(Trip.class));
    }
}
