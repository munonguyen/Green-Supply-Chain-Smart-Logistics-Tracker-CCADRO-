package com.ccadro.asset.application;

import com.ccadro.asset.domain.Driver;
import com.ccadro.asset.domain.Vehicle;
import com.ccadro.asset.infrastructure.DriverRepository;
import com.ccadro.asset.infrastructure.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class AssetService {

    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;

    public AssetService(VehicleRepository vehicleRepository, DriverRepository driverRepository) {
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
    }

    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    public Optional<Vehicle> getVehicleByCode(String code) {
        return vehicleRepository.findByVehicleCode(code);
    }

    public List<Driver> getAllDrivers() {
        return driverRepository.findAll();
    }

    public Optional<Driver> getDriverByCode(String code) {
        return driverRepository.findByDriverCode(code);
    }
}
