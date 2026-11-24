package com.ccadro.asset.fuel;

import com.ccadro.asset.entity.Container;
import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.ContainerRepository;
import com.ccadro.asset.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static com.ccadro.asset.fuel.FuelAutomationDtos.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FuelStationAutomationService {
    private static final BigDecimal GENSET_ANOMALY_MULTIPLIER = new BigDecimal("1.30");
    private static final BigDecimal DEFAULT_LOW_FUEL_THRESHOLD_PCT = new BigDecimal("25");

    private final FuelStationRepository stations;
    private final FuelStationNozzleRepository nozzles;
    private final ContainerFuelUnitRepository containerFuelUnits;
    private final FuelPumpTransactionRepository transactions;
    private final VehicleRepository vehicles;
    private final ContainerRepository containers;
    private final VehicleFuelProfileRepository profiles;
    private final VehicleFuelService fuelService;
    private final VietnamFuelCatalog catalog;

    public List<StationSummary> listStations(String scope) {
        requireRead(scope);
        return stations.findAll().stream()
            .sorted(Comparator.comparing(FuelStation::getStationCode))
            .map(this::toStationSummary)
            .toList();
    }

    @Transactional
    public StationSummary createStation(CreateStationRequest req, String scope) {
        requireWrite(scope);
        String code = req.stationCode().trim().toUpperCase(Locale.ROOT);
        if (stations.findByStationCode(code).isPresent()) {
            throw invalid("Mã trạm bơm đã tồn tại: " + code);
        }
        FuelStation station = new FuelStation();
        station.setStationCode(code);
        station.setName(req.name().trim());
        station.setStationType(req.stationType());
        station.setPriceRegion(req.priceRegion());
        station.setCorridorTag(trimToNull(req.corridorTag()));
        station.setAddress(trimToNull(req.address()));
        station.setActive(true);
        station.setUpdatedAt(Instant.now());
        station = stations.save(station);

        for (var n : req.nozzles()) {
            requireFuel(n.fuelCode());
            if (n.currentStockLiters().compareTo(n.tankCapacityLiters()) > 0) {
                throw invalid("Tồn bồn ban đầu không được vượt quá sức chứa của vòi " + n.nozzleCode());
            }
            FuelStationNozzle nozzle = new FuelStationNozzle();
            nozzle.setStationId(station.getId());
            nozzle.setNozzleCode(n.nozzleCode().trim().toUpperCase(Locale.ROOT));
            nozzle.setFuelCode(n.fuelCode());
            nozzle.setTankCapacityLiters(n.tankCapacityLiters());
            nozzle.setCurrentStockLiters(n.currentStockLiters());
            nozzle.setUnitPriceVnd(n.unitPriceVnd());
            nozzle.setActive(true);
            nozzles.save(nozzle);
        }
        return toStationSummary(station);
    }

    public AuthorizePumpDecision authorizePump(String stationCode, AuthorizePumpRequest req, String scope) {
        requireWrite(scope);
        FuelStation station = requireStation(stationCode);
        if (!station.isActive()) {
            return blockedDecision(station.getStationCode(), req, null, "Trạm bơm đang tạm khóa bảo trì.");
        }
        FuelStationNozzle nozzle = nozzles.findByStationIdAndNozzleCode(station.getId(), req.nozzleCode().trim().toUpperCase(Locale.ROOT))
            .orElseThrow(() -> invalid("Không tìm thấy vòi bơm " + req.nozzleCode() + " tại trạm " + stationCode));
        VietnamFuelCatalog.Fuel fuel = requireFuel(nozzle.getFuelCode());
        if (!nozzle.isActive() || nozzle.getCurrentStockLiters().signum() <= 0) {
            return blockedDecision(station.getStationCode(), req, fuel, "Vòi bơm tạm ngưng hoặc bồn đã cạn nhiên liệu.");
        }

        ResolvedAsset asset = resolveAsset(req.assetKind(), req.assetCode());
        List<String> reasons = new ArrayList<>(checkCompatibility(asset, fuel));
        BigDecimal maxAuthorized = nozzle.getCurrentStockLiters();
        if (asset.tankCapacityLiters != null) {
            maxAuthorized = maxAuthorized.min(asset.tankCapacityLiters);
        }
        if (req.requestedLiters() != null && req.requestedLiters().compareTo(maxAuthorized) > 0) {
            reasons.add("Số lít yêu cầu (" + round(req.requestedLiters()) + " L) vượt ngưỡng bồn/bình cho phép (" + round(maxAuthorized) + " L).");
        }

        boolean allowed = reasons.isEmpty();
        return new AuthorizePumpDecision(
            allowed,
            allowed ? "APPROVED" : "BLOCKED",
            station.getStationCode(),
            nozzle.getNozzleCode(),
            fuel.code(),
            fuel.name(),
            req.assetKind(),
            asset.assetCode,
            asset.assetLabel,
            round(maxAuthorized),
            round(nozzle.getUnitPriceVnd()),
            reasons
        );
    }

    @Transactional
    public List<TransactionRecord> ingestTransactions(String stationCode, List<IngestTransactionRequest> batch, String actor, String scope) {
        requireWrite(scope);
        FuelStation station = requireStation(stationCode);
        String who = actor == null || actor.isBlank() ? "pump-controller" : actor.trim();
        List<TransactionRecord> results = new ArrayList<>();
        for (IngestTransactionRequest req : batch) {
            results.add(ingestSingle(station, req, who));
        }
        return results;
    }

    private TransactionRecord ingestSingle(FuelStation station, IngestTransactionRequest req, String actor) {
        String ref = (req.transactionRef() == null || req.transactionRef().isBlank())
            ? "TX-" + station.getStationCode() + "-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6)
            : req.transactionRef().trim();
        var existing = transactions.findByTransactionRef(ref);
        if (existing.isPresent()) {
            return toTxRecord(existing.get());
        }

        FuelStationNozzle nozzle = nozzles.findByStationIdAndNozzleCode(station.getId(), req.nozzleCode().trim().toUpperCase(Locale.ROOT))
            .orElseThrow(() -> invalid("Không tìm thấy vòi bơm " + req.nozzleCode() + " tại trạm " + station.getStationCode()));
        VietnamFuelCatalog.Fuel fuel = requireFuel(nozzle.getFuelCode());
        ResolvedAsset asset = resolveAsset(req.assetKind(), req.assetCode());

        List<String> compatIssues = checkCompatibility(asset, fuel);
        BigDecimal price = req.unitPriceVnd() != null ? req.unitPriceVnd() : nozzle.getUnitPriceVnd();
        BigDecimal totalCost = round(req.liters().multiply(price));
        BigDecimal physicalCo2 = round3(req.liters().multiply(fuel.physicalCo2KgPerLiter()));
        BigDecimal fossilCo2 = round3(req.liters().multiply(fuel.fossilCo2KgPerLiter()));
        BigDecimal biogenicCo2 = round3(req.liters().multiply(fuel.biogenicCo2KgPerLiter()));

        BigDecimal computedRate = null;
        List<String> anomalies = new ArrayList<>();
        String status;

        if (!compatIssues.isEmpty()) {
            status = "BLOCKED_INCOMPATIBLE";
        } else {
            var prevOpt = transactions.findFirstByAssetKindAndAssetCodeAndValidationStatusOrderByPumpedAtDesc(
                req.assetKind(), asset.assetCode, "AUTHORIZED");
            if ("VEHICLE".equals(req.assetKind()) && req.odometerKm() != null && prevOpt.isPresent() && prevOpt.get().getOdometerKm() != null) {
                BigDecimal deltaKm = req.odometerKm().subtract(prevOpt.get().getOdometerKm());
                if (deltaKm.signum() < 0) {
                    anomalies.add("Chỉ số Odometer (" + req.odometerKm() + " km) nhỏ hơn lần đổ trước (" + prevOpt.get().getOdometerKm() + " km).");
                } else if (deltaKm.compareTo(BigDecimal.ONE) >= 0) {
                    computedRate = req.liters().multiply(BigDecimal.valueOf(100)).divide(deltaKm, 3, RoundingMode.HALF_UP);
                    if (asset.vehicleProfile != null && asset.vehicleProfile.getConsumptionPer100Km() != null) {
                        BigDecimal ceiling = asset.vehicleProfile.getConsumptionPer100Km().multiply(new BigDecimal("1.25"));
                        if (computedRate.compareTo(ceiling) > 0) {
                            anomalies.add("Tiêu hao " + computedRate + " L/100km vượt ngưỡng +25% so với chuẩn xe.");
                        }
                    }
                }
            } else if ("CONTAINER_GENSET".equals(req.assetKind()) && req.engineHours() != null && prevOpt.isPresent() && prevOpt.get().getEngineHours() != null) {
                BigDecimal deltaHours = req.engineHours().subtract(prevOpt.get().getEngineHours());
                if (deltaHours.signum() < 0) {
                    anomalies.add("Giờ máy phát (" + req.engineHours() + " h) nhỏ hơn lần đổ trước (" + prevOpt.get().getEngineHours() + " h).");
                } else if (deltaHours.compareTo(BigDecimal.ONE) >= 0) {
                    computedRate = req.liters().divide(deltaHours, 3, RoundingMode.HALF_UP);
                    if (asset.containerUnit != null && computedRate.compareTo(asset.containerUnit.getRatedLitersPerHour().multiply(GENSET_ANOMALY_MULTIPLIER)) > 0) {
                        anomalies.add("Tiêu hao máy phát " + computedRate + " L/giờ vượt +30% định mức.");
                    }
                }
            }
            if (req.tankLevelBeforePct() != null && req.tankLevelAfterPct() != null && asset.tankCapacityLiters != null) {
                BigDecimal sensorDeltaLiters = req.tankLevelAfterPct().subtract(req.tankLevelBeforePct())
                    .multiply(asset.tankCapacityLiters)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal gap = req.liters().subtract(sensorDeltaLiters);
                BigDecimal tolerance = req.liters().multiply(new BigDecimal("0.10")).max(new BigDecimal("15"));
                if (gap.compareTo(tolerance) > 0) {
                    anomalies.add("Lượng trụ bơm (" + round(req.liters()) + " L) vượt mức tăng thực tế trong bình (~"
                        + round(sensorDeltaLiters.max(BigDecimal.ZERO)) + " L): nghi ngờ bơm ra ngoài hoặc lỗi cảm biến.");
                }
            }
            if (asset.tankCapacityLiters != null && req.liters().compareTo(asset.tankCapacityLiters) > 0) {
                anomalies.add("Lượng bơm vượt dung tích bình " + asset.tankCapacityLiters + " L.");
            }
            if (req.liters().compareTo(nozzle.getCurrentStockLiters()) > 0) {
                anomalies.add("Lượng ghi nhận vượt tồn bồn hiện tại (" + round(nozzle.getCurrentStockLiters()) + " L).");
            }
            status = anomalies.isEmpty() ? "AUTHORIZED" : "FLAGGED_ANOMALY";
        }

        FuelPumpTransaction tx = new FuelPumpTransaction();
        tx.setTransactionRef(ref);
        tx.setStationId(station.getId());
        tx.setNozzleId(nozzle.getId());
        tx.setStationCode(station.getStationCode());
        tx.setNozzleCode(nozzle.getNozzleCode());
        tx.setAssetKind(req.assetKind());
        tx.setVehicleId(asset.vehicle != null ? asset.vehicle.getId() : null);
        tx.setContainerId(asset.container != null ? asset.container.getId() : null);
        tx.setAssetCode(asset.assetCode);
        tx.setFuelCode(fuel.code());
        tx.setLiters(round3(req.liters()));
        tx.setUnitPriceVnd(round(price));
        tx.setTotalCostVnd(totalCost);
        tx.setOdometerKm(req.odometerKm());
        tx.setEngineHours(req.engineHours());
        tx.setComputedRate(computedRate);
        tx.setPhysicalCo2Kg(physicalCo2);
        tx.setFossilCo2Kg(fossilCo2);
        tx.setBiogenicCo2Kg(biogenicCo2);
        tx.setValidationStatus(status);
        tx.setValidationReason(compatIssues.isEmpty() ? (anomalies.isEmpty() ? null : String.join(" ", anomalies)) : String.join(" ", compatIssues));
        tx.setSourceType(req.sourceType());
        tx.setInvoiceRef(trimToNull(req.invoiceRef()));
        tx.setPumpedAt(req.pumpedAt() != null ? req.pumpedAt() : Instant.now());
        tx.setCreatedBy(actor);
        tx = transactions.save(tx);

        if ("AUTHORIZED".equals(status)) {
            nozzle.setCurrentStockLiters(nozzle.getCurrentStockLiters().subtract(req.liters()).max(BigDecimal.ZERO));
            nozzles.save(nozzle);

            if ("CONTAINER_GENSET".equals(req.assetKind()) && asset.containerUnit != null) {
                asset.containerUnit.setCurrentFuelPct(BigDecimal.valueOf(100));
                asset.containerUnit.setUpdatedBy(actor);
                asset.containerUnit.setUpdatedAt(Instant.now());
                containerFuelUnits.save(asset.containerUnit);
            } else if ("VEHICLE".equals(req.assetKind()) && asset.vehicleProfile != null && computedRate != null) {
                BigDecimal blended = asset.vehicleProfile.getConsumptionPer100Km().multiply(new BigDecimal("0.7"))
                    .add(computedRate.multiply(new BigDecimal("0.3"))).setScale(3, RoundingMode.HALF_UP);
                asset.vehicleProfile.setConsumptionPer100Km(blended);
                asset.vehicleProfile.setConsumptionEvidence("Tự cập nhật từ trụ bơm " + station.getStationCode() + " (" + ref + ")");
                asset.vehicleProfile.setUpdatedBy(actor);
                asset.vehicleProfile.setUpdatedAt(Instant.now());
                profiles.save(asset.vehicleProfile);
            }
        }
        return toTxRecord(tx);
    }

    public List<TransactionRecord> listTransactions(String scope) {
        requireRead(scope);
        return transactions.findTop100ByOrderByPumpedAtDesc().stream()
            .map(this::toTxRecord)
            .toList();
    }

    public List<ContainerFuelSummary> listContainerFuelUnits(String scope) {
        requireRead(scope);
        Map<UUID, ContainerFuelUnit> unitByContainerId = containerFuelUnits.findAll().stream()
            .collect(Collectors.toMap(ContainerFuelUnit::getContainerId, u -> u));
        return containers.findAll().stream()
            .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted())
                && (Boolean.TRUE.equals(c.getIsReefer())
                    || (c.getContainerType() != null && c.getContainerType().name().startsWith("REEFER"))
                    || unitByContainerId.containsKey(c.getId())))
            .sorted(Comparator.comparing(Container::getContainerCode))
            .map(c -> {
                ContainerFuelUnit unit = unitByContainerId.get(c.getId());
                String fuelCode = unit != null ? unit.getPreferredFuelCode() : "DIESEL_DO_0001S";
                var fuel = catalog.find(fuelCode);
                BigDecimal fuelPct = unit != null ? unit.getCurrentFuelPct() : BigDecimal.valueOf(85);
                return new ContainerFuelSummary(
                    c.getId(),
                    c.getContainerCode(),
                    c.getContainerType() != null ? c.getContainerType().name() : "REEFER_40FT",
                    c.getStatus() != null ? c.getStatus().name() : "AVAILABLE",
                    unit != null ? unit.getGensetCode() : "GS-" + c.getContainerCode(),
                    unit != null ? unit.getRfidTag() : null,
                    fuelCode,
                    fuel != null ? fuel.name() : fuelCode,
                    unit != null ? unit.getTankCapacityLiters() : BigDecimal.valueOf(240),
                    fuelPct,
                    unit != null ? unit.getRatedLitersPerHour() : new BigDecimal("3.40"),
                    unit != null ? unit.getMinQualityLevel() : 5,
                    unit != null ? unit.getMaxSulfurPpm() : 10,
                    fuelPct.compareTo(DEFAULT_LOW_FUEL_THRESHOLD_PCT) < 0
                );
            })
            .toList();
    }

    public BatchOptimizeResponse batchOptimizeFleet(BatchOptimizeRequest req, String scope) {
        requireRead(scope);
        List<FuelStation> activeStations = stations.findAll().stream()
            .filter(FuelStation::isActive)
            .filter(s -> req.corridorTag() == null || req.corridorTag().isBlank()
                || req.corridorTag().equalsIgnoreCase(s.getCorridorTag()))
            .toList();
        if (activeStations.isEmpty()) {
            throw invalid("Không tìm thấy trạm bơm đang hoạt động cho hành lang đã chọn.");
        }

        // Map each fuel code to the cheapest available station nozzle with positive stock
        Map<String, StationNozzleQuote> bestStationByFuel = new HashMap<>();
        Set<String> stationCodesUsed = new LinkedHashSet<>();
        for (FuelStation s : activeStations) {
            for (FuelStationNozzle n : nozzles.findByStationIdOrderByNozzleCodeAsc(s.getId())) {
                if (!n.isActive() || n.getCurrentStockLiters().signum() <= 0) continue;
                stationCodesUsed.add(s.getStationCode());
                StationNozzleQuote candidate = new StationNozzleQuote(s, n);
                bestStationByFuel.merge(n.getFuelCode(), candidate,
                    (a, b) -> a.nozzle.getUnitPriceVnd().compareTo(b.nozzle.getUnitPriceVnd()) <= 0 ? a : b);
            }
        }
        List<String> availableFuelCodes = new ArrayList<>(bestStationByFuel.keySet());
        Map<String, BigDecimal> priceOverrides = bestStationByFuel.entrySet().stream()
            .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().nozzle.getUnitPriceVnd()));

        List<BatchOptimizationRow> rows = new ArrayList<>();
        Map<UUID, VehicleFuelProfile> profileMap = profiles.findAll().stream()
            .collect(Collectors.toMap(VehicleFuelProfile::getVehicleId, p -> p));

        BigDecimal totalCostDelta = BigDecimal.ZERO;
        BigDecimal totalCo2Delta = BigDecimal.ZERO;
        int optimizedCount = 0;
        int switchCount = 0;

        for (Vehicle v : vehicles.findAll().stream().filter(v -> !Boolean.TRUE.equals(v.getIsDeleted())).toList()) {
            VehicleFuelProfile p = profileMap.get(v.getId());
            if (p == null || availableFuelCodes.isEmpty()) {
                rows.add(new BatchOptimizationRow("VEHICLE", v.getId(), v.getVehicleCode(), v.getPlateNumber(),
                    v.getFuelType() + " · " + v.getEuroStandard(), p != null ? p.getSelectedFuelCode() : null,
                    null, null, null, null, null, null, null, null, false,
                    p == null ? "Chưa có hồ sơ định mức xe" : "Chưa có nguồn trạm bơm phù hợp"));
                continue;
            }
            var scenario = new VehicleFuelDtos.Scenario(req.distanceKm(), BigDecimal.ZERO, BigDecimal.ZERO,
                1, req.carbonWeightPct(), req.carbonMetric(), availableFuelCodes, priceOverrides, Map.of(), req.maxPremiumPct());
            var assessment = fuelService.assess(v.getId(), scenario, scope);
            var rec = assessment.candidates().stream()
                .filter(c -> c.fuelCode().equals(assessment.recommendedFuelCode()))
                .findFirst().orElse(null);
            if (rec == null) {
                rows.add(new BatchOptimizationRow("VEHICLE", v.getId(), v.getVehicleCode(), v.getPlateNumber(),
                    v.getFuelType() + " · " + v.getEuroStandard(), p.getSelectedFuelCode(),
                    null, null, null, null, null, null, null, null, false,
                    "Không có nhiên liệu tại trạm đạt điều kiện động cơ & trần chi phí"));
                continue;
            }
            StationNozzleQuote bestStation = bestStationByFuel.get(rec.fuelCode());
            optimizedCount++;
            if (!rec.fuelCode().equals(p.getSelectedFuelCode())) switchCount++;
            totalCostDelta = totalCostDelta.add(rec.costDeltaVnd());
            totalCo2Delta = totalCo2Delta.add(rec.physicalCo2DeltaKg());
            rows.add(new BatchOptimizationRow("VEHICLE", v.getId(), v.getVehicleCode(), v.getPlateNumber(),
                v.getFuelType() + " · " + v.getEuroStandard(), p.getSelectedFuelCode(),
                rec.fuelCode(), rec.name(), bestStation.station.getStationCode(), bestStation.station.getName(),
                rec.costVnd(), rec.costDeltaVnd(), rec.physicalCo2Kg(), rec.physicalCo2DeltaKg(),
                rec.pareto(), rec.fuelCode().equals(p.getSelectedFuelCode()) ? "Giữ nguyên loại tối ưu" : "Đề xuất chuyển loại tại trạm"));
        }

        // Also evaluate Reefer container gensets automatically when reeferHours > 0
        for (ContainerFuelSummary unit : listContainerFuelUnits(scope)) {
            if (req.reeferHours().signum() <= 0) break;
            VietnamFuelCatalog.Fuel baseFuel = catalog.find(unit.preferredFuelCode());
            if (baseFuel == null) continue;
            List<DieselCandidate> eligible = new ArrayList<>();
            for (var code : availableFuelCodes) {
                VietnamFuelCatalog.Fuel f = catalog.find(code);
                if (f == null || !"DIESEL".equals(f.family())) continue;
                if (f.qualityLevel() < unit.minQualityLevel() || f.sulfurPpm() > unit.maxSulfurPpm()) continue;
                BigDecimal ratio = baseFuel.energyIndex().divide(f.energyIndex(), 10, RoundingMode.HALF_UP);
                BigDecimal liters = req.reeferHours().multiply(unit.ratedLitersPerHour()).multiply(ratio);
                BigDecimal price = priceOverrides.get(code);
                BigDecimal cost = round(liters.multiply(price));
                BigDecimal co2 = round(liters.multiply("FOSSIL_CO2".equals(req.carbonMetric()) ? f.fossilCo2KgPerLiter() : f.physicalCo2KgPerLiter()));
                eligible.add(new DieselCandidate(f, bestStationByFuel.get(code), cost, co2));
            }
            if (eligible.isEmpty()) continue;
            DieselCandidate best = selectParetoBest(eligible, req.carbonWeightPct());
            DieselCandidate base = eligible.stream().filter(d -> d.fuel.code().equals(baseFuel.code())).findFirst().orElse(best);
            BigDecimal costDelta = round(best.cost.subtract(base.cost));
            BigDecimal co2Delta = round(best.co2.subtract(base.co2));
            optimizedCount++;
            if (!best.fuel.code().equals(baseFuel.code())) switchCount++;
            totalCostDelta = totalCostDelta.add(costDelta);
            totalCo2Delta = totalCo2Delta.add(co2Delta);
            rows.add(new BatchOptimizationRow("CONTAINER_GENSET", unit.containerId(), unit.containerCode(),
                unit.gensetCode() + " (" + unit.containerType() + ")", "GENSET · ≤" + unit.maxSulfurPpm() + " ppm",
                unit.preferredFuelCode(), best.fuel.code(), best.fuel.name(),
                best.quote.station.getStationCode(), best.quote.station.getName(),
                best.cost, costDelta, best.co2, co2Delta, true,
                unit.lowFuelAlert() ? "Cảnh báo bình dầu < 25% · ưu tiên tiếp nhiên liệu" : "Tự động khớp trạm cho máy phát lạnh"));
        }

        return new BatchOptimizeResponse(
            rows.size(),
            optimizedCount,
            switchCount,
            round(totalCostDelta),
            round(totalCo2Delta),
            new ArrayList<>(stationCodesUsed),
            rows
        );
    }

    private DieselCandidate selectParetoBest(List<DieselCandidate> list, int carbonWeightPct) {
        BigDecimal minC = list.stream().map(d -> d.cost).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal maxC = list.stream().map(d -> d.cost).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal minE = list.stream().map(d -> d.co2).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal maxE = list.stream().map(d -> d.co2).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal w = BigDecimal.valueOf(carbonWeightPct).movePointLeft(2);
        return list.stream().min(Comparator.comparing(d -> {
            BigDecimal nc = maxC.compareTo(minC) == 0 ? BigDecimal.ZERO : d.cost.subtract(minC).divide(maxC.subtract(minC), 8, RoundingMode.HALF_UP);
            BigDecimal ne = maxE.compareTo(minE) == 0 ? BigDecimal.ZERO : d.co2.subtract(minE).divide(maxE.subtract(minE), 8, RoundingMode.HALF_UP);
            return nc.multiply(BigDecimal.ONE.subtract(w)).add(ne.multiply(w));
        })).orElse(list.get(0));
    }

    private ResolvedAsset resolveAsset(String assetKind, String assetCode) {
        String code = assetCode.trim();
        if ("VEHICLE".equals(assetKind)) {
            Vehicle v = vehicles.findByVehicleCode(code)
                .or(() -> vehicles.findByPlateNumber(code))
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND, "Không tìm thấy xe: " + code));
            VehicleFuelProfile profile = profiles.findById(v.getId()).orElse(null);
            return new ResolvedAsset(v, profile, null, null, v.getVehicleCode(), v.getPlateNumber(), BigDecimal.valueOf(600));
        }
        Container c = containers.findByContainerCode(code)
            .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container: " + code));
        ContainerFuelUnit unit = containerFuelUnits.findById(c.getId()).orElse(null);
        BigDecimal cap = unit != null ? unit.getTankCapacityLiters() : BigDecimal.valueOf(240);
        return new ResolvedAsset(null, null, c, unit, c.getContainerCode(), (unit != null ? unit.getGensetCode() : "GS-" + c.getContainerCode()), cap);
    }

    private List<String> checkCompatibility(ResolvedAsset asset, VietnamFuelCatalog.Fuel fuel) {
        if (asset.vehicle != null) {
            Vehicle v = asset.vehicle;
            if (asset.vehicleProfile != null) {
                return fuelService.compatible(v, asset.vehicleProfile, fuel);
            }
            List<String> issues = new ArrayList<>();
            String family = VehicleFuelService.family(v.getFuelType());
            if (family == null) {
                issues.add("Phương tiện dùng hệ động lực " + v.getFuelType() + ", không hỗ trợ bơm xăng/dầu truyền thống.");
                return issues;
            }
            if (!family.equals(fuel.family())) {
                issues.add("Không đúng loại nhiên liệu động cơ (" + v.getFuelType() + ").");
                return issues;
            }
            int euro = 0;
            try { euro = Integer.parseInt(v.getEuroStandard().replaceAll("[^0-9]", "")); } catch (Exception ignored) {}
            int required = Math.min(5, Math.max(2, euro));
            if (fuel.qualityLevel() < required) {
                issues.add("Động cơ " + v.getEuroStandard() + " yêu cầu tối thiểu mức " + required + ", không cho phép bơm " + fuel.name() + ".");
            }
            if ("DIESEL".equals(family) && euro >= 5 && fuel.sulfurPpm() != null && fuel.sulfurPpm() > 10) {
                issues.add("Động cơ " + v.getEuroStandard() + " giới hạn lưu huỳnh ≤ 10 ppm (nhiên liệu này " + fuel.sulfurPpm() + " ppm).");
            }
            return issues;
        }
        List<String> issues = new ArrayList<>();
        if (!"DIESEL".equals(fuel.family())) {
            issues.add("Máy phát container lạnh chỉ dùng Diesel; chặn bơm xăng.");
            return issues;
        }
        int minQuality = asset.containerUnit != null ? asset.containerUnit.getMinQualityLevel() : 5;
        int maxSulfur = asset.containerUnit != null ? asset.containerUnit.getMaxSulfurPpm() : 10;
        if (fuel.qualityLevel() < minQuality || (fuel.sulfurPpm() != null && fuel.sulfurPpm() > maxSulfur)) {
            issues.add("Máy phát lạnh yêu cầu Diesel mức ≥ " + minQuality + " và lưu huỳnh ≤ " + maxSulfur + " ppm.");
        }
        return issues;
    }

    private AuthorizePumpDecision blockedDecision(String stationCode, AuthorizePumpRequest req, VietnamFuelCatalog.Fuel fuel, String reason) {
        return new AuthorizePumpDecision(false, "BLOCKED", stationCode, req.nozzleCode(),
            fuel != null ? fuel.code() : null, fuel != null ? fuel.name() : null,
            req.assetKind(), req.assetCode(), req.assetCode(), BigDecimal.ZERO, BigDecimal.ZERO, List.of(reason));
    }

    private StationSummary toStationSummary(FuelStation s) {
        List<NozzleSummary> nozzleList = nozzles.findByStationIdOrderByNozzleCodeAsc(s.getId()).stream()
            .map(n -> {
                var f = catalog.find(n.getFuelCode());
                BigDecimal pct = n.getTankCapacityLiters().signum() > 0
                    ? n.getCurrentStockLiters().multiply(BigDecimal.valueOf(100)).divide(n.getTankCapacityLiters(), 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
                return new NozzleSummary(n.getId(), n.getNozzleCode(), n.getFuelCode(),
                    f != null ? f.name() : n.getFuelCode(), n.getTankCapacityLiters(),
                    n.getCurrentStockLiters(), pct, n.getUnitPriceVnd(), n.isActive());
            }).toList();
        return new StationSummary(s.getId(), s.getStationCode(), s.getName(), s.getStationType(),
            s.getPriceRegion(), s.getCorridorTag(), s.getAddress(), s.isActive(), nozzleList);
    }

    private TransactionRecord toTxRecord(FuelPumpTransaction t) {
        var f = catalog.find(t.getFuelCode());
        return new TransactionRecord(t.getId(), t.getTransactionRef(), t.getStationCode(), t.getNozzleCode(),
            t.getAssetKind(), t.getAssetCode(), t.getFuelCode(), f != null ? f.name() : t.getFuelCode(),
            t.getLiters(), t.getUnitPriceVnd(), t.getTotalCostVnd(), t.getOdometerKm(), t.getEngineHours(),
            t.getComputedRate(), t.getPhysicalCo2Kg(), t.getFossilCo2Kg(), t.getBiogenicCo2Kg(),
            t.getValidationStatus(), t.getValidationReason(), t.getSourceType(), t.getInvoiceRef(), t.getPumpedAt());
    }

    private FuelStation requireStation(String code) {
        return stations.findByStationCode(code.trim().toUpperCase(Locale.ROOT))
            .orElseThrow(() -> invalid("Không tìm thấy trạm bơm: " + code));
    }
    private VietnamFuelCatalog.Fuel requireFuel(String code) {
        var fuel = catalog.find(code);
        if (fuel == null) throw invalid("Mã nhiên liệu không thuộc danh mục chuẩn: " + code);
        return fuel;
    }
    private void requireRead(String scope) { requireRole(scope, Set.of("ADMIN", "DISPATCHER", "SAFETY_MANAGER", "ESG_AUDITOR")); }
    private void requireWrite(String scope) { requireRole(scope, Set.of("ADMIN", "DISPATCHER", "SAFETY_MANAGER")); }
    private void requireRole(String scope, Set<String> roles) {
        var granted = scope == null ? List.<String>of() : Arrays.asList(scope.trim().split("\\s+"));
        if (roles.stream().noneMatch(r -> granted.contains("ROLE_" + r))) throw new AppException(ErrorCode.UNAUTHORIZED);
    }
    private AppException invalid(String s) { return new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, s); }
    private String trimToNull(String s) { return s == null || s.trim().isEmpty() ? null : s.trim(); }
    private static BigDecimal round(BigDecimal n) { return n.setScale(2, RoundingMode.HALF_UP); }
    private static BigDecimal round3(BigDecimal n) { return n.setScale(3, RoundingMode.HALF_UP); }

    private record ResolvedAsset(Vehicle vehicle, VehicleFuelProfile vehicleProfile, Container container,
                                 ContainerFuelUnit containerUnit, String assetCode, String assetLabel, BigDecimal tankCapacityLiters) {}
    private record StationNozzleQuote(FuelStation station, FuelStationNozzle nozzle) {}
    private record DieselCandidate(VietnamFuelCatalog.Fuel fuel, StationNozzleQuote quote, BigDecimal cost, BigDecimal co2) {}
}

