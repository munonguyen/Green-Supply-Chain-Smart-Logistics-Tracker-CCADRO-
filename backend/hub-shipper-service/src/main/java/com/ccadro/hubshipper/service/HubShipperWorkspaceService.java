package com.ccadro.hubshipper.service;

import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.dto.request.AssignTaskRangeRequest;
import com.ccadro.hubshipper.dto.request.SubmitPhotoPodRequest;
import com.ccadro.hubshipper.dto.response.HubShipperWorkspaceResponse;
import com.ccadro.hubshipper.entity.*;
import com.ccadro.hubshipper.repository.*;
import com.ccadro.hubshipper.validate.HubIsolationValidator;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class HubShipperWorkspaceService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    com.ccadro.hubshipper.mapper.HubWorkspaceMapper workspaceMapper;
    LocalDistributionHubRepository hubRepository;
    HubShipperPolicyRepository policyRepository;
    HubLocalShipperRepository shipperRepository;
    ContainerCargoManifestItemRepository manifestItemRepository;
    HubTaskRangeAssignmentRepository rangeAssignmentRepository;
    HubIsolationValidator hubIsolationValidator;

    public HubShipperWorkspaceService(
            com.ccadro.hubshipper.mapper.HubWorkspaceMapper workspaceMapper,
            LocalDistributionHubRepository hubRepository,
            HubShipperPolicyRepository policyRepository,
            HubLocalShipperRepository shipperRepository,
            ContainerCargoManifestItemRepository manifestItemRepository,
            HubTaskRangeAssignmentRepository rangeAssignmentRepository) {
        this(workspaceMapper, hubRepository, policyRepository, shipperRepository,
                manifestItemRepository, rangeAssignmentRepository, new HubIsolationValidator());
    }

    @Autowired
    public HubShipperWorkspaceService(
            com.ccadro.hubshipper.mapper.HubWorkspaceMapper workspaceMapper,
            LocalDistributionHubRepository hubRepository,
            HubShipperPolicyRepository policyRepository,
            HubLocalShipperRepository shipperRepository,
            ContainerCargoManifestItemRepository manifestItemRepository,
            HubTaskRangeAssignmentRepository rangeAssignmentRepository,
            HubIsolationValidator hubIsolationValidator) {
        this.workspaceMapper = workspaceMapper;
        this.hubRepository = hubRepository;
        this.policyRepository = policyRepository;
        this.shipperRepository = shipperRepository;
        this.manifestItemRepository = manifestItemRepository;
        this.rangeAssignmentRepository = rangeAssignmentRepository;
        this.hubIsolationValidator = hubIsolationValidator != null ? hubIsolationValidator : new HubIsolationValidator();
    }

    /**
     * Trả về không gian làm việc cô lập theo đúng Trụ sở (Hub Isolation) của tài khoản Shipper.
     * Shipper thuộc trụ sở nào chỉ nhìn thấy Policy, phạm vi giao hàng hôm nay, dải mã nhiệm vụ
     * và danh sách hàng hóa của đúng Trụ sở đó.
     */
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

        String authBoundHub = (authContext != null && authContext.isAuthenticated() && !authContext.isAdmin()
                && authContext.assignedHubCode() != null && !authContext.assignedHubCode().isBlank())
                ? authContext.assignedHubCode().trim()
                : null;

        String resolvedHubCode = authBoundHub != null
                ? authBoundHub
                : ((requestedHubCode != null && !requestedHubCode.isBlank())
                        ? requestedHubCode.trim()
                        : (matchedShipper != null ? matchedShipper.getHubCode() : null));

        LocalDistributionHub hub = hubRepository.findByHubCode(resolvedHubCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Trụ sở được chỉ định: " + resolvedHubCode));

        String finalHubCode = hub != null ? hub.getHubCode() : resolvedHubCode;
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

        // Minimization: If caller is a local HUB_SHIPPER / SHIPPER, scope down strictly to their assigned code range & items
        if (authContext != null && authContext.isAuthenticated() && authContext.isShipperScoped() && activeShipper != null) {
            final String myShipperCode = activeShipper.getShipperCode();
            rangeAssignments = rangeAssignments.stream()
                    .filter(r -> myShipperCode.equalsIgnoreCase(r.getShipperCode()))
                    .toList();
            manifestItems = manifestItems.stream()
                    .filter(m -> myShipperCode.equalsIgnoreCase(m.getAssignedShipperCode()))
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

        return workspaceMapper.workspace(finalHubCode, hub, policy, activeShipper, hubShippers, rangeAssignments, manifestItems);
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

        return rangeAssignmentRepository.save(batch);
    }

    /**
     * Cập nhật trạng thái Tracking đồ đã giao và đính kèm Hình ảnh xác thực (Photo POD) cho từng món đồ.
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

        Instant now = Instant.now();
        item.setDispatchStatus(nextStatus);
        if (nextPhotoUrl != null && !nextPhotoUrl.isBlank()) {
            item.setProofImageUrl(nextPhotoUrl);
            item.setProofUploadedAt(now);
        }
        if (request.getProofImageCaption() != null && !request.getProofImageCaption().isBlank()) {
            item.setProofImageCaption(request.getProofImageCaption().trim());
        }
        if (request.getRecipientPodName() != null && !request.getRecipientPodName().isBlank()) {
            item.setRecipientPodName(request.getRecipientPodName().trim());
        }
        if ("DELIVERED_POD".equals(nextStatus)) {
            item.setDeliveredAt(now);
            if (item.getRecipientPodName() == null || item.getRecipientPodName().isBlank()) {
                item.setRecipientPodName(item.getConsigneeName() + " (Đã ký nhận & chụp ảnh POD)");
            }
        }
        item.setUpdatedAt(now);
        return manifestItemRepository.save(item);
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
        return manifestItemRepository.save(item);
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
        return manifestItemRepository.save(item);
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

