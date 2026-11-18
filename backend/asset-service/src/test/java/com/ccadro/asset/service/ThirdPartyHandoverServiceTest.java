package com.ccadro.asset.service;

import com.ccadro.asset.dto.response.ContainerCargoManifestItemResponse;
import com.ccadro.asset.entity.ContainerCargoManifestItem;
import com.ccadro.asset.entity.HubLocalShipper;
import com.ccadro.asset.entity.ThirdPartyHandover;
import com.ccadro.asset.repository.ContainerCargoManifestItemRepository;
import com.ccadro.asset.repository.HubLocalShipperRepository;
import com.ccadro.asset.repository.LocalDistributionHubRepository;
import com.ccadro.asset.repository.ThirdPartyHandoverRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ThirdPartyHandoverServiceTest {

    @Mock
    ThirdPartyHandoverRepository handoverRepository;

    @Mock
    LocalDistributionHubRepository hubRepository;

    @Mock
    HubLocalShipperRepository hubShipperRepository;

    @Mock
    ContainerCargoManifestItemRepository manifestItemRepository;

    @org.mockito.Spy
    com.ccadro.asset.mapper.HandoverMapper mapper = org.mapstruct.factory.Mappers.getMapper(com.ccadro.asset.mapper.HandoverMapper.class);

    @InjectMocks
    ThirdPartyHandoverService service;

    @Test
    void ingestContainerManifestToHub_shouldTransitionItemsToSyncedToHub() {
        ContainerCargoManifestItem item = ContainerCargoManifestItem.builder()
                .id(UUID.randomUUID())
                .itemCode("WB-AMATA-8192-01")
                .containerCode("TCKU-781920-4")
                .hubCode("HUB-AMATA-BH")
                .dispatchStatus("IN_CONTAINER")
                .build();
        ThirdPartyHandover handover = ThirdPartyHandover.builder()
                .id(UUID.randomUUID())
                .containerCode("TCKU-781920-4")
                .hubCode("HUB-AMATA-BH")
                .handoverStatus("AWAITING_ARRIVAL")
                .build();

        when(manifestItemRepository.findByContainerCodeOrderByItemCodeAsc("TCKU-781920-4"))
                .thenReturn(List.of(item));
        when(manifestItemRepository.saveAll(anyList())).thenReturn(List.of(item));
        when(handoverRepository.findByContainerCode("TCKU-781920-4"))
                .thenReturn(Optional.of(handover));
        when(handoverRepository.save(any())).thenReturn(handover);

        List<ContainerCargoManifestItemResponse> result = service.ingestContainerManifestToHub("TCKU-781920-4");

        assertEquals(1, result.size());
        assertEquals("SYNCED_TO_HUB", result.get(0).getDispatchStatus());
        assertTrue(handover.getManifestIngested());
        assertEquals("AT_GATE_DOCKED", handover.getHandoverStatus());
    }

    @Test
    void autoDispatchManifestByProximity_shouldAssignEachCargoToNearestEligibleShipperInHub() {
        HubLocalShipper northColdShipper = HubLocalShipper.builder()
                .shipperCode("SHP-BH-101")
                .hubCode("HUB-AMATA-BH")
                .fullName("Đặng Quốc Bảo")
                .assignedZoneName("Phân khu Bắc KCN Amata")
                .assignedLat(10.9520)
                .assignedLng(106.8965)
                .coverageRadiusKm(2.2)
                .coldChainCapable(true)
                .maxCapacityKg(1500.0)
                .currentLoadKg(200.0)
                .activeItemCount(1)
                .shiftStatus("AVAILABLE")
                .build();

        HubLocalShipper southColdShipper = HubLocalShipper.builder()
                .shipperCode("SHP-BH-102")
                .hubCode("HUB-AMATA-BH")
                .fullName("Võ Minh Khang")
                .assignedZoneName("Phân khu Nam Amata - Tam Hiệp")
                .assignedLat(10.9385)
                .assignedLng(106.8845)
                .coverageRadiusKm(2.4)
                .coldChainCapable(true)
                .maxCapacityKg(1500.0)
                .currentLoadKg(180.0)
                .activeItemCount(1)
                .shiftStatus("AVAILABLE")
                .build();

        HubLocalShipper eastDryShipper = HubLocalShipper.builder()
                .shipperCode("SHP-BH-103")
                .hubCode("HUB-AMATA-BH")
                .fullName("Huỳnh Gia Huy")
                .assignedZoneName("Phân khu Đông Amata - Loteco")
                .assignedLat(10.9440)
                .assignedLng(106.9060)
                .coverageRadiusKm(2.5)
                .coldChainCapable(false)
                .maxCapacityKg(2000.0)
                .currentLoadKg(300.0)
                .activeItemCount(1)
                .shiftStatus("AVAILABLE")
                .build();

        ContainerCargoManifestItem northItem = ContainerCargoManifestItem.builder()
                .itemCode("WB-AMATA-8192-01")
                .containerCode("TCKU-781920-4")
                .hubCode("HUB-AMATA-BH")
                .deliveryLat(10.9532)
                .deliveryLng(106.8978)
                .weightKg(420.0)
                .requiresColdChain(true)
                .dispatchStatus("SYNCED_TO_HUB")
                .build();

        ContainerCargoManifestItem southItem = ContainerCargoManifestItem.builder()
                .itemCode("WB-AMATA-8192-02")
                .containerCode("TCKU-781920-4")
                .hubCode("HUB-AMATA-BH")
                .deliveryLat(10.9372)
                .deliveryLng(106.8832)
                .weightKg(340.0)
                .requiresColdChain(true)
                .dispatchStatus("SYNCED_TO_HUB")
                .build();

        ContainerCargoManifestItem eastItem = ContainerCargoManifestItem.builder()
                .itemCode("WB-AMATA-8192-03")
                .containerCode("TCKU-781920-4")
                .hubCode("HUB-AMATA-BH")
                .deliveryLat(10.9452)
                .deliveryLng(106.9072)
                .weightKg(360.0)
                .requiresColdChain(false)
                .dispatchStatus("SYNCED_TO_HUB")
                .build();

        when(manifestItemRepository.findByContainerCodeOrderByItemCodeAsc("TCKU-781920-4"))
                .thenReturn(List.of(northItem, southItem, eastItem));
        when(hubShipperRepository.findByHubCodeOrderByShipperCodeAsc("HUB-AMATA-BH"))
                .thenReturn(List.of(northColdShipper, southColdShipper, eastDryShipper));
        when(hubShipperRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(manifestItemRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(handoverRepository.findByContainerCode("TCKU-781920-4")).thenReturn(Optional.empty());

        List<ContainerCargoManifestItemResponse> dispatched = service
                .autoDispatchManifestByProximity("HUB-AMATA-BH", "TCKU-781920-4");

        assertEquals(3, dispatched.size());
        assertEquals("SHP-BH-101", dispatched.get(0).getAssignedShipperCode());
        assertTrue(dispatched.get(0).getProximityDistanceKm() < 0.3);

        assertEquals("SHP-BH-102", dispatched.get(1).getAssignedShipperCode());
        assertTrue(dispatched.get(1).getProximityDistanceKm() < 0.3);

        assertEquals("SHP-BH-103", dispatched.get(2).getAssignedShipperCode());
        assertTrue(dispatched.get(2).getProximityDistanceKm() < 0.3);
    }
}

