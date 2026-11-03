package com.ccadro.asset.dto;

import com.ccadro.asset.dto.request.PreTripInspectionRequest;
import com.ccadro.asset.entity.enums.InspectionStatus;
import com.ccadro.asset.entity.enums.VehicleStatus;

import java.util.LinkedHashMap;
import java.util.Map;

public record ChecklistEvaluation(
        Map<String, String> items,
        int failuresCount,
        boolean allPassed
) {
    public static ChecklistEvaluation from(PreTripInspectionRequest req) {
        Map<String, Boolean> raw = new LinkedHashMap<>();
        raw.put("tires", Boolean.TRUE.equals(req.getTirePressurePassed()));
        raw.put("brakes", Boolean.TRUE.equals(req.getBrakeSystemPassed()));
        raw.put("lights", Boolean.TRUE.equals(req.getLightingSystemPassed()));
        raw.put("fluids", Boolean.TRUE.equals(req.getFluidLevelPassed()));
        raw.put("cargo_securing", Boolean.TRUE.equals(req.getCargoSecuringPassed()));
        raw.put("emergency_kit", Boolean.TRUE.equals(req.getEmergencyKitPassed()));

        int failures = (int) raw.values().stream().filter(passed -> !passed).count();

        Map<String, String> formatted = new LinkedHashMap<>();
        raw.forEach((k, passed) -> formatted.put(k, passed ? "OK" : "FAILED"));

        return new ChecklistEvaluation(formatted, failures, failures == 0);
    }

    public InspectionStatus getInspectionStatus() {
        return allPassed ? InspectionStatus.PASSED : InspectionStatus.FAILED;
    }

    public VehicleStatus getTargetVehicleStatus() {
        return allPassed ? VehicleStatus.AVAILABLE : VehicleStatus.MAINTENANCE;
    }
}

