package com.ccadro.routing.repository.adapter;

import com.ccadro.routing.configuration.CcadroProperties;
import com.ccadro.routing.entity.*;
import com.ccadro.routing.exception.AppException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import org.springframework.http.MediaType;

class RoadRoutingProviderTest {
    private final ObjectMapper json = new ObjectMapper();

    private RouteRequest request() {
        return new RouteRequest(UUID.randomUUID(), new Location(10.8, 106.7, "A"),
            new Location(10.9, 106.8, "B"), BigDecimal.TEN, "DIESEL", "EURO_5");
    }

    @Test
    void osrmFailureNeverReturnsSyntheticFallback() {
        var mockProvider = mock(MockRoutingProvider.class);
        var provider = new OsrmRoutingProvider(new CcadroProperties(), mockProvider, json);
        var builder = RestClient.builder().baseUrl("https://routing.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        server.expect(anything()).andRespond(withServerError());
        assertThrows(AppException.class, () -> provider.getRoutes(request()));
        verifyNoInteractions(mockProvider);
        server.verify();
    }

    @Test
    void osrmPreservesRoadVerticesAndRejectsIncompleteRoutes() throws Exception {
        var provider = new OsrmRoutingProvider(new CcadroProperties(), mock(MockRoutingProvider.class), json);
        var routes = provider.parseOsrmResponse("""
            {"code":"Ok","routes":[{"distance":30000,"duration":2400,
            "geometry":{"type":"LineString","coordinates":[[106.7,10.8],[106.71,10.81],[106.8,10.9]]},
            "legs":[{"steps":[{"name":"Đường A","distance":100,"maneuver":{"type":"depart","modifier":"straight"}},
            {"name":"Đường B","distance":200,"maneuver":{"type":"turn","modifier":"right"}}]}]}]}
            """, request());
        assertEquals(3, routes.get(0).getWaypoints().size());
        assertEquals(10.81, routes.get(0).getWaypoints().get(1).getLatitude());
        assertNull(routes.get(0).getEstimatedFuelLiters());
        var instructions = json.readTree(routes.get(0).getRoutingMetadataJson()).path("guidance").path("instructions");
        assertEquals("Rẽ phải · Đường B", instructions.get(1).path("message").asText());
        assertEquals(100, instructions.get(1).path("routeOffsetInMeters").asDouble());
        assertTrue(provider.parseOsrmResponse("{\"code\":\"NoRoute\"}", request()).isEmpty());
        assertTrue(provider.parseOsrmResponse("{\"code\":\"Ok\",\"routes\":[{\"distance\":100,\"duration\":10}]}", request()).isEmpty());
    }

    @Test
    void tomtomSendsTruckDimensionsDepartureAndTrafficAndKeepsEvidence() {
        var provider = new TomTomRoutingProvider(json, "test-key", 40000, 4.2, 2.5, 16.5);
        var builder = RestClient.builder().baseUrl("https://routing.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(provider, "client", builder.build());
        String response = """
            {"routes":[{"summary":{"lengthInMeters":30000,"travelTimeInSeconds":2400,"trafficDelayInSeconds":300},
            "legs":[{"points":[{"latitude":10.8,"longitude":106.7},{"latitude":10.81,"longitude":106.71},{"latitude":10.9,"longitude":106.8}]}],
            "sections":[{"sectionType":"TRAFFIC","delayInSeconds":300}],
            "guidance":{"instructions":[{"message":"Rẽ phải","routeOffsetInMeters":200}]}}]}
            """;
        var request = request();
        request.setDepartureTime(Instant.now().plusSeconds(3600));
        for (String type : java.util.List.of("fastest", "shortest", "eco")) {
            server.expect(queryParam("routeType", type)).andExpect(queryParam("travelMode", "truck"))
                .andExpect(queryParam("traffic", "true")).andExpect(queryParam("vehicleWeight", "40000"))
                .andExpect(queryParam("vehicleHeight", "4.2")).andExpect(queryParam("vehicleLength", "16.5"))
                .andExpect(queryParam("departAt", request.getDepartureTime().toString()))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        }
        var routes = provider.getRoutes(request);
        assertEquals(1, routes.size(), "Identical geometry should not be shown as two choices");
        assertEquals(3, routes.get(0).getWaypoints().size());
        assertTrue(routes.get(0).getRoutingMetadataJson().contains("trafficDelayInSeconds"));
        assertTrue(routes.get(0).getRoutingMetadataJson().contains("Rẽ phải"));
        server.verify();
    }

    @Test
    void rejectsRoutesSnappedToAnotherLocation() throws Exception {
        var provider = new TomTomRoutingProvider(json, "test-key", 40000, 4.2, 2.5, 16.5);
        var request = request();
        var points = java.util.List.of(new RouteWaypoint(10.81, 106.71, 1, null),
            new RouteWaypoint(10.9, 106.8, 2, null));
        assertThrows(IllegalArgumentException.class, () -> RoadGeometryValidator.validate(points, request, 100));
        assertDoesNotThrow(() -> RoadGeometryValidator.validate(java.util.List.of(
            new RouteWaypoint(10.8001, 106.7001, 1, null), points.get(1)), request, 100));
    }

    @Test
    void calibratedTruckConsumptionIsSentAndPreservedForEveryObjective() throws Exception {
        var provider = new TomTomRoutingProvider(json, "test-key", 40000, 4.2, 2.5, 16.5);
        ReflectionTestUtils.setField(provider, "consumptionCurve", "30,35:60,28:90,34");
        ReflectionTestUtils.setField(provider, "auxiliaryLitersPerHour", 2.0);
        var builder = RestClient.builder().baseUrl("https://routing.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(provider, "client", builder.build());
        String response = """
            {"routes":[{"summary":{"lengthInMeters":30000,"travelTimeInSeconds":2400,"fuelConsumptionInLiters":9.5},
            "legs":[{"points":[{"latitude":10.8,"longitude":106.7},{"latitude":10.9,"longitude":106.8}]}]}]}
            """;
        for (String type : java.util.List.of("fastest", "shortest", "eco")) {
            server.expect(queryParam("routeType", type))
                .andExpect(queryParam("constantSpeedConsumptionInLitersPerHundredkm", "30,35:60,28:90,34"))
                .andExpect(queryParam("auxiliaryPowerInLitersPerHour", "2.0"))
                .andExpect(queryParam("sectionType", "traffic", "travelMode"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        }
        assertEquals(new BigDecimal("9.5"), provider.getRoutes(request()).get(0).getEstimatedFuelLiters());
        server.verify();
        assertThrows(AppException.class, () -> provider.parse(response.replace(
            ",\"fuelConsumptionInLiters\":9.5", ""), "eco", Instant.now()));
    }

    @Test
    void invalidConsumptionProfilesFailBeforeCallingProvider() {
        var provider = new TomTomRoutingProvider(json, "test-key", 40000, 4.2, 2.5, 16.5);
        for (String curve : java.util.List.of("30,35:30,32", "NaN,30", "30,-1", "30,40:60,20", "30,1:60,40", "30,35:")) {
            ReflectionTestUtils.setField(provider, "consumptionCurve", curve);
            assertThrows(AppException.class, () -> provider.getRoutes(request()), curve);
        }
    }

    @Test
    void tomtomRequiresCredentialsAndActualVehicleProfile() {
        assertThrows(AppException.class, () -> new TomTomRoutingProvider(json, "", 40000, 4.2, 2.5, 16.5).getRoutes(request()));
        assertThrows(AppException.class, () -> new TomTomRoutingProvider(json, "key", 0, 0, 0, 0).getRoutes(request()));
    }
}
