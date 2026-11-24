package com.ccadro.tracking.service;

import com.ccadro.tracking.client.*;
import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.dto.request.RerouteApprovalRequest;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import com.ccadro.tracking.entity.*;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.mapper.RerouteProposalMapper;
import com.ccadro.tracking.repository.*;
import com.ccadro.tracking.validate.ReroutePolicyValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.locationtech.jts.geom.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class RoadRerouteServiceTest {
    private final RerouteProposalRepository proposals = mock(RerouteProposalRepository.class);
    private final TripRepository trips = mock(TripRepository.class);
    private final TelemetryEventRepository telemetry = mock(TelemetryEventRepository.class);
    private final RerouteProposalMapper mapper = mock(RerouteProposalMapper.class);
    private final RoadRerouteClient client = mock(RoadRerouteClient.class);
    private final RerouteProposalService service = new RerouteProposalService(proposals, trips, mapper,
        mock(EmergencyNotificationPublisher.class), new CcadroProperties(), new ReroutePolicyValidator(), telemetry, client);
    private final GeometryFactory geometry = new GeometryFactory(new PrecisionModel(), 4326);
    private final Trip trip = new Trip();

    @BeforeEach void setup() {
        trip.setId(UUID.randomUUID()); trip.setShipmentId(UUID.randomUUID()); trip.setStatus("EN_ROUTE");
        when(trips.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(telemetry.findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(trip.getId())).thenReturn(Optional.of(gps()));
        when(proposals.save(any())).thenAnswer(inv -> {RerouteProposal p = inv.getArgument(0); if(p.getId()==null) p.setId(UUID.randomUUID()); return p;});
        when(mapper.toResponse(any())).thenAnswer(inv -> {RerouteProposal p = inv.getArgument(0); return RerouteProposalResponse.builder().id(p.getId()).sourceCandidateId(p.getSourceCandidateId()).build();});
    }

    private TelemetryEvent gps() {
        var gps = new TelemetryEvent(); gps.setTimestamp(Instant.now());
        gps.setLocationGeom(geometry.createPoint(new Coordinate(106.7,10.8))); return gps;
    }

    private RerouteProposal proposal() {
        var p = new RerouteProposal(); p.setId(UUID.randomUUID()); p.setTripId(trip.getId());
        p.setStatus("PENDING_DISPATCHER"); p.setSourceCandidateId(UUID.randomUUID()); p.setProposedDurationSeconds(BigDecimal.valueOf(1200));
        p.setProposedGeometry(geometry.createLineString(new Coordinate[]{new Coordinate(106.7,10.8),new Coordinate(106.8,10.9)}));
        when(proposals.findById(p.getId())).thenReturn(Optional.of(p)); return p;
    }

    @Test void generatesProposalFromProviderGeometryAndActualDistanceInsteadOfAFixedSavingsRatio() {
        var source = new RoadRerouteClient.RoadRoute(UUID.randomUUID(),"OSRM",BigDecimal.valueOf(24000),BigDecimal.valueOf(1200),
            BigDecimal.ZERO,"{\"type\":\"LineString\",\"coordinates\":[[106.7,10.8],[106.71,10.81],[106.8,10.9]]}","{\"trafficSource\":\"NOT_AVAILABLE\"}");
        when(trips.findRemainingRouteDistanceMeters(trip.getId(),10.8,106.7)).thenReturn(Optional.of(30000.0));
        when(client.calculate(trip.getShipmentId(),10.8,106.7)).thenReturn(List.of(source));
        when(client.geometry(source)).thenAnswer(inv -> new RoadRerouteClient("http://localhost", new ObjectMapper()).geometry(source));
        var result = service.evaluateDynamicRerouteForTrip(trip.getId(),"DISPATCHER_REQUEST");
        assertTrue(result.isPresent());
        verify(proposals).save(argThat(p -> p.getSourceCandidateId().equals(source.candidateId())
            && p.getProposedGeometry().getNumPoints()==3 && p.getProposedDistanceMeters().compareTo(BigDecimal.valueOf(24000))==0
            && p.getProposedDurationSeconds().compareTo(BigDecimal.valueOf(1200))==0
            && p.getBenefitRatio().compareTo(new BigDecimal("0.2000"))==0));
    }

    @Test void staleGpsNeverCreatesAnOperationalReroute() {
        var gps = gps(); gps.setTimestamp(Instant.now().minusSeconds(600));
        when(telemetry.findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(trip.getId())).thenReturn(Optional.of(gps));
        assertTrue(service.evaluateDynamicRerouteForTrip(trip.getId(),"DEVIATION_RED").isEmpty());
        assertThrows(AppException.class,()->service.evaluateDynamicRerouteForTrip(trip.getId(),"DISPATCHER_REQUEST"));
        verifyNoInteractions(client); verify(proposals,never()).save(any());
    }

    @Test void approvalLinksTripToTheRoadVersionAndOnlySendsStoredCandidateIdentity() throws Exception {
        var proposal = proposal(); var activated = UUID.randomUUID();
        var received = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/api/v1/routing/versions/reroute",exchange -> {
            received.set(new String(exchange.getRequestBody().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));
            byte[] body=("{\"code\":1000,\"result\":{\"id\":\""+activated+"\"}}").getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type","application/json"); exchange.sendResponseHeaders(200,body.length);
            exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();
        try {
            ReflectionTestUtils.setField(service,"routingServiceUrl","http://127.0.0.1:"+server.getAddress().getPort());
            service.decideRerouteProposal(proposal.getId(),RerouteApprovalRequest.builder().decision("ACCEPTED").build());
            assertEquals(activated,trip.getActiveRouteVersionId());
            assertEquals("ACCEPTED",proposal.getStatus());
            var request = new ObjectMapper().readTree(received.get());
            assertEquals(proposal.getSourceCandidateId().toString(),request.path("selectedCandidateId").asText());
            assertEquals(proposal.getId().toString(),request.path("proposalId").asText());
            assertFalse(request.has("distanceMeters"));
        } finally {server.stop(0);}
    }

    @Test void proposalMustBeRecalculatedIfVehicleHasMovedFromTheRoutingOrigin() {
        var proposal = proposal();
        var moved = gps(); moved.setLocationGeom(geometry.createPoint(new Coordinate(106.8,10.9)));
        when(telemetry.findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(trip.getId())).thenReturn(Optional.of(moved));
        assertThrows(AppException.class,()->service.decideRerouteProposal(proposal.getId(),RerouteApprovalRequest.builder().decision("ACCEPTED").build()));
        verify(proposals,never()).save(any()); assertEquals("PENDING_DISPATCHER",proposal.getStatus());
    }
}
