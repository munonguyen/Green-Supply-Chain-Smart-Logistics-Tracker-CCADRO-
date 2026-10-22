package com.ccadro.shipment.application;

import com.ccadro.exception.BusinessRuleViolationException;
import com.ccadro.exception.ResourceNotFoundException;
import com.ccadro.shipment.api.dto.CreateShipmentRequest;
import com.ccadro.shipment.domain.Shipment;
import com.ccadro.shipment.infrastructure.ShipmentRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    public ShipmentService(ShipmentRepository shipmentRepository) {
        this.shipmentRepository = shipmentRepository;
    }

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

    @Transactional
    public Shipment createShipment(CreateShipmentRequest req) {
        if (shipmentRepository.findByShipmentCode(req.getShipmentCode()).isPresent()) {
            throw new BusinessRuleViolationException("Shipment code already exists: " + req.getShipmentCode());
        }

        Shipment shipment = new Shipment();
        shipment.setShipmentCode(req.getShipmentCode());
        shipment.setCustomerId(req.getCustomerId());
        shipment.setOriginName(req.getOriginName());
        shipment.setOriginAddress(req.getOriginAddress());
        shipment.setOriginGeom(geometryFactory.createPoint(new Coordinate(req.getOriginLongitude(), req.getOriginLatitude())));

        shipment.setDestinationName(req.getDestinationName());
        shipment.setDestinationAddress(req.getDestinationAddress());
        shipment.setDestinationGeom(geometryFactory.createPoint(new Coordinate(req.getDestinationLongitude(), req.getDestinationLatitude())));

        shipment.setCargoWeightTons(req.getCargoWeightTons());
        shipment.setCargoVolumeM3(req.getCargoVolumeM3());
        shipment.setStatus("DRAFT");

        return shipmentRepository.save(shipment);
    }
}
