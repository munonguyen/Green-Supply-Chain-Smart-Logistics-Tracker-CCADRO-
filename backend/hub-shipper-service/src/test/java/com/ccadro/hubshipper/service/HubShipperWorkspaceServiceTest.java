package com.ccadro.hubshipper.service;

import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.dto.request.AssignTaskRangeRequest;
import com.ccadro.hubshipper.dto.request.SubmitPhotoPodRequest;
import com.ccadro.hubshipper.dto.response.HubShipperWorkspaceResponse;
import com.ccadro.hubshipper.entity.*;
import com.ccadro.hubshipper.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HubShipperWorkspaceServiceTest {

    @Mock
    LocalDistributionHubRepository hubRepository;

    @Mock
    HubShipperPolicyRepository policyRepository;

    @Mock
    HubLocalShipperRepository shipperRepository;

    @Mock
    ContainerCargoManifestItemRepository manifestItemRepository;

    @Mock
    HubTaskRangeAssignmentRepository rangeAssignmentRepository;

    @org.mockito.Spy
    com.ccadro.hubshipper.mapper.HubWorkspaceMapper mapper = org.mapstruct.factory.Mappers.getMapper(com.ccadro.hubshipper.mapper.HubWorkspaceMapper.class);

    @InjectMocks
    HubShipperWorkspaceService service;

    @Test
    void getIsolatedWorkspace_shouldBindAccountStrictlyToDinhBangHubAndReturnPolicy() {
        HubLocalShipper dinhBangShipper = HubLocalShipper.builder()
                .shipperCode("SHP-BN-001")
                .hubCode("HUB-DINHBANG-BN")
                .accountUsername("shipper")
                .fullName("Nguyễn Văn Bắc")
                .todayDeliveryScope("Phường Đình Bảng & Cụm KCN Tiên Sơn Cổng Bắc")
                .assignedCodeRangeFrom("PKG-DB-0001")
                .assignedCodeRangeTo("PKG-DB-0003")
                .build();

        LocalDistributionHub dinhBangHub = LocalDistributionHub.builder()
                .hubCode("HUB-DINHBANG-BN")
                .hubName("Trụ sở Giao nhận Đình Bảng • Từ Sơn, Bắc Ninh")
                .build();

        HubShipperPolicy policy = HubShipperPolicy.builder()
                .hubCode("HUB-DINHBANG-BN")
                .policyCode("POL-HUB-DINHBANG-2026")
                .requirePhotoPod(true)
                .hideB2bContractValue(true)
                .build();

        when(shipperRepository.findFirstByAccountUsernameIgnoreCase("shipper"))
                .thenReturn(Optional.of(dinhBangShipper));
        when(hubRepository.findByHubCode("HUB-DINHBANG-BN"))
                .thenReturn(Optional.of(dinhBangHub));
        when(policyRepository.findByHubCode("HUB-DINHBANG-BN"))
                .thenReturn(Optional.of(policy));
        when(shipperRepository.findByHubCodeOrderByShipperCodeAsc("HUB-DINHBANG-BN"))
                .thenReturn(List.of(dinhBangShipper));
        when(rangeAssignmentRepository.findByHubCodeOrderByAssignedAtDesc("HUB-DINHBANG-BN"))
                .thenReturn(List.of());
        when(manifestItemRepository.findByHubCodeOrderByItemCodeAsc("HUB-DINHBANG-BN"))
                .thenReturn(List.of());

        HubAuthContext shipperCtx = HubAuthContext.builder()
                .username("shipper")
                .scope("ROLE_HUB_SHIPPER HUB_WORKSPACE_READ POD_PHOTO_SUBMIT")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .build();

        HubShipperWorkspaceResponse ws = service.getIsolatedWorkspace("shipper", null, null, shipperCtx);

        assertEquals("HUB-DINHBANG-BN", ws.getIsolatedHubCode());
        assertTrue(ws.isStrictHubIsolationEnforced());
        assertEquals("Nguyễn Văn Bắc", ws.getActiveShipper().getFullName());
        assertEquals("POL-HUB-DINHBANG-2026", ws.getPolicy().getPolicyCode());

        assertThrows(SecurityException.class, () ->
                service.getIsolatedWorkspace("shipper", null, null, null));
    }

    @Test
    void assignTaskByCodeRange_shouldAssignItemsFromStartToEndCodeAndRejectCrossHub() {
        HubLocalShipper shipper = HubLocalShipper.builder()
                .shipperCode("SHP-BN-001")
                .hubCode("HUB-DINHBANG-BN")
                .fullName("Nguyễn Văn Bắc")
                .assignedZoneName("Tuyến 01: P. Đình Bảng - Từ Sơn")
                .assignedLat(21.1168)
                .assignedLng(105.9612)
                .build();

        ContainerCargoManifestItem p1 = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0001")
                .hubCode("HUB-DINHBANG-BN")
                .deliveryLat(21.1172)
                .deliveryLng(105.9618)
                .weightKg(180.0)
                .dispatchStatus("SYNCED_TO_HUB")
                .build();
        ContainerCargoManifestItem p2 = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0002")
                .hubCode("HUB-DINHBANG-BN")
                .deliveryLat(21.1159)
                .deliveryLng(105.9601)
                .weightKg(160.0)
                .dispatchStatus("SYNCED_TO_HUB")
                .build();
        ContainerCargoManifestItem p4 = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0004")
                .hubCode("HUB-DINHBANG-BN")
                .deliveryLat(21.0991)
                .deliveryLng(105.9718)
                .weightKg(280.0)
                .dispatchStatus("SYNCED_TO_HUB")
                .build();

        when(shipperRepository.findByShipperCode("SHP-BN-001")).thenReturn(Optional.of(shipper));
        when(manifestItemRepository.findByHubCodeOrderByItemCodeAsc("HUB-DINHBANG-BN"))
                .thenReturn(List.of(p1, p2, p4));
        when(manifestItemRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(shipperRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(rangeAssignmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        HubAuthContext adminCtx = HubAuthContext.builder()
                .username("admin")
                .scope("ROLE_ADMIN HUB_TASK_ASSIGN")
                .build();

        HubTaskRangeAssignment batch = service.assignTaskByCodeRange(
                AssignTaskRangeRequest.builder()
                        .hubCode("HUB-DINHBANG-BN")
                        .shipperCode("SHP-BN-001")
                        .fromItemCode("PKG-DB-0001")
                        .toItemCode("PKG-DB-0002")
                        .assignedBy("TRƯỞNG BƯU CỤC ĐÌNH BẢNG")
                        .build(),
                adminCtx
        );

        assertEquals(2, batch.getTotalItems());
        assertEquals(340.0, batch.getTotalWeightKg());
        assertEquals("SHP-BN-001", p1.getAssignedShipperCode());
        assertEquals("SHP-BN-001", p2.getAssignedShipperCode());
        assertNull(p4.getAssignedShipperCode());

        // Cross-hub attempt must be blocked by Hub Isolation Policy
        assertThrows(IllegalArgumentException.class, () -> service.assignTaskByCodeRange(
                AssignTaskRangeRequest.builder()
                        .hubCode("HUB-AMATA-BH")
                        .shipperCode("SHP-BN-001")
                        .fromItemCode("PKG-DB-0001")
                        .toItemCode("PKG-DB-0002")
                        .build(),
                adminCtx
        ));
    }

    @Test
    void submitItemTrackingAndPhotoPod_shouldEnforcePhotoPodPolicyAndPersistImageProof() {
        ContainerCargoManifestItem item = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0002")
                .hubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .consigneeName("Nhà máy Cơ khí Tiên Sơn")
                .dispatchStatus("OUT_FOR_DELIVERY")
                .build();

        HubShipperPolicy policy = HubShipperPolicy.builder()
                .hubCode("HUB-DINHBANG-BN")
                .requirePhotoPod(true)
                .build();

        HubAuthContext shipperCtx = HubAuthContext.builder()
                .username("shipper")
                .scope("ROLE_HUB_SHIPPER POD_PHOTO_SUBMIT")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .build();

        when(manifestItemRepository.findByItemCode("PKG-DB-0002")).thenReturn(Optional.of(item));
        when(policyRepository.findByHubCode("HUB-DINHBANG-BN")).thenReturn(Optional.of(policy));
        when(manifestItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Unauthenticated call must fail closed
        assertThrows(SecurityException.class, () -> service.submitItemTrackingAndPhotoPod(
                "PKG-DB-0002",
                SubmitPhotoPodRequest.builder()
                        .dispatchStatus("DELIVERED_POD")
                        .proofImageUrl("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800")
                        .build(),
                null
        ));

        // Missing photo should fail policy check
        assertThrows(IllegalArgumentException.class, () -> service.submitItemTrackingAndPhotoPod(
                "PKG-DB-0002",
                SubmitPhotoPodRequest.builder()
                        .dispatchStatus("DELIVERED_POD")
                        .build(),
                shipperCtx
        ));

        // With valid proof image URL should succeed
        ContainerCargoManifestItem saved = service.submitItemTrackingAndPhotoPod(
                "PKG-DB-0002",
                SubmitPhotoPodRequest.builder()
                        .dispatchStatus("DELIVERED_POD")
                        .proofImageUrl("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800")
                        .proofImageCaption("Ảnh bàn giao 12 kiện cảm biến tại Cổng Bắc KCN Tiên Sơn")
                        .recipientPodName("Nguyễn Hữu Thắng (Kỹ sư Kho Tiên Sơn)")
                        .build(),
                shipperCtx
        );

        assertEquals("DELIVERED_POD", saved.getDispatchStatus());
        assertNotNull(saved.getProofImageUrl());
        assertNotNull(saved.getDeliveredAt());
    }

    @Test
    void rbacAndHubIsolation_shouldBlockUnauthorizedRolesAndCrossHubAccess() {
        HubAuthContext dinhBangShipperCtx = HubAuthContext.builder()
                .username("shipper")
                .scope("ROLE_HUB_SHIPPER HUB_WORKSPACE_READ POD_PHOTO_SUBMIT")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .build();

        HubAuthContext auditorCtx = HubAuthContext.builder()
                .username("hub_inspector_bn")
                .scope("ROLE_HUB_AUDITOR HUB_WORKSPACE_READ POD_PHOTO_VIEW HUB_AUDIT_READ")
                .assignedHubCode("HUB-DINHBANG-BN")
                .build();

        // 1. Cross-hub workspace access from HUB-DINHBANG-BN into HUB-AMATA-BH must throw SecurityException (403)
        assertThrows(SecurityException.class, () ->
                service.getIsolatedWorkspace("shipper", "HUB-AMATA-BH", null, dinhBangShipperCtx));

        // 2. HUB_SHIPPER cannot assign code ranges to shippers
        assertThrows(SecurityException.class, () ->
                service.assignTaskByCodeRange(
                        AssignTaskRangeRequest.builder()
                                .hubCode("HUB-DINHBANG-BN")
                                .shipperCode("SHP-BN-001")
                                .fromItemCode("PKG-DB-0001")
                                .toItemCode("PKG-DB-0003")
                                .build(),
                        dinhBangShipperCtx));

        // 3. HUB_AUDITOR is read-only and cannot submit Photo POD
        ContainerCargoManifestItem otherItem = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0004")
                .hubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-002")
                .dispatchStatus("OUT_FOR_DELIVERY")
                .build();
        when(manifestItemRepository.findByItemCode("PKG-DB-0004")).thenReturn(Optional.of(otherItem));

        assertThrows(SecurityException.class, () ->
                service.submitItemTrackingAndPhotoPod(
                        "PKG-DB-0004",
                        SubmitPhotoPodRequest.builder()
                                .dispatchStatus("DELIVERED_POD")
                                .proofImageUrl("https://example.com/pod.jpg")
                                .build(),
                        auditorCtx));

        // 4. Shipper SHP-BN-001 cannot mark parcel assigned to SHP-BN-002
        assertThrows(SecurityException.class, () ->
                service.submitItemTrackingAndPhotoPod(
                        "PKG-DB-0004",
                        SubmitPhotoPodRequest.builder()
                                .dispatchStatus("DELIVERED_POD")
                                .proofImageUrl("https://example.com/pod.jpg")
                                .build(),
                        dinhBangShipperCtx));
    }

    @Test
    void softDeleteRestoreAndElasticSearch_shouldFilterManifestItemsCleanly() {
        LocalDistributionHub dinhBangHub = LocalDistributionHub.builder()
                .hubCode("HUB-DINHBANG-BN")
                .hubName("Trụ sở Đình Bảng")
                .build();
        HubShipperPolicy dinhBangPolicy = HubShipperPolicy.builder()
                .hubCode("HUB-DINHBANG-BN")
                .policyCode("POL-HUB-DINHBANG-2026")
                .requirePhotoPod(true)
                .hideB2bContractValue(true)
                .build();
        HubLocalShipper shipper1 = HubLocalShipper.builder()
                .shipperCode("SHP-BN-001")
                .hubCode("HUB-DINHBANG-BN")
                .accountUsername("shipper")
                .build();
        HubLocalShipper shipper2 = HubLocalShipper.builder()
                .shipperCode("SHP-BN-002")
                .hubCode("HUB-DINHBANG-BN")
                .accountUsername("shipper_bn2")
                .build();
        HubAuthContext dinhBangMgrCtx = HubAuthContext.builder()
                .username("hub_mgr_dinhbang")
                .scope("ROLE_HUB_MANAGER HUB_WORKSPACE_READ")
                .assignedHubCode("HUB-DINHBANG-BN")
                .build();

        ContainerCargoManifestItem p1 = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0001")
                .hubCode("HUB-DINHBANG-BN")
                .cargoName("Sữa tươi Vinamilk 100%")
                .consigneeName("Siêu thị Từ Sơn")
                .deliveryZoneName("Từ Sơn - Bắc Ninh")
                .isDeleted(false)
                .build();
        ContainerCargoManifestItem p2 = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0002")
                .hubCode("HUB-DINHBANG-BN")
                .cargoName("Linh kiện điện tử Samsung")
                .consigneeName("Nhà máy Yên Phong")
                .deliveryZoneName("Yên Phong - Bắc Ninh")
                .isDeleted(false)
                .build();

        when(hubRepository.findByHubCode("HUB-DINHBANG-BN")).thenReturn(Optional.of(dinhBangHub));
        when(policyRepository.findByHubCode("HUB-DINHBANG-BN")).thenReturn(Optional.of(dinhBangPolicy));
        when(shipperRepository.findByHubCodeOrderByShipperCodeAsc("HUB-DINHBANG-BN"))
                .thenReturn(List.of(shipper1, shipper2));
        when(rangeAssignmentRepository.findByHubCodeOrderByAssignedAtDesc("HUB-DINHBANG-BN")).thenReturn(List.of());
        when(manifestItemRepository.findByHubCodeOrderByItemCodeAsc("HUB-DINHBANG-BN")).thenReturn(List.of(p1, p2));
        when(manifestItemRepository.findByItemCode("PKG-DB-0001")).thenReturn(Optional.of(p1));
        when(manifestItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // 1. Elastic search accent-insensitive ("sua tuoi vinamilk")
        HubShipperWorkspaceResponse searched = service.getIsolatedWorkspace(
                "hub_mgr_dinhbang", "HUB-DINHBANG-BN", null, "sua tuoi vinamilk", false, dinhBangMgrCtx);
        assertEquals(1, searched.getManifestItems().size());
        assertEquals("PKG-DB-0001", searched.getManifestItems().get(0).getItemCode());

        // 2. Soft delete hides p1 from default workspace, preserves it for includeDeleted=true
        ContainerCargoManifestItem softDeleted = service.softDeleteManifestItem("PKG-DB-0001", dinhBangMgrCtx);
        assertTrue(Boolean.TRUE.equals(softDeleted.getIsDeleted()));

        HubShipperWorkspaceResponse activeView = service.getIsolatedWorkspace(
                "hub_mgr_dinhbang", "HUB-DINHBANG-BN", null, null, false, dinhBangMgrCtx);
        assertEquals(1, activeView.getManifestItems().size());
        assertEquals("PKG-DB-0002", activeView.getManifestItems().get(0).getItemCode());

        HubShipperWorkspaceResponse trashView = service.getIsolatedWorkspace(
                "hub_mgr_dinhbang", "HUB-DINHBANG-BN", null, null, true, dinhBangMgrCtx);
        assertEquals(2, trashView.getManifestItems().size());

        // 3. Restore recovers p1
        ContainerCargoManifestItem restored = service.restoreManifestItem("PKG-DB-0001", dinhBangMgrCtx);
        assertFalse(Boolean.TRUE.equals(restored.getIsDeleted()));
    }
}

