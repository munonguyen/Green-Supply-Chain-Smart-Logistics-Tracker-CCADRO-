package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ManifestItemStatusUpdateRequest;
import com.ccadro.asset.dto.request.ThirdPartyHandoverUpdateRequest;
import com.ccadro.asset.dto.response.ContainerCargoManifestItemResponse;
import com.ccadro.asset.dto.response.HubLocalShipperResponse;
import com.ccadro.asset.dto.response.LocalDistributionHubResponse;
import com.ccadro.asset.dto.response.ThirdPartyHandoverResponse;
import com.ccadro.asset.entity.ContainerCargoManifestItem;
import com.ccadro.asset.entity.HubLocalShipper;
import com.ccadro.asset.entity.LocalDistributionHub;
import com.ccadro.asset.entity.ThirdPartyHandover;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.ContainerCargoManifestItemRepository;
import com.ccadro.asset.repository.HubLocalShipperRepository;
import com.ccadro.asset.repository.LocalDistributionHubRepository;
import com.ccadro.asset.repository.ThirdPartyHandoverRepository;
import com.ccadro.asset.validate.AssetBusinessValidator;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ThirdPartyHandoverService {
    private final com.ccadro.asset.mapper.HandoverMapper handoverMapper;

    private static final double EARTH_RADIUS_KM = 6371.0;

    ThirdPartyHandoverRepository handoverRepository;
    LocalDistributionHubRepository hubRepository;
    HubLocalShipperRepository hubShipperRepository;
    ContainerCargoManifestItemRepository manifestItemRepository;
    AssetBusinessValidator assetBusinessValidator;

    public ThirdPartyHandoverService(
            com.ccadro.asset.mapper.HandoverMapper handoverMapper,
            ThirdPartyHandoverRepository handoverRepository,
            LocalDistributionHubRepository hubRepository,
            HubLocalShipperRepository hubShipperRepository,
            ContainerCargoManifestItemRepository manifestItemRepository) {
        this(handoverMapper, handoverRepository, hubRepository, hubShipperRepository, manifestItemRepository,
                new AssetBusinessValidator(null, null, manifestItemRepository));
    }

    @Autowired
    public ThirdPartyHandoverService(
            com.ccadro.asset.mapper.HandoverMapper handoverMapper,
            ThirdPartyHandoverRepository handoverRepository,
            LocalDistributionHubRepository hubRepository,
            HubLocalShipperRepository hubShipperRepository,
            ContainerCargoManifestItemRepository manifestItemRepository,
            AssetBusinessValidator assetBusinessValidator) {
        this.handoverMapper = handoverMapper;
        this.handoverRepository = handoverRepository;
        this.hubRepository = hubRepository;
        this.hubShipperRepository = hubShipperRepository;
        this.manifestItemRepository = manifestItemRepository;
        this.assetBusinessValidator = assetBusinessValidator;
    }

    public List<ThirdPartyHandoverResponse> getAllHandovers() {
        return handoverRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<LocalDistributionHubResponse> getAllHubs() {
        return hubRepository.findAllByOrderByHubCodeAsc().stream()
                .map(this::toHubResponse)
                .toList();
    }

    public List<HubLocalShipperResponse> getShippersByHub(String hubCode) {
        List<HubLocalShipper> shippers = (hubCode == null || hubCode.isBlank())
                ? hubShipperRepository.findAllByOrderByHubCodeAscShipperCodeAsc()
                : hubShipperRepository.findByHubCodeOrderByShipperCodeAsc(hubCode.trim());
        return shippers.stream().map(this::toShipperResponse).toList();
    }

    public List<ContainerCargoManifestItemResponse> getManifestItems(String hubCode, String containerCode) {
        return getManifestItems(hubCode, containerCode, null, false);
    }

    public List<ContainerCargoManifestItemResponse> getManifestItems(
            String hubCode,
            String containerCode,
            String q,
            boolean includeDeleted) {
        List<ContainerCargoManifestItem> items;
        if (containerCode != null && !containerCode.isBlank()) {
            items = manifestItemRepository.findByContainerCodeOrderByItemCodeAsc(containerCode.trim());
        } else if (hubCode != null && !hubCode.isBlank()) {
            items = manifestItemRepository.findByHubCodeOrderByItemCodeAsc(hubCode.trim());
        } else {
            items = manifestItemRepository.findAllByOrderByItemCodeAsc();
        }
        List<ContainerCargoManifestItem> active = items.stream()
                .filter(m -> includeDeleted || !Boolean.TRUE.equals(m.getIsDeleted()))
                .toList();
        List<ContainerCargoManifestItem> ranked = ElasticSearchSupport.filterAndRank(
                active,
                q,
                m -> List.of(
                        new ElasticSearchSupport.WeightedField(m.getItemCode(), 5.0),
                        new ElasticSearchSupport.WeightedField(m.getCargoName(), 4.5),
                        new ElasticSearchSupport.WeightedField(m.getConsigneeName(), 4.0),
                        new ElasticSearchSupport.WeightedField(m.getDeliveryAddress(), 3.0),
                        new ElasticSearchSupport.WeightedField(m.getDeliveryZoneName(), 3.0),
                        new ElasticSearchSupport.WeightedField(m.getAssignedShipperCode(), 3.5),
                        new ElasticSearchSupport.WeightedField(m.getAssignedShipperName(), 3.5),
                        new ElasticSearchSupport.WeightedField(m.getContainerCode(), 3.0),
                        new ElasticSearchSupport.WeightedField(m.getShipmentCode(), 3.5)
                )
        );
        return ranked.stream().map(this::toManifestItemResponse).toList();
    }

    @Transactional
    public ContainerCargoManifestItemResponse softDeleteManifestItem(String itemCode, String deletedBy) {
        ContainerCargoManifestItem item = assetBusinessValidator.requireManifestItemByCode(itemCode);
        item.setIsDeleted(true);
        item.setDeletedAt(Instant.now());
        item.setDeletedBy(deletedBy != null && !deletedBy.isBlank() ? deletedBy : "HUB_MANAGER");
        item.setUpdatedAt(Instant.now());
        return toManifestItemResponse(manifestItemRepository.save(item));
    }

    @Transactional
    public ContainerCargoManifestItemResponse restoreManifestItem(String itemCode) {
        ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(itemCode.trim())
                .orElseThrow(() -> new com.ccadro.asset.exception.AppException(
                        com.ccadro.asset.exception.ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Không tìm thấy kiện hàng: " + itemCode));
        item.setIsDeleted(false);
        item.setDeletedAt(null);
        item.setDeletedBy(null);
        item.setUpdatedAt(Instant.now());
        return toManifestItemResponse(manifestItemRepository.save(item));
    }

    /**
     * Bước 1: Khi Container tới Trụ sở (hoặc gửi báo trước EDI/ASN), truyền toàn bộ dữ liệu
     * các món hàng hóa trong Container sang hệ thống của Trụ sở đó.
     */
    @Transactional
    public List<ContainerCargoManifestItemResponse> ingestContainerManifestToHub(String containerCode) {
        Instant now = Instant.now();
        List<ContainerCargoManifestItem> items = manifestItemRepository
                .findByContainerCodeOrderByItemCodeAsc(containerCode.trim());

        for (ContainerCargoManifestItem item : items) {
            if ("IN_CONTAINER".equalsIgnoreCase(item.getDispatchStatus())) {
                item.setDispatchStatus("SYNCED_TO_HUB");
                item.setUpdatedAt(now);
            }
        }
        manifestItemRepository.saveAll(items);

        handoverRepository.findByContainerCode(containerCode.trim()).ifPresent(handover -> {
            handover.setManifestIngested(true);
            handover.setManifestIngestedAt(now);
            if ("AWAITING_ARRIVAL".equalsIgnoreCase(handover.getHandoverStatus())) {
                handover.setHandoverStatus("AT_GATE_DOCKED");
            }
            String payload = String.format(
                    Locale.US,
                    "{\"event\":\"CONTAINER_MANIFEST_INGESTED_TO_HUB\",\"containerCode\":\"%s\",\"hubCode\":\"%s\",\"itemCount\":%d,\"syncedAt\":\"%s\"}",
                    handover.getContainerCode(),
                    handover.getHubCode() != null ? handover.getHubCode() : "HUB_LOCAL",
                    items.size(),
                    now
            );
            handover.setLastSyncStatus("MANIFEST_INGESTED");
            handover.setLastSyncPayload(payload);
            handover.setLastSyncedAt(now);
            handover.setUpdatedAt(now);
            handoverRepository.save(handover);
        });

        return items.stream().map(this::toManifestItemResponse).toList();
    }

    /**
     * Bước 2: Hệ thống của Trụ sở tự động phân công từng món đồ cho các Shipper thuộc Trụ sở đó
     * dựa trên khoảng cách địa lý Haversine từ điểm giao của món đồ tới Vị trí được phân công của Shipper,
     * kết hợp kiểm tra điều kiện chuỗi lạnh (Cold-Chain) và tải trọng phương tiện.
     */
    @Transactional
    public List<ContainerCargoManifestItemResponse> autoDispatchManifestByProximity(String hubCode, String containerCode) {
        Instant now = Instant.now();
        List<ContainerCargoManifestItem> items;
        if (containerCode != null && !containerCode.isBlank()) {
            items = manifestItemRepository.findByContainerCodeOrderByItemCodeAsc(containerCode.trim());
        } else if (hubCode != null && !hubCode.isBlank()) {
            items = manifestItemRepository.findByHubCodeOrderByItemCodeAsc(hubCode.trim());
        } else {
            items = manifestItemRepository.findAllByOrderByItemCodeAsc();
        }

        for (ContainerCargoManifestItem item : items) {
            if ("DELIVERED_POD".equalsIgnoreCase(item.getDispatchStatus())
                    || "OUT_FOR_DELIVERY".equalsIgnoreCase(item.getDispatchStatus())) {
                continue;
            }

            List<HubLocalShipper> hubShippers = hubShipperRepository
                    .findByHubCodeOrderByShipperCodeAsc(item.getHubCode());
            if (hubShippers.isEmpty()) {
                continue;
            }

            HubLocalShipper bestShipper = selectOptimalShipperForCargo(item, hubShippers);
            double distanceKm = calculateHaversineKm(
                    item.getDeliveryLat(),
                    item.getDeliveryLng(),
                    bestShipper.getAssignedLat(),
                    bestShipper.getAssignedLng()
            );
            double roundedDistKm = Math.round(distanceKm * 100.0) / 100.0;
            double score = calculateProximityMatchScore(distanceKm, bestShipper, item);

            item.setDispatchStatus("ASSIGNED_TO_SHIPPER");
            item.setAssignedShipperCode(bestShipper.getShipperCode());
            item.setAssignedShipperName(bestShipper.getFullName());
            item.setProximityDistanceKm(roundedDistKm);
            item.setMatchScore(score);
            item.setDispatchReason(String.format(
                    Locale.US,
                    "Gần vị trí phân công nhất (%.2f km) • %s • %s",
                    roundedDistKm,
                    bestShipper.getAssignedZoneName(),
                    Boolean.TRUE.equals(item.getRequiresColdChain())
                            ? "Đạt chuẩn Xe bảo ôn lạnh"
                            : "Khớp tải trọng tuyến nội khu"
            ));
            item.setAssignedAt(now);
            item.setUpdatedAt(now);

            double nextLoad = (bestShipper.getCurrentLoadKg() != null ? bestShipper.getCurrentLoadKg() : 0.0)
                    + (item.getWeightKg() != null ? item.getWeightKg() : 0.0);
            bestShipper.setCurrentLoadKg(Math.min(bestShipper.getMaxCapacityKg(), nextLoad));
            bestShipper.setActiveItemCount(
                    (bestShipper.getActiveItemCount() != null ? bestShipper.getActiveItemCount() : 0) + 1
            );
            bestShipper.setUpdatedAt(now);
            hubShipperRepository.save(bestShipper);
        }

        manifestItemRepository.saveAll(items);

        if (containerCode != null && !containerCode.isBlank()) {
            handoverRepository.findByContainerCode(containerCode.trim()).ifPresent(handover -> {
                handover.setManifestIngested(true);
                if (handover.getManifestIngestedAt() == null) {
                    handover.setManifestIngestedAt(now);
                }
                handover.setLastSyncStatus("AUTO_DISPATCHED_BY_PROXIMITY");
                handover.setLastSyncedAt(now);
                handover.setUpdatedAt(now);
                handoverRepository.save(handover);
            });
        }

        return items.stream().map(this::toManifestItemResponse).toList();
    }

    @Transactional
    public ContainerCargoManifestItemResponse assignManifestItemToShipper(String itemCode, String shipperCode) {
        Instant now = Instant.now();
        ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(itemCode.trim())
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));
        HubLocalShipper shipper = hubShipperRepository.findByShipperCode(shipperCode.trim())
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));

        double distanceKm = calculateHaversineKm(
                item.getDeliveryLat(),
                item.getDeliveryLng(),
                shipper.getAssignedLat(),
                shipper.getAssignedLng()
        );
        double roundedDistKm = Math.round(distanceKm * 100.0) / 100.0;
        double score = calculateProximityMatchScore(distanceKm, shipper, item);

        item.setDispatchStatus("ASSIGNED_TO_SHIPPER");
        item.setAssignedShipperCode(shipper.getShipperCode());
        item.setAssignedShipperName(shipper.getFullName());
        item.setProximityDistanceKm(roundedDistKm);
        item.setMatchScore(score);
        item.setDispatchReason(String.format(
                Locale.US,
                "Phân công theo tuyến (%.2f km tới chốt %s)",
                roundedDistKm,
                shipper.getAssignedZoneName()
        ));
        item.setAssignedAt(now);
        item.setUpdatedAt(now);

        return toManifestItemResponse(manifestItemRepository.save(item));
    }

    @Transactional
    public ContainerCargoManifestItemResponse updateManifestItemStatus(
            String itemCode,
            ManifestItemStatusUpdateRequest request
    ) {
        Instant now = Instant.now();
        ContainerCargoManifestItem item = manifestItemRepository.findByItemCode(itemCode.trim())
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));

        String nextStatus = request.getDispatchStatus().trim().toUpperCase();
        item.setDispatchStatus(nextStatus);
        if (request.getRecipientPodName() != null && !request.getRecipientPodName().isBlank()) {
            item.setRecipientPodName(request.getRecipientPodName().trim());
        }
        if ("DELIVERED_POD".equals(nextStatus)) {
            item.setDeliveredAt(now);
            if (item.getRecipientPodName() == null || item.getRecipientPodName().isBlank()) {
                item.setRecipientPodName(item.getConsigneeName() + " (Đã ký POD)");
            }
        }
        item.setUpdatedAt(now);
        ContainerCargoManifestItem saved = manifestItemRepository.save(item);

        // Nếu tất cả kiện hàng trong Container đã giao xong (DELIVERED_POD), tự động đồng bộ hoàn tất về Container
        List<ContainerCargoManifestItem> containerItems = manifestItemRepository
                .findByContainerCodeOrderByItemCodeAsc(saved.getContainerCode());
        boolean allDelivered = !containerItems.isEmpty() && containerItems.stream()
                .allMatch(i -> "DELIVERED_POD".equalsIgnoreCase(i.getDispatchStatus()));
        if (allDelivered) {
            handoverRepository.findByContainerCode(saved.getContainerCode()).ifPresent(handover -> {
                handover.setHandoverStatus("SYNCED_3PL");
                if (handover.getEpodSignedBy() == null || handover.getEpodSignedBy().isBlank()) {
                    handover.setEpodSignedBy("Hệ thống Trụ sở " + saved.getHubCode() + " (Hoàn tất 100% kiện hàng)");
                }
                if (handover.getEpodSignatureHash() == null || handover.getEpodSignatureHash().isBlank()) {
                    handover.setEpodSignatureHash("SHA256:" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
                }
                applyWebhookPayload(handover);
                handover.setUpdatedAt(now);
                handoverRepository.save(handover);
            });
        }

        return toManifestItemResponse(saved);
    }

    /**
     * Lựa chọn Shipper tối ưu trong cùng Trụ sở dựa trên:
     * 1. Ràng buộc bảo quản lạnh (requiresColdChain -> ưu tiên tuyệt đối shipper có coldChainCapable = true)
     * 2. Khoảng cách Haversine gần nhất từ vị trí được phân công của Shipper (assignedLat, assignedLng) tới điểm giao hàng.
     */
    public HubLocalShipper selectOptimalShipperForCargo(
            ContainerCargoManifestItem item,
            List<HubLocalShipper> hubShippers
    ) {
        boolean needCold = Boolean.TRUE.equals(item.getRequiresColdChain());

        List<HubLocalShipper> eligible = hubShippers.stream()
                .filter(s -> !"OFF_DUTY".equalsIgnoreCase(s.getShiftStatus()))
                .filter(s -> !needCold || Boolean.TRUE.equals(s.getColdChainCapable()))
                .toList();

        List<HubLocalShipper> pool = eligible.isEmpty() ? hubShippers : eligible;

        return pool.stream()
                .min(Comparator.comparingDouble(s -> calculateHaversineKm(
                        item.getDeliveryLat(),
                        item.getDeliveryLng(),
                        s.getAssignedLat(),
                        s.getAssignedLng()
                )))
                .orElse(hubShippers.get(0));
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

    private double calculateProximityMatchScore(double distanceKm, HubLocalShipper shipper, ContainerCargoManifestItem item) {
        double base = Math.max(60.0, 99.5 - distanceKm * 8.5);
        double radius = shipper.getCoverageRadiusKm() != null ? shipper.getCoverageRadiusKm() : 2.5;
        if (distanceKm <= radius) {
            base = Math.min(99.8, base + 1.2);
        }
        if (Boolean.TRUE.equals(item.getRequiresColdChain()) && Boolean.TRUE.equals(shipper.getColdChainCapable())) {
            base = Math.min(99.8, base + 0.5);
        }
        return Math.round(base * 10.0) / 10.0;
    }

    @Transactional
    public ThirdPartyHandoverResponse updateHandoverStatus(String containerCode, ThirdPartyHandoverUpdateRequest request) {
        ThirdPartyHandover entity = handoverRepository.findByContainerCode(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));

        String nextStatus = request.getHandoverStatus().trim().toUpperCase();
        entity.setHandoverStatus(nextStatus);
        if (request.getDockGate() != null && !request.getDockGate().isBlank()) {
            entity.setDockGate(request.getDockGate().trim());
        }
        if (request.getEpodSignedBy() != null && !request.getEpodSignedBy().isBlank()) {
            entity.setEpodSignedBy(request.getEpodSignedBy().trim());
        }
        if (request.getEpodSignatureHash() != null && !request.getEpodSignatureHash().isBlank()) {
            entity.setEpodSignatureHash(request.getEpodSignatureHash().trim());
        } else if ("HANDED_OVER_EPOD".equals(nextStatus) && entity.getEpodSignatureHash() == null) {
            entity.setEpodSignatureHash("SHA256:" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        }

        entity.setUpdatedAt(Instant.now());
        if ("HANDED_OVER_EPOD".equals(nextStatus) || "SYNCED_3PL".equals(nextStatus)) {
            applyWebhookPayload(entity);
        }

        return toResponse(handoverRepository.save(entity));
    }

    @Transactional
    public ThirdPartyHandoverResponse syncWebhook(String containerCode) {
        ThirdPartyHandover entity = handoverRepository.findByContainerCode(containerCode)
                .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND));

        applyWebhookPayload(entity);
        entity.setHandoverStatus("SYNCED_3PL");
        entity.setUpdatedAt(Instant.now());
        return toResponse(handoverRepository.save(entity));
    }

    private void applyWebhookPayload(ThirdPartyHandover entity) {
        Instant now = Instant.now();
        String payload = String.format(
                "{\"event\":\"CONTAINER_HANDOVER_UPDATE\",\"containerCode\":\"%s\",\"externalRef\":\"%s\",\"system\":\"%s\",\"dockGate\":\"%s\",\"status\":\"%s\",\"syncedAt\":\"%s\"}",
                entity.getContainerCode(),
                entity.getExternalTrackingRef(),
                entity.getExternalSystemName(),
                entity.getDockGate() != null ? entity.getDockGate() : "GATE_DEFAULT",
                entity.getHandoverStatus(),
                now
        );
        entity.setLastSyncStatus("SYNCED_3PL");
        entity.setLastSyncPayload(payload);
        entity.setLastSyncedAt(now);
    }

    private ThirdPartyHandoverResponse toResponse(ThirdPartyHandover e) {
        return handoverMapper.toResponse(e);
    }

    private LocalDistributionHubResponse toHubResponse(LocalDistributionHub h) {
        return handoverMapper.toHubResponse(h);
    }

    private HubLocalShipperResponse toShipperResponse(HubLocalShipper s) {
        return handoverMapper.toShipperResponse(s);
    }

    private ContainerCargoManifestItemResponse toManifestItemResponse(ContainerCargoManifestItem m) {
        return handoverMapper.toManifestItemResponse(m);
    }
}
