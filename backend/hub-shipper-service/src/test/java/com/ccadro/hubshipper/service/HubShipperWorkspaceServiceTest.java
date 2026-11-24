package com.ccadro.hubshipper.service;

import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.dto.request.*;
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

    @Test
    void shipperProfileUpdateAndKycVerificationEnforceStrictRbac() {
        HubLocalShipper shipper1 = HubLocalShipper.builder()
                .shipperCode("SHP-BN-001")
                .hubCode("HUB-DINHBANG-BN")
                .fullName("Nguyễn Văn Bắc")
                .phone("0978 312 689")
                .kycStatus("PENDING_REVIEW")
                .build();

        HubAuthContext shipperSelf = HubAuthContext.builder()
                .username("shipper")
                .scope("ROLE_HUB_SHIPPER HUB_WORKSPACE_READ")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .build();
        HubAuthContext managerCtx = HubAuthContext.builder()
                .username("hub_mgr_dinhbang")
                .scope("ROLE_HUB_MANAGER HUB_TASK_RANGE_ASSIGN")
                .assignedHubCode("HUB-DINHBANG-BN")
                .build();

        when(shipperRepository.findByShipperCode("SHP-BN-001")).thenReturn(Optional.of(shipper1));
        when(shipperRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // 1. Shipper can update own phone/vehicle plate/shift status/avatar
        var updated = service.updateShipperProfile("SHP-BN-001",
                UpdateShipperProfileRequest.builder()
                        .phone("0978 999 888")
                        .driverLicenseClass("C")
                        .vehicleRegistrationNo("99A-99999")
                        .avatarUrl("data:image/svg+xml;utf8,<svg/>")
                        .shiftStatus("ON_DELIVERY")
                        .build(),
                shipperSelf);
        assertEquals("0978 999 888", updated.getPhone());
        assertEquals("C", updated.getDriverLicenseClass());
        assertEquals("99A-99999", updated.getVehicleRegistrationNo());
        assertEquals("data:image/svg+xml;utf8,<svg/>", updated.getAvatarUrl());
        assertEquals("ON_DELIVERY", updated.getShiftStatus());

        // 2. Shipper CANNOT approve their own KYC
        assertThrows(SecurityException.class, () ->
                service.verifyShipperKyc("SHP-BN-001",
                        VerifyShipperKycRequest.builder().kycStatus("VERIFIED").build(),
                        shipperSelf));

        // 3. Hub Manager can verify KYC for shipper in same hub
        var verified = service.verifyShipperKyc("SHP-BN-001",
                VerifyShipperKycRequest.builder().kycStatus("VERIFIED").kycNote("Đã đối chiếu CCCD & GPLX").build(),
                managerCtx);
        assertEquals("VERIFIED", verified.getKycStatus());
        assertEquals("hub_mgr_dinhbang", verified.getKycVerifiedBy());
        assertNotNull(verified.getKycVerifiedAt());
    }

    @Test
    void realtimeFieldOperationsAndShiftSettlementPersistCompleteState() {
        HubLocalShipper shipper = HubLocalShipper.builder()
                .shipperCode("SHP-BN-001")
                .hubCode("HUB-DINHBANG-BN")
                .fullName("Nguyễn Văn Bắc")
                .shiftStatus("AVAILABLE")
                .currentLat(21.1145)
                .currentLng(105.9585)
                .completedOrdersMonth(148)
                .build();

        ContainerCargoManifestItem pkg2 = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0002")
                .hubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .consigneeName("Nhà máy KCN Tiên Sơn")
                .deliveryLat(21.1128)
                .deliveryLng(105.9688)
                .weightKg(100.0)
                .requiresColdChain(true)
                .requiredTempC(4.0)
                .dispatchStatus("ASSIGNED_TO_SHIPPER")
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

        when(shipperRepository.findByShipperCode("SHP-BN-001")).thenReturn(Optional.of(shipper));
        when(shipperRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(manifestItemRepository.findByItemCode("PKG-DB-0002")).thenReturn(Optional.of(pkg2));
        when(manifestItemRepository.findByHubCodeOrderByItemCodeAsc("HUB-DINHBANG-BN")).thenReturn(List.of(pkg2));
        when(manifestItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(manifestItemRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(policyRepository.findByHubCode("HUB-DINHBANG-BN")).thenReturn(Optional.of(policy));

        // 1. Batch pickup transitions ASSIGNED_TO_SHIPPER -> OUT_FOR_DELIVERY and sets shipper ON_DELIVERY
        var picked = service.batchPickupItems(
                BatchPickupScanRequest.builder().itemCodes(List.of("PKG-DB-0002")).build(),
                shipperCtx);
        assertEquals(1, picked.size());
        assertEquals("OUT_FOR_DELIVERY", pkg2.getDispatchStatus());
        assertEquals("ON_DELIVERY", shipper.getShiftStatus());
        assertTrue(pkg2.getTrackingHistoryJson().contains("SPX Batch Pickup"));

        // 2. Guard: cannot switch to OFF_SHIFT while pkg2 is OUT_FOR_DELIVERY
        assertThrows(IllegalArgumentException.class, () ->
                service.updateShipperTelemetryAndShift("SHP-BN-001",
                        ShipperTelemetryUpdateRequest.builder().shiftStatus("OFF_SHIFT").build(),
                        shipperCtx));

        // 3. Check-in GPS arrival sets arrivedAtStop=true and moves shipper live GPS
        service.executeItemFieldAction("PKG-DB-0002",
                ItemFieldActionRequest.builder().action("CHECKIN_ARRIVAL").build(),
                shipperCtx);
        assertTrue(Boolean.TRUE.equals(pkg2.getArrivedAtStop()));
        assertEquals(21.1128, shipper.getCurrentLat());

        // 4. NDR report transitions OUT_FOR_DELIVERY -> NDR_RESCHEDULED and increments ndrCount; Retry restores OUT_FOR_DELIVERY
        service.executeItemFieldAction("PKG-DB-0002",
                ItemFieldActionRequest.builder().action("REPORT_NDR").reason("Kho nghỉ giao ca").build(),
                shipperCtx);
        assertEquals("NDR_RESCHEDULED", pkg2.getDispatchStatus());
        assertEquals(1, pkg2.getNdrCount());
        assertEquals("AVAILABLE", shipper.getShiftStatus());

        service.executeItemFieldAction("PKG-DB-0002",
                ItemFieldActionRequest.builder().action("RETRY_NDR").build(),
                shipperCtx);
        assertEquals("OUT_FOR_DELIVERY", pkg2.getDispatchStatus());
        assertEquals("ON_DELIVERY", shipper.getShiftStatus());

        // 5. Submit Photo POD with handoverMethod & measuredTempC -> DELIVERED_POD & unlocks shift
        service.submitItemTrackingAndPhotoPod("PKG-DB-0002",
                SubmitPhotoPodRequest.builder()
                        .dispatchStatus("DELIVERED_POD")
                        .proofImageUrl("data:image/svg+xml;utf8,<svg/>")
                        .recipientPodName("Thủ kho Tiên Sơn")
                        .handoverMethod("COLD_DOCK_GATE")
                        .measuredTempC(4.1)
                        .build(),
                shipperCtx);
        assertEquals("DELIVERED_POD", pkg2.getDispatchStatus());
        assertEquals("COLD_DOCK_GATE", pkg2.getHandoverMethod());
        assertEquals(4.1, pkg2.getMeasuredTempC());
        assertEquals("AVAILABLE", shipper.getShiftStatus());
        assertEquals(149, shipper.getCompletedOrdersMonth());

        // 6. Settle shift POD calculates base(38k) + weight(12k) + cold(22k) + gem(120k) = 192,000 VND
        var settlement = service.settleShiftPod(
                SettleShiftPodRequest.builder().hubCode("HUB-DINHBANG-BN").shipperCode("SHP-BN-001").build(),
                shipperCtx);
        assertEquals(1, settlement.getDeliveredPodCount());
        assertEquals(192_000L, settlement.getTotalEarnedVnd());
        assertEquals("SETTLED", settlement.getSettlementStatus());
    }

    @Test
    void spxThreeCallRuleCodRemittanceHubReturnAndThreeGateEndShiftWorkAccurately() {
        HubLocalShipper shipper = HubLocalShipper.builder()
                .shipperCode("SHP-BN-001")
                .hubCode("HUB-DINHBANG-BN")
                .fullName("Nguyễn Văn Bắc")
                .shiftStatus("ON_DELIVERY")
                .codHoldingVnd(0L)
                .build();

        ContainerCargoManifestItem codItem = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0002")
                .hubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .consigneeName("Nhà máy Tiên Sơn")
                .consigneePhone("0222 3839 405")
                .codAmountVnd(1_680_000L)
                .codStatus("PENDING")
                .deliveryAttemptCount(1)
                .maxDeliveryAttempts(3)
                .callAttemptsCount(1)
                .recipientOtpCode("6824")
                .dispatchStatus("OUT_FOR_DELIVERY")
                .build();

        ContainerCargoManifestItem rtsItem = ContainerCargoManifestItem.builder()
                .itemCode("PKG-DB-0003")
                .hubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .consigneeName("Nhà thuốc Phố Mới")
                .consigneePhone("0222 3833 555")
                .codAmountVnd(0L)
                .deliveryAttemptCount(3)
                .maxDeliveryAttempts(3)
                .callAttemptsCount(2)
                .dispatchStatus("OUT_FOR_DELIVERY")
                .build();

        HubShipperPolicy policy = HubShipperPolicy.builder().hubCode("HUB-DINHBANG-BN").requirePhotoPod(true).build();
        HubAuthContext shipperCtx = HubAuthContext.builder()
                .username("shipper")
                .scope("ROLE_HUB_SHIPPER POD_PHOTO_SUBMIT")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .build();

        when(shipperRepository.findByShipperCode("SHP-BN-001")).thenReturn(Optional.of(shipper));
        when(shipperRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(manifestItemRepository.findByItemCode("PKG-DB-0002")).thenReturn(Optional.of(codItem));
        when(manifestItemRepository.findByItemCode("PKG-DB-0003")).thenReturn(Optional.of(rtsItem));
        when(manifestItemRepository.findByHubCodeOrderByItemCodeAsc("HUB-DINHBANG-BN"))
                .thenReturn(List.of(codItem, rtsItem));
        when(manifestItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(manifestItemRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(policyRepository.findByHubCode("HUB-DINHBANG-BN")).thenReturn(Optional.of(policy));

        // 1. SPX 3-Call Rule: Unreachable reason rejected when callAttemptsCount < 3 (currently 2)
        assertThrows(IllegalArgumentException.class, () ->
                service.executeItemFieldAction("PKG-DB-0003",
                        ItemFieldActionRequest.builder()
                                .action("REPORT_ON_HOLD")
                                .reason("Không liên lạc được người nhận")
                                .build(),
                        shipperCtx));

        // Log 3rd call -> now 3/3 calls -> attempt 3/3 automatically escalates to RETURN_PENDING (Hoàn kho)!
        service.executeItemFieldAction("PKG-DB-0003",
                ItemFieldActionRequest.builder().action("LOG_CALL").build(),
                shipperCtx);
        assertEquals(3, rtsItem.getCallAttemptsCount());

        service.executeItemFieldAction("PKG-DB-0003",
                ItemFieldActionRequest.builder()
                        .action("REPORT_ON_HOLD")
                        .reason("Không liên lạc được người nhận")
                        .build(),
                shipperCtx);
        assertEquals("RETURN_PENDING", rtsItem.getDispatchStatus());
        assertEquals("RETURN_TO_HUB", rtsItem.getExceptionType());

        // 2. Deliver PKG-DB-0002 with wrong OTP fails; right OTP + Cash COD adds 1,680,000 to shipper.codHoldingVnd
        assertThrows(IllegalArgumentException.class, () ->
                service.submitItemTrackingAndPhotoPod("PKG-DB-0002",
                        SubmitPhotoPodRequest.builder()
                                .dispatchStatus("DELIVERED_POD")
                                .proofImageUrl("data:image/svg+xml;utf8,<svg/>")
                                .recipientOtpInput("0000")
                                .build(),
                        shipperCtx));

        service.submitItemTrackingAndPhotoPod("PKG-DB-0002",
                SubmitPhotoPodRequest.builder()
                        .dispatchStatus("DELIVERED_POD")
                        .proofImageUrl("data:image/svg+xml;utf8,<svg/>")
                        .recipientOtpInput("6824")
                        .codCollectionMethod("COLLECTED_CASH")
                        .build(),
                shipperCtx);
        assertEquals(1_680_000L, shipper.getCodHoldingVnd());

        // 3. End-Shift Gate 2 blocks checkout because PKG-DB-0003 (RETURN_PENDING) hasn't been scanned back to Hub
        assertThrows(IllegalArgumentException.class, () -> service.endShiftCheckout("SHP-BN-001", shipperCtx));

        // Scan PKG-DB-0003 back to Hub warehouse -> RETURNED_TO_HUB
        service.executeItemFieldAction("PKG-DB-0003",
                ItemFieldActionRequest.builder().action("SCAN_HUB_RETURN").build(),
                shipperCtx);
        assertEquals("RETURNED_TO_HUB", rtsItem.getDispatchStatus());

        // 4. End-Shift Gate 3 blocks checkout because 1,680,000 COD cash is still unremitted
        assertThrows(IllegalArgumentException.class, () -> service.endShiftCheckout("SHP-BN-001", shipperCtx));

        // Remit COD cash -> codHoldingVnd drops to 0 and item codStatus becomes REMITTED
        var receipt = service.remitCodCash(
                RemitCodCashRequest.builder()
                        .hubCode("HUB-DINHBANG-BN")
                        .shipperCode("SHP-BN-001")
                        .paymentChannel("HUB_CASHIER")
                        .build(),
                shipperCtx);
        assertEquals(1_680_000L, receipt.getRemittedAmountVnd());
        assertEquals(0L, shipper.getCodHoldingVnd());
        assertEquals("REMITTED", codItem.getCodStatus());

        // 5. All 3 SPX End-Shift Gates green -> End Shift succeeds!
        var ended = service.endShiftCheckout("SHP-BN-001", shipperCtx);
        assertEquals("OFF_SHIFT", ended.getShiftStatus());
        assertNotNull(ended.getShiftEndedAt());
    }
}

