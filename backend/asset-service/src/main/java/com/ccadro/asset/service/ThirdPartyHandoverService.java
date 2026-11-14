package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ThirdPartyHandoverUpdateRequest;
import com.ccadro.asset.dto.response.ThirdPartyHandoverResponse;
import com.ccadro.asset.entity.ThirdPartyHandover;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.repository.ThirdPartyHandoverRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ThirdPartyHandoverService {

    ThirdPartyHandoverRepository handoverRepository;

    public List<ThirdPartyHandoverResponse> getAllHandovers() {
        return handoverRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
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
        return ThirdPartyHandoverResponse.builder()
                .id(e.getId())
                .containerCode(e.getContainerCode())
                .shipmentCode(e.getShipmentCode())
                .destinationHub(e.getDestinationHub())
                .shipperCompany(e.getShipperCompany())
                .externalSystemName(e.getExternalSystemName())
                .externalTrackingRef(e.getExternalTrackingRef())
                .webhookEndpoint(e.getWebhookEndpoint())
                .dockGate(e.getDockGate())
                .handoverStatus(e.getHandoverStatus())
                .epodSignedBy(e.getEpodSignedBy())
                .epodSignatureHash(e.getEpodSignatureHash())
                .lastSyncStatus(e.getLastSyncStatus())
                .lastSyncPayload(e.getLastSyncPayload())
                .lastSyncedAt(e.getLastSyncedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}

