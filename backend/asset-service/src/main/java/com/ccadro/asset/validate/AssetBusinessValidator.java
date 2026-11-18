package com.ccadro.asset.validate;

import com.ccadro.asset.entity.ContainerCargoManifestItem;
import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.ContainerCargoManifestItemRepository;
import com.ccadro.asset.repository.DriverRepository;
import com.ccadro.asset.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Shared validator for Fleet Vehicle, Driver, Pre-Trip safety and 3PL Handover manifests.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AssetBusinessValidator {

    VehicleRepository vehicleRepository;
    DriverRepository driverRepository;
    ContainerCargoManifestItemRepository manifestItemRepository;

    public Vehicle requireVehicleForPreTrip(UUID vehicleId) {
        return vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
    }

    public void requireDriverExists(UUID driverId) {
        if (!driverRepository.existsById(driverId)) {
            throw new AppException(ErrorCode.DRIVER_NOT_FOUND);
        }
    }

    public ContainerCargoManifestItem requireManifestItemByCode(String itemCode) {
        if (itemCode == null || itemCode.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã kiện hàng không được để trống");
        }
        return manifestItemRepository.findByItemCode(itemCode.trim())
                .orElseThrow(() -> new AppException(
                        ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Không tìm thấy kiện hàng: " + itemCode));
    }
}

