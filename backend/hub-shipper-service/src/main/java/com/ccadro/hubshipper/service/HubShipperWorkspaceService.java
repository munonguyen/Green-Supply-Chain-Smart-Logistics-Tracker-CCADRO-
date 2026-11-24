package com.ccadro.hubshipper.service;

import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.dto.request.*;
import com.ccadro.hubshipper.dto.response.HubShipperWorkspaceResponse;
import com.ccadro.hubshipper.entity.*;
import com.ccadro.hubshipper.mapper.HubWorkspaceMapper;
import com.ccadro.hubshipper.repository.*;
import com.ccadro.hubshipper.validate.HubIsolationValidator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class HubShipperWorkspaceService {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter HH_MM_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private static final long BASE_STOP_FEE_VND = 38_000L;
    private static final long COLD_CHAIN_BONUS_VND = 22_000L;
    private static final long WEIGHT_SURCHARGE_PER_100KG_VND = 12_000L;
    private static final long DAILY_GEM_BONUS_VND = 120_000L;

    HubWorkspaceMapper workspaceMapper;
    LocalDistributionHubRepository hubRepository;
    HubShipperPolicyRepository policyRepository;
    HubLocalShipperRepository shipperRepository;
    ContainerCargoManifestItemRepository manifestItemRepository;
    HubTaskRangeAssignmentRepository rangeAssignmentRepository;
    HubShipperShiftSettlementRepository shiftSettlementRepository;
    HubShipperCodRemittanceRepository codRemittanceRepository;
    HubIsolationValidator hubIsolationValidator;
    HubShipperRealtimeBroadcaster realtimeBroadcaster;
    ObjectMapper objectMapper;

    public HubShipperWorkspaceService(
            HubWorkspaceMapper workspaceMapper,
            LocalDistributionHubRepository hubRepository,
            HubShipperPolicyRepository policyRepository,
            HubLocalShipperRepository shipperRepository,
            ContainerCargoManifestItemRepository manifestItemRepository,
            HubTaskRangeAssignmentRepository rangeAssignmentRepository) {
        this(workspaceMapper, hubRepository, policyRepository, shipperRepository,
                manifestItemRepository, rangeAssignmentRepository, null, null,
                new HubIsolationValidator(), null, new ObjectMapper());
    }

    @Autowired
    public HubShipperWorkspaceService(
            HubWorkspaceMapper workspaceMapper,
            LocalDistributionHubRepository hubRepository,
            HubShipperPolicyRepository policyRepository,
            HubLocalShipperRepository shipperRepository,
            ContainerCargoManifestItemRepository manifestItemRepository,
            HubTaskRangeAssignmentRepository rangeAssignmentRepository,
            @Autowired(required = false) HubShipperShiftSettlementRepository shiftSettlementRepository,
            @Autowired(required = false) HubShipperCodRemittanceRepository codRemittanceRepository,
            @Autowired(required = false) HubIsolationValidator hubIsolationValidator,
            @Autowired(required = false) HubShipperRealtimeBroadcaster realtimeBroadcaster,
            @Autowired(required = false) ObjectMapper objectMapper) {
        this.workspaceMapper = workspaceMapper;
        this.hubRepository = hubRepository;
        this.policyRepository = policyRepository;
        this.shipperRepository = shipperRepository;
        this.manifestItemRepository = manifestItemRepository;
        this.rangeAssignmentRepository = rangeAssignmentRepository;
        this.shiftSettlementRepository = shiftSettlementRepository;
        this.codRemittanceRepository = codRemittanceRepository;
        this.hubIsolationValidator = hubIsolationValidator != null ? hubIsolationValidator : new HubIsolationValidator();
        this.realtimeBroadcaster = realtimeBroadcaster;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public SseEmitter subscribeWorkspaceStream(String requestedHubCode, HubAuthContext authContext) {
        hubIsolationValidator.validateHubReadIsolation(authContext, requestedHubCode);
        if (realtimeBroadcaster == null) {
            return new SseEmitter(0L);
        }
        return realtimeBroadcaster.subscribe(authContext, requestedHubCode);
    }

    public HubShipperWorkspaceResponse getIsolatedWorkspace(String username, String requestedHubCode, String shipperCode) {
        return getIsolatedWorkspace(username, requestedHubCode, shipperCode, null);
    }

    public HubShipperWorkspaceResponse getIsolatedWorkspace(
            String username,
            String requestedHubCode,
            String shipperCode,
            HubAuthContext authContext) {
        return getIsolatedWorkspace(username, requestedHubCode, shipperCode, null, false, authContext);
    }

    public HubShipperWorkspaceResponse getIsolatedWorkspace(
            String username,
            String requestedHubCode,
            String shipperCode,
            String q,
            boolean includeDeleted,
            HubAuthContext authContext) {
        hubIsolationValidator.validateHubReadIsolation(authContext, requestedHubCode);
        String effectiveUsername = authContext.username();
        String effectiveShipperCode = (authContext.assignedShipperCode() != null && !authContext.assignedShipperCode().isBlank())
                ? authContext.assignedShipperCode()
                : shipperCode;

        HubLocalShipper matchedShipper = null;
        if (effectiveShipperCode != null && !effectiveShipperCode.isBlank()) {
            matchedShipper = shipperRepository.findByShipperCode(effectiveShipperCode.trim()).orElse(null);
        }
        if (matchedShipper == null && effectiveUsername != null && !effectiveUsername.isBlank()) {
            matchedShipper = shipperRepository.findFirstByAccountUsernameIgnoreCase(effectiveUsername.trim()).orElse(null);
        }

        String authBoundHub = (authContext.isAuthenticated() && !authContext.isAdmin()
                && authContext.assignedHubCode() != null && !authContext.assignedHubCode().isBlank())
                ? authContext.assignedHubCode().trim()
                : null;

        String resolvedHubCode = authBoundHub != null
                ? authBoundHub
                : ((requestedHubCode != null && !requestedHubCode.isBlank())
                        ? requestedHubCode.trim()
                        : (matchedShipper != null ? matchedShipper.getHubCode() : "HUB-DINHBANG-BN"));

        LocalDistributionHub hub = hubRepository.findByHubCode(resolvedHubCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Trụ sở được chỉ định: " + resolvedHubCode));

        String finalHubCode = hub.getHubCode();
        HubShipperPolicy policy = policyRepository.findByHubCode(finalHubCode).orElse(null);
        List<HubLocalShipper> hubShippers = shipperRepository.findByHubCodeOrderByShipperCodeAsc(finalHubCode);

        HubLocalShipper activeShipper = matchedShipper != null && finalHubCode.equalsIgnoreCase(matchedShipper.getHubCode())
                ? matchedShipper
                : (hubShippers.isEmpty() ? null : hubShippers.get(0));

        hubIsolationValidator.validateShipperHubLink(authContext, matchedShipper, finalHubCode);

        List<HubTaskRangeAssignment> rangeAssignments = rangeAssignmentRepository
                .findByHubCodeOrderByAssignedAtDesc(finalHubCode);
        List<ContainerCargoManifestItem> manifestItems = manifestItemRepository
                .findByHubCodeOrderByItemCodeAsc(finalHubCode);
        List<HubShipperShiftSettlement> shiftSettlements = shiftSettlementRepository != null
                ? shiftSettlementRepository.findByHubCodeOrderBySettledAtDesc(finalHubCode)
                : List.of();
        List<HubShipperCodRemittance> codRemittances = codRemittanceRepository != null
                ? codRemittanceRepository.findByHubCodeOrderByRemittedAtDesc(finalHubCode)
                : List.of();

        if (authContext.isAuthenticated() && authContext.isShipperScoped() && activeShipper != null) {
            final String myShipperCode = activeShipper.getShipperCode();
            rangeAssignments = rangeAssignments.stream()
                    .filter(r -> myShipperCode.equalsIgnoreCase(r.getShipperCode()))
                    .toList();
            manifestItems = manifestItems.stream()
                    .filter(m -> myShipperCode.equalsIgnoreCase(m.getAssignedShipperCode()))
                    .toList();
            shiftSettlements = shiftSettlements.stream()
                    .filter(s -> myShipperCode.equalsIgnoreCase(s.getShipperCode()))
                    .toList();
            codRemittances = codRemittances.stream()
                    .filter(c -> myShipperCode.equalsIgnoreCase(c.getShipperCode()))
                    .toList();
        }

        manifestItems = manifestItems.stream()
                .filter(m -> includeDeleted || !Boolean.TRUE.equals(m.getIsDeleted()))
                .toList();

        manifestItems = ElasticSearchSupport.filterAndRank(
                manifestItems,
                q,
                m -> List.of(
                        new ElasticSearchSupport.WeightedField(m.getItemCode(), 5.0),
                        new ElasticSearchSupport.WeightedField(m.getCargoName(), 4.5),
                        new ElasticSearchSupport.WeightedField(m.getConsigneeName(), 4.0),
                        new ElasticSearchSupport.WeightedField(m.getDeliveryAddress(), 3.0),
                        new ElasticSearchSupport.WeightedField(m.getDeliveryZoneName(), 3.0),
                        new ElasticSearchSupport.WeightedField(m.getAssignedShipperCode(), 3.5),
                        new ElasticSearchSupport.WeightedField(m.getAssignedShipperName(), 3.5),
                        new ElasticSearchSupport.WeightedField(m.getSenderName(), 3.0),
                        new ElasticSearchSupport.WeightedField(m.getContainerCode(), 3.0)
                )
        );

        return workspaceMapper.workspace(
                finalHubCode, hub, policy, activeShipper, hubShippers,
                rangeAssignments, manifestItems, shiftSettlements, codRemittances);
    }

    /**
     * Điểm danh nhận ca làm việc đầu ngày tại Bưu cục (SPX Station Check-in).
     */
    @Transactional
    public HubLocalShipper checkInHubShift(String shipperCode, HubAuthContext authContext) {
        HubLocalShipper shipper = shipperRepository.findByShipperCode(shipperCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + shipperCode));
        hubIsolationValidator.validateShipperProfileEditAccess(authContext, shipper);

        Instant now = Instant.now();
        long inTransit = countShipperItemsByStatus(shipper.getHubCode(), shipper.getShipperCode(), Set.of("OUT_FOR_DELIVERY"));
        shipper.setShiftCheckedInAt(now);
        shipper.setShiftEndedAt(null);
        shipper.setShiftStatus(inTransit > 0 ? "ON_DELIVERY" : "AVAILABLE");
        shipper.setLastTelemetryAt(now);
        shipper.setUpdatedAt(now);
        HubLocalShipper saved = shipperRepository.save(shipper);
        emitRealtime(saved.getHubCode(), saved.getShipperCode(), "HUB_SHIFT_CHECKED_IN", saved.getShipperCode());
        return saved;
    }

    @Transactional
    public HubTaskRangeAssignment assignTaskByCodeRange(AssignTaskRangeRequest request) {
        return assignTaskByCodeRange(request, null);
    }

    @Transactional
    public HubTaskRangeAssignment assignTaskByCodeRange(AssignTaskRangeRequest request, HubAuthContext authContext) {
        String hubCode = request.getHubCode().trim();
        hubIsolationValidator.validateManagerRangeAuthority(authContext, hubCode);
        HubLocalShipper shipper = shipperRepository.findByShipperCode(request.getShipperCode().trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + request.getShipperCode()));
        hubIsolationValidator.validateShipperBelongsToHub(hubCode, shipper);

        String fromCode = request.getFromItemCode().trim().toUpperCase(Locale.ROOT);
        String toCode = request.getToItemCode().trim().toUpperCase(Locale.ROOT);
        if (fromCode.compareTo(toCode) > 0) {
            String tmp = fromCode;
            fromCode = toCode;
            toCode = tmp;
        }

        final String startCode = fromCode;
        final String endCode = toCode;

        List<ContainerCargoManifestItem> hubItems = manifestItemRepository
                .findByHubCodeOrderByItemCodeAsc(hubCode);

        List<ContainerCargoManifestItem> itemsInRange = hubItems.stream()
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .filter(i -> {
                    String code = i.getItemCode().toUpperCase(Locale.ROOT);
                    return code.compareTo(startCode) >= 0 && code.compareTo(endCode) <= 0;
                })
                .toList();

        if (itemsInRange.isEmpty()) {
            throw new IllegalArgumentException(
                    "Không có kiện hàng nào nằm trong dải mã từ " + startCode + " tới " + endCode + " tại Trụ sở " + hubCode);
        }

        Instant now = Instant.now();
        double totalWeight = 0.0;

        for (ContainerCargoManifestItem item : itemsInRange) {
            double distKm = calculateHaversineKm(
                    item.getDeliveryLat(),
                    item.getDeliveryLng(),
                    shipper.getAssignedLat(),
                    shipper.getAssignedLng()
            );
            double roundedKm = Math.round(distKm * 100.0) / 100.0;
            item.setAssignedShipperCode(shipper.getShipperCode());
            item.setAssignedShipperName(shipper.getFullName());
            if ("IN_CONTAINER".equalsIgnoreCase(item.getDispatchStatus())
                    || "SYNCED_TO_HUB".equalsIgnoreCase(item.getDispatchStatus())) {
                item.setDispatchStatus("ASSIGNED_TO_SHIPPER");
            }
            item.setProximityDistanceKm(roundedKm);
            item.setMatchScore(Math.min(99.8, Math.round((99.4 - roundedKm * 8.0) * 10.0) / 10.0));
            item.setDispatchReason(String.format(
                    Locale.US,
                    "Giao theo dải mã %s -> %s • Cách vị trí phân công %.2f km (%s)",
                    startCode,
                    endCode,
                    roundedKm,
                    shipper.getAssignedZoneName()
            ));
            item.setTrackingHistoryJson(appendTimelineStep(
                    item.getTrackingHistoryJson(),
                    "ASSIGNED_TO_SHIPPER",
                    "Giao dải mã " + startCode + " -> " + endCode + " cho " + shipper.getFullName()
            ));
            item.setAssignedAt(now);
            item.setUpdatedAt(now);
            totalWeight += (item.getWeightKg() != null ? item.getWeightKg() : 0.0);
        }
        manifestItemRepository.saveAll(itemsInRange);

        shipper.setAssignedCodeRangeFrom(startCode);
        shipper.setAssignedCodeRangeTo(endCode);
        shipper.setActiveItemCount(itemsInRange.size());
        shipper.setCurrentLoadKg(totalWeight);
        shipper.setUpdatedAt(now);
        shipperRepository.save(shipper);

        HubTaskRangeAssignment batch = HubTaskRangeAssignment.builder()
                .batchCode("BATCH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .hubCode(hubCode)
                .shipperCode(shipper.getShipperCode())
                .shipperName(shipper.getFullName())
                .fromItemCode(startCode)
                .toItemCode(endCode)
                .totalItems(itemsInRange.size())
                .totalWeightKg(totalWeight)
                .assignedZoneScope(
                        shipper.getTodayDeliveryScope() != null
                                ? shipper.getTodayDeliveryScope()
                                : shipper.getAssignedZoneName()
                )
                .batchStatus("ACTIVE_IN_SHIFT")
                .assignedBy(
                        request.getAssignedBy() != null && !request.getAssignedBy().isBlank()
                                ? request.getAssignedBy().trim()
                                : "HUB_DISPATCH_SUPERVISOR"
                )
                .assignedAt(now)
                .build();

        HubTaskRangeAssignment savedBatch = rangeAssignmentRepository.save(batch);
        emitRealtime(hubCode, shipper.getShipperCode(), "RANGE_ASSIGNED", savedBatch.getBatchCode());
        return savedBatch;
    }

    /**
     * Quét nhận tải xuất trạm hàng loạt tại Bưu cục (SPX Inbound/Outbound Load Scan).
     */
    @Transactional
    public List<ContainerCargoManifestItem> batchPickupItems(
            BatchPickupScanRequest request,
            HubAuthContext authContext) {
        hubIsolationValidator.requireAuthenticatedContext(authContext);
        String condition = hasText(request.getPackageCondition())
                ? request.getPackageCondition().trim().toUpperCase(Locale.ROOT)
                : "INTACT";
        if ("DAMAGED".equals(condition)) {
            throw new IllegalArgumentException(
                    "Kiện hàng bị rách/vỡ ngoại quan tại Bưu cục — không được nhận tải xuất trạm, hãy bàn giao lại Thủ kho xử lý!");
        }

        List<ContainerCargoManifestItem> updatedItems = new ArrayList<>();
        Set<String> touchedShippers = new LinkedHashSet<>();
        Instant now = Instant.now();

        for (String rawCode : request.getItemCodes()) {
            if (rawCode == null || rawCode.isBlank()) continue;
            ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(rawCode.trim().toUpperCase(Locale.ROOT))
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mã kiện: " + rawCode));
            hubIsolationValidator.validatePhotoPodMutationAccess(authContext, item);
            if ("DELIVERED_POD".equalsIgnoreCase(item.getDispatchStatus())
                    || "RETURNED_TO_HUB".equalsIgnoreCase(item.getDispatchStatus())) {
                continue;
            }
            int maxAtt = item.getMaxDeliveryAttempts() != null ? item.getMaxDeliveryAttempts() : 3;
            int nextAtt = Math.min(maxAtt, (item.getDeliveryAttemptCount() != null ? item.getDeliveryAttemptCount() : 0) + 1);
            item.setDeliveryAttemptCount(nextAtt);
            item.setPackageCondition(condition);
            if ((item.getCodAmountVnd() != null && item.getCodAmountVnd() > 0)
                    && (item.getCodStatus() == null || "NONE".equalsIgnoreCase(item.getCodStatus()))) {
                item.setCodStatus("PENDING");
            }
            item.setDispatchStatus("OUT_FOR_DELIVERY");
            item.setTrackingHistoryJson(appendTimelineStep(
                    item.getTrackingHistoryJson(),
                    "OUT_FOR_DELIVERY",
                    "Quét mã nhận tải xuất trạm (SPX Batch Pickup • Lần phát " + nextAtt + "/" + maxAtt + " • Ngoại quan: " + condition + ")"
            ));
            item.setUpdatedAt(now);
            updatedItems.add(item);
            if (hasText(item.getAssignedShipperCode())) {
                touchedShippers.add(item.getAssignedShipperCode());
            }
        }

        if (!updatedItems.isEmpty()) {
            manifestItemRepository.saveAll(updatedItems);
        }

        for (String sCode : touchedShippers) {
            shipperRepository.findByShipperCode(sCode).ifPresent(shipper -> {
                if (shipper.getShiftCheckedInAt() == null) {
                    shipper.setShiftCheckedInAt(now);
                }
                shipper.setShiftEndedAt(null);
                shipper.setShiftStatus("ON_DELIVERY");
                shipper.setLastTelemetryAt(now);
                shipper.setUpdatedAt(now);
                shipperRepository.save(shipper);
                emitRealtime(shipper.getHubCode(), sCode, "BATCH_PICKUP_OUT_FOR_DELIVERY", sCode);
            });
        }
        return updatedItems;
    }

    /**
     * Thực thi đầy đủ thao tác nghiệp vụ hiện trường chuẩn SPX Express vào PostgreSQL:
     * PICKUP_DEPART, LOG_CALL, CHECKIN_ARRIVAL, REPORT_ON_HOLD / REPORT_NDR,
     * REPORT_RETURN_TO_HUB, SCAN_HUB_RETURN, RETRY_NDR
     */
    @Transactional
    public ContainerCargoManifestItem executeItemFieldAction(
            String itemCode,
            ItemFieldActionRequest request,
            HubAuthContext authContext) {
        hubIsolationValidator.requireAuthenticatedContext(authContext);
        ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(itemCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mã kiện hàng: " + itemCode));
        hubIsolationValidator.validatePhotoPodMutationAccess(authContext, item);

        String action = request.getAction().trim().toUpperCase(Locale.ROOT);
        Instant now = Instant.now();
        int maxAtt = item.getMaxDeliveryAttempts() != null ? item.getMaxDeliveryAttempts() : 3;

        switch (action) {
            case "PICKUP_DEPART" -> {
                if ("DELIVERED_POD".equalsIgnoreCase(item.getDispatchStatus())) {
                    throw new IllegalArgumentException("Kiện hàng đã giao hoàn tất POD, không thể xuất trạm lại.");
                }
                String cond = hasText(request.getPackageCondition())
                        ? request.getPackageCondition().trim().toUpperCase(Locale.ROOT)
                        : "INTACT";
                if ("DAMAGED".equals(cond)) {
                    throw new IllegalArgumentException(
                            "Phát hiện kiện hàng rách/móp nặng tại Bưu cục — không nhận tải lên xe, vui lòng bàn giao Thủ kho lập biên bản!");
                }
                int nextAtt = Math.min(maxAtt, (item.getDeliveryAttemptCount() != null ? item.getDeliveryAttemptCount() : 0) + 1);
                item.setDeliveryAttemptCount(nextAtt);
                item.setPackageCondition(cond);
                if ((item.getCodAmountVnd() != null && item.getCodAmountVnd() > 0)
                        && (item.getCodStatus() == null || "NONE".equalsIgnoreCase(item.getCodStatus()))) {
                    item.setCodStatus("PENDING");
                }
                item.setDispatchStatus("OUT_FOR_DELIVERY");
                item.setTrackingHistoryJson(appendTimelineStep(
                        item.getTrackingHistoryJson(),
                        "OUT_FOR_DELIVERY",
                        "Đã kiểm ngoại quan (" + cond + ") & quét nhận tải xuất trạm • Lần phát " + nextAtt + "/" + maxAtt
                ));
                syncShipperShiftAndGpsAfterMutation(item.getAssignedShipperCode(), null, null, true, now);
            }
            case "LOG_CALL" -> {
                int calls = (item.getCallAttemptsCount() != null ? item.getCallAttemptsCount() : 0) + 1;
                item.setCallAttemptsCount(calls);
                item.setLastCalledAt(now);
                item.setTrackingHistoryJson(appendTimelineStep(
                        item.getTrackingHistoryJson(),
                        "CUSTOMER_CALLED",
                        "Gọi điện liên hệ người nhận trên ứng dụng SPX (Cuộc gọi #" + calls + " tới " + item.getConsigneePhone() + ")"
                ));
            }
            case "CHECKIN_ARRIVAL" -> {
                if (!"OUT_FOR_DELIVERY".equalsIgnoreCase(item.getDispatchStatus())) {
                    throw new IllegalArgumentException("Phải quét nhận kiện xuất trạm (OUT_FOR_DELIVERY) trước khi Check-in tới điểm giao.");
                }
                if (!Boolean.TRUE.equals(item.getArrivedAtStop())) {
                    item.setArrivedAtStop(true);
                    item.setArrivedAt(now);
                    item.setTrackingHistoryJson(appendTimelineStep(
                            item.getTrackingHistoryJson(),
                            "ARRIVED_AT_STOP",
                            "Check-in GPS tại điểm giao " + item.getConsigneeName() + " (sai số < 35m)"
                    ));
                }
                Double targetLat = request.getCurrentLat() != null ? request.getCurrentLat() : item.getDeliveryLat();
                Double targetLng = request.getCurrentLng() != null ? request.getCurrentLng() : item.getDeliveryLng();
                syncShipperShiftAndGpsAfterMutation(item.getAssignedShipperCode(), targetLat, targetLng, true, now);
            }
            case "REPORT_ON_HOLD", "REPORT_NDR" -> {
                if (!"OUT_FOR_DELIVERY".equalsIgnoreCase(item.getDispatchStatus())) {
                    throw new IllegalArgumentException("Chỉ được cập nhật Giữ hàng (On-Hold) cho kiện đang đi giao (OUT_FOR_DELIVERY).");
                }
                String reason = hasText(request.getReason())
                        ? request.getReason().trim()
                        : "Khách bận hẹn giao lại ca kế tiếp";
                int calls = item.getCallAttemptsCount() != null ? item.getCallAttemptsCount() : 0;
                if (reason.toLowerCase(Locale.ROOT).contains("không liên lạc") && calls < 3) {
                    throw new IllegalArgumentException(
                            "Quy chuẩn SPX: Lý do 'Không liên lạc được người nhận' bắt buộc phải thực hiện tối thiểu 03 cuộc gọi trên ứng dụng (hiện mới gọi "
                                    + calls + "/3 cuộc)!");
                }
                int currentAttempt = item.getDeliveryAttemptCount() != null && item.getDeliveryAttemptCount() > 0
                        ? item.getDeliveryAttemptCount()
                        : 1;
                item.setNdrCount((item.getNdrCount() != null ? item.getNdrCount() : 0) + 1);
                item.setNdrReason(reason);
                item.setLastNdrAt(now);
                if (hasText(request.getEvidenceImageUrl())) {
                    item.setExceptionEvidenceUrl(request.getEvidenceImageUrl().trim());
                }

                // SPX 3-Attempt Escalation Rule: >= maxAttempts automatically converts to RETURN_PENDING (Hoàn hàng)
                if (currentAttempt >= maxAtt) {
                    item.setDispatchStatus("RETURN_PENDING");
                    item.setExceptionType("RETURN_TO_HUB");
                    if (item.getCodAmountVnd() != null && item.getCodAmountVnd() > 0) {
                        item.setCodStatus("VOID_RETURNED");
                    }
                    item.setSlaWindow("Hết " + maxAtt + " lần phát — Bắt buộc quét hoàn kho Bưu cục");
                    item.setTrackingHistoryJson(appendTimelineStep(
                            item.getTrackingHistoryJson(),
                            "RETURN_PENDING",
                            "Vượt quá " + maxAtt + " lần phát (" + reason + ") — Chuyển sang Chờ hoàn về Bưu cục (RTS)"
                    ));
                } else {
                    item.setDispatchStatus("NDR_RESCHEDULED");
                    item.setExceptionType("ON_HOLD");
                    item.setSlaWindow("Giữ hàng On-Hold (Lần " + currentAttempt + "/" + maxAtt + ") — Chờ phát lại / Mang về Hub");
                    item.setTrackingHistoryJson(appendTimelineStep(
                            item.getTrackingHistoryJson(),
                            "NDR_RESCHEDULED",
                            "Sự cố NDR / Hẹn lại (On-Hold lần " + currentAttempt + "/" + maxAtt + "): " + reason
                    ));
                }
            }
            case "REPORT_RETURN_TO_HUB" -> {
                if (!"OUT_FOR_DELIVERY".equalsIgnoreCase(item.getDispatchStatus())
                        && !"NDR_RESCHEDULED".equalsIgnoreCase(item.getDispatchStatus())) {
                    throw new IllegalArgumentException("Chỉ kiện đang đi giao hoặc On-Hold mới được chuyển sang Hoàn hàng (RTS).");
                }
                String reason = hasText(request.getReason())
                        ? request.getReason().trim()
                        : "Người nhận từ chối nhận hàng / Yêu cầu hoàn trả người gửi";
                item.setDispatchStatus("RETURN_PENDING");
                item.setExceptionType("RETURN_TO_HUB");
                item.setNdrCount((item.getNdrCount() != null ? item.getNdrCount() : 0) + 1);
                item.setNdrReason(reason);
                item.setLastNdrAt(now);
                if (hasText(request.getEvidenceImageUrl())) {
                    item.setExceptionEvidenceUrl(request.getEvidenceImageUrl().trim());
                }
                if (item.getCodAmountVnd() != null && item.getCodAmountVnd() > 0) {
                    item.setCodStatus("VOID_RETURNED");
                }
                item.setSlaWindow("Chờ quét trả hàng hoàn tại Bưu cục");
                item.setTrackingHistoryJson(appendTimelineStep(
                        item.getTrackingHistoryJson(),
                        "RETURN_PENDING",
                        "Chuyển trạng thái Hoàn hàng (RTS): " + reason + " — Phải mang về quét trả Thủ kho Bưu cục cuối ca"
                ));
            }
            case "SCAN_HUB_RETURN" -> {
                if (!"RETURN_PENDING".equalsIgnoreCase(item.getDispatchStatus())
                        && !"NDR_RESCHEDULED".equalsIgnoreCase(item.getDispatchStatus())) {
                    throw new IllegalArgumentException("Chỉ kiện Hàng Giữ (On-Hold) hoặc Chờ Hoàn (RETURN_PENDING) mới cần quét bàn giao trả kho Bưu cục.");
                }
                String receiver = "Thủ kho Bưu cục " + item.getHubCode();
                item.setDispatchStatus("RETURNED_TO_HUB");
                item.setReturnedToHubAt(now);
                item.setHubReturnReceivedBy(receiver);
                item.setSlaWindow("Đã quét trả kho Bưu cục (" + receiver + ")");
                item.setTrackingHistoryJson(appendTimelineStep(
                        item.getTrackingHistoryJson(),
                        "RETURNED_TO_HUB",
                        "Shipper đã quét mã bàn giao trả kiện cho " + receiver + " — Hoàn tất trách nhiệm giữ hàng trong ca"
                ));
            }
            case "RETRY_NDR" -> {
                if (!"NDR_RESCHEDULED".equalsIgnoreCase(item.getDispatchStatus())) {
                    throw new IllegalArgumentException("Chỉ kiện đang ở trạng thái Giữ hàng (On-Hold) mới được mở giao lại trong ca.");
                }
                int nextAtt = Math.min(maxAtt, (item.getDeliveryAttemptCount() != null ? item.getDeliveryAttemptCount() : 1) + 1);
                item.setDeliveryAttemptCount(nextAtt);
                item.setDispatchStatus("OUT_FOR_DELIVERY");
                item.setExceptionType(null);
                item.setSlaWindow("Đang giao lại lần " + nextAtt + "/" + maxAtt + " trong ca");
                item.setTrackingHistoryJson(appendTimelineStep(
                        item.getTrackingHistoryJson(),
                        "OUT_FOR_DELIVERY",
                        "Khách xác nhận nhận hàng — Mở lại lộ trình giao kiện (Lần phát " + nextAtt + "/" + maxAtt + ")"
                ));
                syncShipperShiftAndGpsAfterMutation(item.getAssignedShipperCode(), null, null, true, now);
            }
            default -> throw new IllegalArgumentException("Thao tác hiện trường không hợp lệ: " + action);
        }

        item.setUpdatedAt(now);
        ContainerCargoManifestItem saved = manifestItemRepository.save(item);

        if (Set.of("REPORT_ON_HOLD", "REPORT_NDR", "REPORT_RETURN_TO_HUB", "SCAN_HUB_RETURN").contains(action)
                && hasText(saved.getAssignedShipperCode())) {
            recomputeShipperShiftAfterStopCompletion(saved.getHubCode(), saved.getAssignedShipperCode(), null, null, now);
        }
        emitRealtime(saved.getHubCode(), saved.getAssignedShipperCode(), "ITEM_FIELD_" + action, saved.getItemCode());
        return saved;
    }

    /**
     * Hoàn tất giao hàng (Photo POD + Thu hộ COD Tiền mặt/QR Động SPX + OTP/Chữ ký + Nhiệt độ Chuỗi lạnh).
     */
    @Transactional
    public ContainerCargoManifestItem submitItemTrackingAndPhotoPod(
            String itemCode,
            SubmitPhotoPodRequest request
    ) {
        return submitItemTrackingAndPhotoPod(itemCode, request, null);
    }

    @Transactional
    public ContainerCargoManifestItem submitItemTrackingAndPhotoPod(
            String itemCode,
            SubmitPhotoPodRequest request,
            HubAuthContext authContext
    ) {
        hubIsolationValidator.requireAuthenticatedContext(authContext);
        ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(itemCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mã kiện hàng: " + itemCode));
        hubIsolationValidator.validatePhotoPodMutationAccess(authContext, item);

        String nextStatus = request.getDispatchStatus().trim().toUpperCase(Locale.ROOT);
        Optional<HubShipperPolicy> policyOpt = policyRepository.findByHubCode(item.getHubCode());
        boolean requirePhoto = policyOpt.map(p -> Boolean.TRUE.equals(p.getRequirePhotoPod())).orElse(true);

        String nextPhotoUrl = (request.getProofImageUrl() != null && !request.getProofImageUrl().isBlank())
                ? request.getProofImageUrl().trim()
                : item.getProofImageUrl();

        hubIsolationValidator.validatePodTransitionAndEvidence(item, nextStatus, requirePhoto, nextPhotoUrl);

        if (hasText(request.getRecipientOtpInput()) && hasText(item.getRecipientOtpCode())
                && !item.getRecipientOtpCode().trim().equalsIgnoreCase(request.getRecipientOtpInput().trim())) {
            throw new IllegalArgumentException(
                    "Mã OTP xác nhận của người nhận không khớp (vui lòng đối chiếu lại mã OTP 4 số trên ứng dụng khách hàng)!");
        }

        Instant now = Instant.now();
        boolean wasAlreadyDelivered = "DELIVERED_POD".equalsIgnoreCase(item.getDispatchStatus());

        item.setDispatchStatus(nextStatus);
        if (nextPhotoUrl != null && !nextPhotoUrl.isBlank()) {
            item.setProofImageUrl(nextPhotoUrl);
            item.setProofUploadedAt(now);
        }
        if (hasText(request.getProofImageCaption())) {
            item.setProofImageCaption(request.getProofImageCaption().trim());
        }
        if (hasText(request.getRecipientPodName())) {
            item.setRecipientPodName(request.getRecipientPodName().trim());
        }
        if (hasText(request.getHandoverMethod())) {
            item.setHandoverMethod(request.getHandoverMethod().trim().toUpperCase(Locale.ROOT));
        }
        if (request.getMeasuredTempC() != null) {
            item.setMeasuredTempC(request.getMeasuredTempC());
        }
        if (hasText(request.getPodSignatureNote())) {
            item.setPodSignatureNote(request.getPodSignatureNote().trim());
        }

        long codAmt = item.getCodAmountVnd() != null ? item.getCodAmountVnd() : 0L;
        String resolvedCodMethod = "NONE";
        if ("DELIVERED_POD".equals(nextStatus) && codAmt > 0) {
            resolvedCodMethod = hasText(request.getCodCollectionMethod())
                    ? request.getCodCollectionMethod().trim().toUpperCase(Locale.ROOT)
                    : "COLLECTED_CASH";
            if (!Set.of("COLLECTED_CASH", "COLLECTED_QR").contains(resolvedCodMethod)) {
                resolvedCodMethod = "COLLECTED_CASH";
            }
            item.setCodStatus(resolvedCodMethod);
        }

        if ("DELIVERED_POD".equals(nextStatus)) {
            item.setArrivedAtStop(true);
            if (item.getArrivedAt() == null) {
                item.setArrivedAt(now);
            }
            if (item.getDeliveryAttemptCount() == null || item.getDeliveryAttemptCount() == 0) {
                item.setDeliveryAttemptCount(1);
            }
            item.setDeliveredAt(now);
            if (!hasText(item.getRecipientPodName())) {
                item.setRecipientPodName(item.getConsigneeName() + " (Đã ký nhận & chụp ảnh POD)");
            }
            String tempInfo = item.getMeasuredTempC() != null ? " • Nhiệt độ " + item.getMeasuredTempC() + "°C" : "";
            String codInfo = codAmt > 0
                    ? ("COLLECTED_QR".equals(resolvedCodMethod)
                            ? " • Đã thu COD QR động " + String.format("%,d", codAmt) + "đ"
                            : " • Đã thu tiền mặt COD " + String.format("%,d", codAmt) + "đ")
                    : "";
            item.setTrackingHistoryJson(appendTimelineStep(
                    item.getTrackingHistoryJson(),
                    "DELIVERED_POD",
                    "Giao thành công & lưu Ảnh POD • " + item.getRecipientPodName() + codInfo + tempInfo
            ));
        }
        item.setUpdatedAt(now);
        ContainerCargoManifestItem saved = manifestItemRepository.save(item);

        if ("DELIVERED_POD".equals(nextStatus) && !wasAlreadyDelivered && hasText(saved.getAssignedShipperCode())) {
            final String finalCodMethod = resolvedCodMethod;
            shipperRepository.findByShipperCode(saved.getAssignedShipperCode()).ifPresent(shipper -> {
                if (codAmt > 0) {
                    if ("COLLECTED_QR".equals(finalCodMethod)) {
                        long prevQr = shipper.getCodCollectedQrTodayVnd() != null ? shipper.getCodCollectedQrTodayVnd() : 0L;
                        shipper.setCodCollectedQrTodayVnd(prevQr + codAmt);
                    } else {
                        long prevCash = shipper.getCodHoldingVnd() != null ? shipper.getCodHoldingVnd() : 0L;
                        shipper.setCodHoldingVnd(prevCash + codAmt);
                    }
                }
                shipperRepository.save(shipper);
            });
            recomputeShipperShiftAfterStopCompletion(
                    saved.getHubCode(),
                    saved.getAssignedShipperCode(),
                    saved.getDeliveryLat(),
                    saved.getDeliveryLng(),
                    now
            );
        }
        emitRealtime(saved.getHubCode(), saved.getAssignedShipperCode(), "ITEM_DELIVERED_POD", saved.getItemCode());
        return saved;
    }

    /**
     * Nộp tiền mặt COD thu hộ cuối ca cho Thủ quỹ Bưu cục hoặc Chuyển khoản QR định danh về Công ty.
     * Đưa số dư tiền mặt cầm tay (cod_holding_vnd) về 0 ₫ để mở khóa Kết ca & nhận tuyến ngày tiếp theo.
     */
    @Transactional
    public HubShipperCodRemittance remitCodCash(
            RemitCodCashRequest request,
            HubAuthContext authContext) {
        HubLocalShipper shipper = shipperRepository.findByShipperCode(request.getShipperCode().trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + request.getShipperCode()));
        hubIsolationValidator.validateShipperProfileEditAccess(authContext, shipper);

        long holding = shipper.getCodHoldingVnd() != null ? shipper.getCodHoldingVnd() : 0L;
        if (holding <= 0L) {
            throw new IllegalArgumentException("Số dư tiền mặt COD đang giữ trên người bằng 0 ₫, không có công nợ COD cần nộp.");
        }

        String channel = hasText(request.getPaymentChannel())
                ? request.getPaymentChannel().trim().toUpperCase(Locale.ROOT)
                : "HUB_CASHIER";
        Instant now = Instant.now();

        List<ContainerCargoManifestItem> cashItems = manifestItemRepository
                .findByHubCodeOrderByItemCodeAsc(shipper.getHubCode()).stream()
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .filter(i -> shipper.getShipperCode().equalsIgnoreCase(i.getAssignedShipperCode()))
                .filter(i -> "COLLECTED_CASH".equalsIgnoreCase(i.getCodStatus()))
                .toList();

        for (ContainerCargoManifestItem ci : cashItems) {
            ci.setCodStatus("REMITTED");
            ci.setTrackingHistoryJson(appendTimelineStep(
                    ci.getTrackingHistoryJson(),
                    "COD_REMITTED",
                    "Shipper đã nộp đối soát tiền mặt COD về " + ("BANK_QR_TRANSFER".equals(channel) ? "TK Định danh Công ty" : "Thủ quỹ Bưu cục")
            ));
            ci.setUpdatedAt(now);
        }
        if (!cashItems.isEmpty()) {
            manifestItemRepository.saveAll(cashItems);
        }

        String itemCsv = cashItems.stream()
                .map(ContainerCargoManifestItem::getItemCode)
                .collect(Collectors.joining(","));

        shipper.setCodHoldingVnd(0L);
        long prevRemitted = shipper.getCodRemittedTodayVnd() != null ? shipper.getCodRemittedTodayVnd() : 0L;
        shipper.setCodRemittedTodayVnd(prevRemitted + holding);
        shipper.setUpdatedAt(now);
        shipperRepository.save(shipper);

        HubShipperCodRemittance receipt = HubShipperCodRemittance.builder()
                .receiptCode("RCP-COD-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT))
                .hubCode(shipper.getHubCode())
                .shipperCode(shipper.getShipperCode())
                .shipperName(shipper.getFullName())
                .remittedAmountVnd(holding)
                .paymentChannel(channel)
                .cashierConfirmedBy("BANK_QR_TRANSFER".equals(channel)
                        ? "Hệ thống Ngân hàng Định danh SPX/VietQR"
                        : "Thủ quỹ Bưu cục " + shipper.getHubCode())
                .itemCodesCsv(itemCsv)
                .note(hasText(request.getNote()) ? request.getNote().trim() : "Nộp sạch 100% tiền mặt COD thu hộ trong ca")
                .remittedAt(now)
                .createdAt(now)
                .build();

        HubShipperCodRemittance saved = codRemittanceRepository != null
                ? codRemittanceRepository.save(receipt)
                : receipt;
        emitRealtime(shipper.getHubCode(), shipper.getShipperCode(), "COD_CASH_REMITTED", saved.getReceiptCode());
        return saved;
    }

    /**
     * Kết ca làm việc tại Bưu cục (SPX 3-Gate End-of-Shift Checkout):
     *   1) Không còn đơn OUT_FOR_DELIVERY trên xe
     *   2) Đã quét trả 100% đơn Giữ hàng (On-Hold) & Hàng Hoàn (RETURN_PENDING) cho Thủ kho Bưu cục
     *   3) Số dư tiền mặt COD cầm tay (cod_holding_vnd) = 0 ₫
     */
    @Transactional
    public HubLocalShipper endShiftCheckout(String shipperCode, HubAuthContext authContext) {
        HubLocalShipper shipper = shipperRepository.findByShipperCode(shipperCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + shipperCode));
        hubIsolationValidator.validateShipperProfileEditAccess(authContext, shipper);

        List<ContainerCargoManifestItem> myItems = manifestItemRepository
                .findByHubCodeOrderByItemCodeAsc(shipper.getHubCode()).stream()
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .filter(i -> shipper.getShipperCode().equalsIgnoreCase(i.getAssignedShipperCode()))
                .toList();

        long inTransit = myItems.stream()
                .filter(i -> "OUT_FOR_DELIVERY".equalsIgnoreCase(i.getDispatchStatus()))
                .count();
        if (inTransit > 0) {
            throw new IllegalArgumentException(
                    "Chưa thể Kết ca (Điều kiện 1/3): Còn " + inTransit + " kiện đang đi giao (OUT_FOR_DELIVERY) chưa đóng trạng thái!");
        }

        long unreturned = myItems.stream()
                .filter(i -> "NDR_RESCHEDULED".equalsIgnoreCase(i.getDispatchStatus())
                        || "RETURN_PENDING".equalsIgnoreCase(i.getDispatchStatus()))
                .count();
        if (unreturned > 0) {
            throw new IllegalArgumentException(
                    "Chưa thể Kết ca (Điều kiện 2/3): Còn " + unreturned + " kiện Hàng Giữ (On-Hold) / Hàng Hoàn chưa quét mã trả lại Thủ kho Bưu cục!");
        }

        long codHolding = shipper.getCodHoldingVnd() != null ? shipper.getCodHoldingVnd() : 0L;
        if (codHolding > 0L) {
            throw new IllegalArgumentException(
                    "Chưa thể Kết ca (Điều kiện 3/3): Còn " + String.format("%,d", codHolding)
                            + " ₫ tiền mặt COD cầm tay chưa nộp cho Thủ quỹ / Chuyển khoản công ty!");
        }

        Instant now = Instant.now();
        shipper.setShiftStatus("OFF_SHIFT");
        shipper.setShiftEndedAt(now);
        shipper.setLastTelemetryAt(now);
        shipper.setUpdatedAt(now);
        HubLocalShipper saved = shipperRepository.save(shipper);

        boolean hasDelivered = myItems.stream().anyMatch(i -> "DELIVERED_POD".equalsIgnoreCase(i.getDispatchStatus()));
        if (hasDelivered) {
            settleShiftPod(
                    SettleShiftPodRequest.builder()
                            .hubCode(shipper.getHubCode())
                            .shipperCode(shipper.getShipperCode())
                            .note("Chốt sổ tự động khi Kết ca chuẩn 3 điều kiện tại Bưu cục")
                            .build(),
                    authContext
            );
        }

        emitRealtime(saved.getHubCode(), saved.getShipperCode(), "HUB_SHIFT_ENDED", saved.getShipperCode());
        return saved;
    }

    @Transactional
    public HubLocalShipper updateShipperTelemetryAndShift(
            String shipperCode,
            ShipperTelemetryUpdateRequest request,
            HubAuthContext authContext) {
        HubLocalShipper shipper = shipperRepository.findByShipperCode(shipperCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + shipperCode));
        hubIsolationValidator.validateShipperProfileEditAccess(authContext, shipper);

        Instant now = Instant.now();
        if (hasText(request.getShiftStatus())) {
            String targetShift = request.getShiftStatus().trim().toUpperCase(Locale.ROOT);
            long activeInTransit = countShipperItemsByStatus(
                    shipper.getHubCode(), shipper.getShipperCode(), Set.of("OUT_FOR_DELIVERY"));
            if (activeInTransit > 0 && !"ON_DELIVERY".equals(targetShift)) {
                throw new IllegalArgumentException(
                        "Không thể chuyển sang " + targetShift + " khi đang có " + activeInTransit
                                + " kiện hàng Đang đi giao (OUT_FOR_DELIVERY) trên xe!");
            }
            shipper.setShiftStatus(targetShift);
            if ("AVAILABLE".equals(targetShift) && shipper.getShiftCheckedInAt() == null) {
                shipper.setShiftCheckedInAt(now);
            }
        }
        if (request.getCurrentLat() != null && request.getCurrentLng() != null) {
            shipper.setCurrentLat(request.getCurrentLat());
            shipper.setCurrentLng(request.getCurrentLng());
        }
        shipper.setLastTelemetryAt(now);
        shipper.setUpdatedAt(now);
        HubLocalShipper saved = shipperRepository.save(shipper);
        emitRealtime(saved.getHubCode(), saved.getShipperCode(), "SHIPPER_TELEMETRY_UPDATED", saved.getShipperCode());
        return saved;
    }

    @Transactional
    public HubShipperShiftSettlement settleShiftPod(
            SettleShiftPodRequest request,
            HubAuthContext authContext) {
        HubLocalShipper shipper = shipperRepository.findByShipperCode(request.getShipperCode().trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + request.getShipperCode()));
        hubIsolationValidator.validateShipperProfileEditAccess(authContext, shipper);

        List<ContainerCargoManifestItem> myItems = manifestItemRepository
                .findByHubCodeOrderByItemCodeAsc(shipper.getHubCode()).stream()
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .filter(i -> shipper.getShipperCode().equalsIgnoreCase(i.getAssignedShipperCode()))
                .toList();

        List<ContainerCargoManifestItem> delivered = myItems.stream()
                .filter(i -> "DELIVERED_POD".equalsIgnoreCase(i.getDispatchStatus()))
                .toList();

        if (delivered.isEmpty()) {
            throw new IllegalArgumentException("Chưa có kiện hàng nào hoàn tất POD trong ca để thực hiện đối soát.");
        }

        long baseFee = 0L;
        long coldBonus = 0L;
        long weightFee = 0L;
        for (ContainerCargoManifestItem item : delivered) {
            baseFee += BASE_STOP_FEE_VND;
            if (Boolean.TRUE.equals(item.getRequiresColdChain())) {
                coldBonus += COLD_CHAIN_BONUS_VND;
            }
            double w = item.getWeightKg() != null ? item.getWeightKg() : 50.0;
            weightFee += Math.round((w / 100.0) * WEIGHT_SURCHARGE_PER_100KG_VND);
        }

        boolean questUnlocked = !myItems.isEmpty() && delivered.size() >= myItems.size();
        long gemBonus = questUnlocked ? DAILY_GEM_BONUS_VND : 0L;
        long totalEarned = baseFee + coldBonus + weightFee + gemBonus;

        String shiftDate = LocalDate.now(VN_ZONE).toString();
        Instant now = Instant.now();

        HubShipperShiftSettlement settlement = (shiftSettlementRepository != null
                ? shiftSettlementRepository.findFirstByShipperCodeAndShiftDateOrderBySettledAtDesc(shipper.getShipperCode(), shiftDate)
                : Optional.<HubShipperShiftSettlement>empty())
                .orElseGet(() -> HubShipperShiftSettlement.builder()
                        .settlementCode("STL-" + shipper.getShipperCode().replace("SHP-", "") + "-" + shiftDate.replace("-", ""))
                        .hubCode(shipper.getHubCode())
                        .shipperCode(shipper.getShipperCode())
                        .shipperName(shipper.getFullName())
                        .shiftDate(shiftDate)
                        .createdAt(now)
                        .build());

        settlement.setDeliveredPodCount(delivered.size());
        settlement.setTotalStopsCount(myItems.size());
        settlement.setBaseFeeVnd(baseFee);
        settlement.setWeightSurchargeVnd(weightFee);
        settlement.setColdChainBonusVnd(coldBonus);
        settlement.setSlaGemBonusVnd(gemBonus);
        settlement.setTotalEarnedVnd(totalEarned);
        settlement.setSettlementStatus("SETTLED");
        settlement.setSettledBy(authContext.username());
        settlement.setNote(hasText(request.getNote())
                ? request.getNote().trim()
                : "Đối soát tự động " + delivered.size() + "/" + myItems.size() + " chứng từ Photo POD hợp lệ");
        settlement.setSettledAt(now);

        HubShipperShiftSettlement saved = shiftSettlementRepository != null
                ? shiftSettlementRepository.save(settlement)
                : settlement;
        emitRealtime(shipper.getHubCode(), shipper.getShipperCode(), "SHIFT_POD_SETTLED", saved.getSettlementCode());
        return saved;
    }

    @Transactional
    public ContainerCargoManifestItem softDeleteManifestItem(String itemCode, HubAuthContext authContext) {
        ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(itemCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kiện hàng: " + itemCode));
        hubIsolationValidator.validateManagerItemAccess(authContext, item, "xóa mềm");
        Instant now = Instant.now();
        item.setIsDeleted(true);
        item.setDeletedAt(now);
        item.setDeletedBy(authContext.username());
        item.setUpdatedAt(now);
        ContainerCargoManifestItem saved = manifestItemRepository.save(item);
        emitRealtime(saved.getHubCode(), saved.getAssignedShipperCode(), "ITEM_SOFT_DELETED", saved.getItemCode());
        return saved;
    }

    @Transactional
    public ContainerCargoManifestItem restoreManifestItem(String itemCode, HubAuthContext authContext) {
        hubIsolationValidator.requireAuthenticatedContext(authContext);
        ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(itemCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kiện hàng: " + itemCode));
        hubIsolationValidator.validateManagerItemAccess(authContext, item, "khôi phục");
        item.setIsDeleted(false);
        item.setDeletedAt(null);
        item.setDeletedBy(null);
        item.setUpdatedAt(Instant.now());
        ContainerCargoManifestItem saved = manifestItemRepository.save(item);
        emitRealtime(saved.getHubCode(), saved.getAssignedShipperCode(), "ITEM_RESTORED", saved.getItemCode());
        return saved;
    }

    @Transactional
    public HubLocalShipper updateShipperProfile(
            String shipperCode,
            UpdateShipperProfileRequest request,
            HubAuthContext authContext
    ) {
        HubLocalShipper shipper = shipperRepository.findByShipperCode(shipperCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + shipperCode));
        hubIsolationValidator.validateShipperProfileEditAccess(authContext, shipper);

        if (hasText(request.getFullName())) shipper.setFullName(request.getFullName().trim());
        if (request.getAvatarUrl() != null) shipper.setAvatarUrl(request.getAvatarUrl().isBlank() ? null : request.getAvatarUrl().trim());
        if (hasText(request.getPhone())) shipper.setPhone(request.getPhone().trim());
        if (hasText(request.getPermanentAddress())) shipper.setPermanentAddress(request.getPermanentAddress().trim());
        if (hasText(request.getEmergencyContactName())) shipper.setEmergencyContactName(request.getEmergencyContactName().trim());
        if (hasText(request.getEmergencyContactPhone())) shipper.setEmergencyContactPhone(request.getEmergencyContactPhone().trim());
        if (hasText(request.getCccdMasked())) shipper.setCccdMasked(request.getCccdMasked().trim());
        if (hasText(request.getCccdIssuedBy())) shipper.setCccdIssuedBy(request.getCccdIssuedBy().trim());
        if (hasText(request.getCccdIssuedDate())) shipper.setCccdIssuedDate(request.getCccdIssuedDate().trim());
        if (hasText(request.getCriminalRecordCode())) shipper.setCriminalRecordCode(request.getCriminalRecordCode().trim());
        if (hasText(request.getDriverLicenseClass())) shipper.setDriverLicenseClass(request.getDriverLicenseClass().trim().toUpperCase(Locale.ROOT));
        if (hasText(request.getDriverLicenseMasked())) shipper.setDriverLicenseMasked(request.getDriverLicenseMasked().trim());
        if (hasText(request.getDriverLicenseExpiryDate())) shipper.setDriverLicenseExpiryDate(request.getDriverLicenseExpiryDate().trim());
        if (request.getColdChainCertified() != null) shipper.setColdChainCertified(request.getColdChainCertified());
        if (hasText(request.getVehiclePlate())) shipper.setVehiclePlate(request.getVehiclePlate().trim().toUpperCase(Locale.ROOT));
        if (hasText(request.getVehicleType())) shipper.setVehicleType(request.getVehicleType().trim());
        if (hasText(request.getVehicleRegistrationNo())) shipper.setVehicleRegistrationNo(request.getVehicleRegistrationNo().trim());
        if (hasText(request.getGpsDeviceCode())) shipper.setGpsDeviceCode(request.getGpsDeviceCode().trim().toUpperCase(Locale.ROOT));
        if (hasText(request.getInspectionExpiryDate())) shipper.setInspectionExpiryDate(request.getInspectionExpiryDate().trim());
        if (hasText(request.getInsuranceExpiryDate())) shipper.setInsuranceExpiryDate(request.getInsuranceExpiryDate().trim());
        if (hasText(request.getHealthCheckExpiryDate())) shipper.setHealthCheckExpiryDate(request.getHealthCheckExpiryDate().trim());
        if (hasText(request.getShiftStatus())) shipper.setShiftStatus(request.getShiftStatus().trim().toUpperCase(Locale.ROOT));
        shipper.setUpdatedAt(Instant.now());
        HubLocalShipper saved = shipperRepository.save(shipper);
        emitRealtime(saved.getHubCode(), saved.getShipperCode(), "SHIPPER_PROFILE_UPDATED", saved.getShipperCode());
        return saved;
    }

    @Transactional
    public HubLocalShipper verifyShipperKyc(
            String shipperCode,
            VerifyShipperKycRequest request,
            HubAuthContext authContext
    ) {
        HubLocalShipper shipper = shipperRepository.findByShipperCode(shipperCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Shipper: " + shipperCode));
        hubIsolationValidator.validateShipperVerificationAccess(authContext, shipper);

        Instant now = Instant.now();
        String nextStatus = request.getKycStatus().trim().toUpperCase(Locale.ROOT);
        shipper.setKycStatus(nextStatus);
        shipper.setKycNote(hasText(request.getKycNote()) ? request.getKycNote().trim() : null);
        if ("VERIFIED".equals(nextStatus)) {
            shipper.setKycVerifiedAt(now);
            shipper.setKycVerifiedBy(authContext.username());
        } else {
            shipper.setKycVerifiedAt(null);
            shipper.setKycVerifiedBy(authContext.username());
        }
        shipper.setUpdatedAt(now);
        HubLocalShipper saved = shipperRepository.save(shipper);
        emitRealtime(saved.getHubCode(), saved.getShipperCode(), "SHIPPER_KYC_VERIFIED", saved.getShipperCode());
        return saved;
    }

    private long countShipperItemsByStatus(String hubCode, String shipperCode, Set<String> statuses) {
        List<ContainerCargoManifestItem> items = manifestItemRepository.findByHubCodeOrderByItemCodeAsc(hubCode);
        if (items == null) return 0L;
        return items.stream()
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .filter(i -> shipperCode.equalsIgnoreCase(i.getAssignedShipperCode()))
                .filter(i -> i.getDispatchStatus() != null && statuses.contains(i.getDispatchStatus().toUpperCase(Locale.ROOT)))
                .count();
    }

    private void syncShipperShiftAndGpsAfterMutation(
            String shipperCode,
            Double lat,
            Double lng,
            boolean forceOnDelivery,
            Instant now) {
        if (!hasText(shipperCode)) return;
        shipperRepository.findByShipperCode(shipperCode).ifPresent(shipper -> {
            if (forceOnDelivery) {
                shipper.setShiftStatus("ON_DELIVERY");
                shipper.setShiftEndedAt(null);
                if (shipper.getShiftCheckedInAt() == null) {
                    shipper.setShiftCheckedInAt(now);
                }
            }
            if (lat != null && lng != null) {
                shipper.setCurrentLat(lat);
                shipper.setCurrentLng(lng);
            }
            shipper.setLastTelemetryAt(now);
            shipper.setUpdatedAt(now);
            shipperRepository.save(shipper);
        });
    }

    private void recomputeShipperShiftAfterStopCompletion(
            String hubCode,
            String shipperCode,
            Double completedLat,
            Double completedLng,
            Instant now) {
        long remainingInTransit = countShipperItemsByStatus(hubCode, shipperCode, Set.of("OUT_FOR_DELIVERY"));

        shipperRepository.findByShipperCode(shipperCode).ifPresent(shipper -> {
            if (completedLat != null && completedLng != null) {
                shipper.setCurrentLat(completedLat);
                shipper.setCurrentLng(completedLng);
                shipper.setCompletedOrdersMonth((shipper.getCompletedOrdersMonth() != null ? shipper.getCompletedOrdersMonth() : 0) + 1);
            }
            shipper.setShiftStatus(remainingInTransit > 0 ? "ON_DELIVERY" : "AVAILABLE");
            shipper.setLastTelemetryAt(now);
            shipper.setUpdatedAt(now);
            shipperRepository.save(shipper);
        });
    }

    private String appendTimelineStep(String existingJson, String status, String note) {
        List<Map<String, Object>> steps = new ArrayList<>();
        if (hasText(existingJson)) {
            try {
                List<Map<String, Object>> parsed = objectMapper.readValue(
                        existingJson, new TypeReference<List<Map<String, Object>>>() {});
                if (parsed != null) {
                    steps.addAll(parsed);
                }
            } catch (Exception ignored) {
                // ignore malformed legacy string
            }
        }
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("time", ZonedDateTime.now(VN_ZONE).format(HH_MM_FMT));
        entry.put("status", status);
        entry.put("note", note);
        steps.add(entry);
        try {
            return objectMapper.writeValueAsString(steps);
        } catch (Exception ex) {
            return existingJson;
        }
    }

    private void emitRealtime(String hubCode, String shipperCode, String eventType, String refCode) {
        if (realtimeBroadcaster != null) {
            realtimeBroadcaster.broadcastMutation(hubCode, shipperCode, eventType, refCode);
        }
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    public double calculateHaversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }
}
