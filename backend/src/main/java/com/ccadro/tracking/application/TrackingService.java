package com.ccadro.tracking.application;

import com.ccadro.exception.ResourceNotFoundException;
import com.ccadro.shared.config.CcadroProperties;
import com.ccadro.tracking.api.dto.IngestTelemetryRequest;
import com.ccadro.tracking.domain.*;
import com.ccadro.tracking.infrastructure.DeviationAlertRepository;
import com.ccadro.tracking.infrastructure.RerouteProposalRepository;
import com.ccadro.tracking.infrastructure.TelemetryEventRepository;
import com.ccadro.tracking.infrastructure.TripRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TrackingService {

    private static final Logger log = LoggerFactory.getLogger(TrackingService.class);

    private final TripRepository tripRepository;
    private final TelemetryEventRepository telemetryEventRepository;
    private final DeviationAlertRepository deviationAlertRepository;
    private final RerouteProposalRepository rerouteProposalRepository;
    private final CcadroProperties ccadroProperties;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    public TrackingService(TripRepository tripRepository,
                           TelemetryEventRepository telemetryEventRepository,
                           DeviationAlertRepository deviationAlertRepository,
                           RerouteProposalRepository rerouteProposalRepository,
                           CcadroProperties ccadroProperties) {
        this.tripRepository = tripRepository;
        this.telemetryEventRepository = telemetryEventRepository;
        this.deviationAlertRepository = deviationAlertRepository;
        this.rerouteProposalRepository = rerouteProposalRepository;
        this.ccadroProperties = ccadroProperties;
    }

    public Trip getTripById(UUID tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
    }

    public List<TelemetryEvent> getTelemetryHistory(UUID tripId) {
        return telemetryEventRepository.findByTripIdOrderByTimestampAsc(tripId);
    }

    public List<DeviationAlert> getAlerts(UUID tripId) {
        return deviationAlertRepository.findByTripId(tripId);
    }

    public List<RerouteProposal> getProposals(UUID tripId) {
        return rerouteProposalRepository.findByTripId(tripId);
    }

    @Transactional
    public TelemetryEvent ingestTelemetry(IngestTelemetryRequest req) {
        Point location = geometryFactory.createPoint(new Coordinate(req.getLongitude(), req.getLatitude()));

        TelemetryEvent event = new TelemetryEvent();
        event.setTripId(req.getTripId());
        event.setVehicleId(req.getVehicleId());
        event.setTimestamp(req.getTimestamp() != null ? req.getTimestamp() : Instant.now());
        event.setLocationGeom(location);
        event.setSpeedKmh(req.getSpeedKmh());
        event.setHeadingDegrees(req.getHeadingDegrees());
        event.setRawPayload(req.getRawPayload());

        // In bootstrap skeleton, calculate mock deviation if distance provided or simulate
        double yellowThreshold = ccadroProperties.getDeviation().getYellowMeters();
        double redThreshold = ccadroProperties.getDeviation().getRedMeters();

        // Check if rawPayload indicates deviation simulation test
        if (req.getRawPayload() != null && req.getRawPayload().contains("deviation_simulated")) {
            double simulatedDistance = redThreshold + 50.0;
            event.setDistanceFromRouteMeters(BigDecimal.valueOf(simulatedDistance));

            DeviationAlert alert = new DeviationAlert();
            alert.setTripId(req.getTripId());
            alert.setSeverity("RED");
            alert.setDeviationDistanceMeters(BigDecimal.valueOf(simulatedDistance));
            alert.setLocationGeom(location);
            alert.setStatus("OPEN");
            deviationAlertRepository.save(alert);
            log.warn("RED Deviation detected for trip {}: {} meters", req.getTripId(), simulatedDistance);
        } else {
            event.setDistanceFromRouteMeters(BigDecimal.ZERO);
        }

        return telemetryEventRepository.save(event);
    }
}
