package com.ccadro.asset.service;

import com.ccadro.asset.dto.response.ContainerControlResponse.Evidence;
import com.ccadro.asset.entity.Container;
import java.util.UUID;
import com.ccadro.asset.repository.ContainerCargoManifestItemRepository;
import com.ccadro.asset.repository.PreTripInspectionRepository;
import com.ccadro.asset.repository.ContainerSafetyInspectionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class ContainerControlEvidence {
    private final ContainerCargoManifestItemRepository cargo;
    private final PreTripInspectionRepository inspections;
    private final ContainerSafetyInspectionRepository containerInspections;
    private final ObjectMapper json;

    public String capture(Container container, String stage) {
        return capture(container, stage, null);
    }

    public String capture(Container container, String stage, UUID roundId) {
        var fields = new ArrayList<Evidence>();
        add(fields, "Phân công", "Container", container.getContainerCode());
        add(fields, "Phân công", "Trạng thái", container.getStatus());
        add(fields, "Phân công", "Vận đơn", container.getAssignedShipmentCode());
        add(fields, "Phân công", "ID vận đơn", container.getAssignedShipmentId());
        add(fields, "Phân công", "Tài xế", container.getDriverName());
        add(fields, "Phân công", "ID tài xế", container.getAssignedDriverId());
        add(fields, "Phân công", "Biển số", container.getVehicleLicensePlate());
        add(fields, "Phân công", "ID xe", container.getAssignedVehicleId());
        add(fields, "Hành trình", "Điểm đi", container.getOriginName());
        add(fields, "Hành trình", "Điểm đến", container.getDestinationName());
        var items = container.getAssignedShipmentCode() == null ? List.<com.ccadro.asset.entity.ContainerCargoManifestItem>of()
            : cargo.findByContainerCodeOrderByItemCodeAsc(container.getContainerCode()).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getIsDeleted())
                    && Objects.equals(item.getShipmentCode(), container.getAssignedShipmentCode())).toList();
        add(fields, "Hàng hóa", "Số dòng hàng", items.size());
        add(fields, "Hàng hóa", "Tải khai báo (kg)", items.stream().mapToDouble(item -> item.getWeightKg() == null ? 0 : item.getWeightKg()).sum());
        add(fields, "Hàng hóa", "Tải tối đa (tấn)", container.getMaxPayloadTons());
        for (var item : items) add(fields, "Hàng hóa", item.getItemCode(),
            item.getCargoName() + " · " + item.getParcelCount() + " kiện · " + item.getWeightKg() + " kg");
        add(fields, "Tình trạng", "Số niêm phong", container.getESealNumber());
        add(fields, "Tình trạng", "Trạng thái niêm phong", container.getESealStatus());
        add(fields, "Tình trạng", "Lần nhận niêm phong", container.getLastSealAt());
        if ("PREPARATION".equals(stage) || "DEPARTURE".equals(stage)) {
            add(fields, "Tình trạng", "Tham chiếu CSC", container.getCscApprovalReference());
            add(fields, "Tình trạng", "Ngày kiểm tra CSC kế tiếp", container.getCscNextExaminationDate());
            if ("DEPARTURE".equals(stage) && roundId != null) {
                var containerInspection = containerInspections.findFirstByContainerIdOrderByInspectionNumberDesc(container.getId()).orElse(null);
                add(fields, "An toàn container", "Loại container đã kiểm tra", containerInspection == null ? null : containerInspection.getContainerType());
                add(fields, "An toàn container", "Kết quả checklist", containerInspection == null ? null : containerInspection.getStatus());
                add(fields, "An toàn container", "Phiên bản checklist", containerInspection == null ? null : containerInspection.getTemplateVersion());
                add(fields, "An toàn container", "Số mục không đạt", containerInspection == null ? null : containerInspection.getFailedItemsCount());
                add(fields, "An toàn container", "Biên bản kiểm tra", containerInspection == null ? null : containerInspection.getId());
                add(fields, "An toàn container", "Thời điểm kiểm tra", containerInspection == null ? null : containerInspection.getInspectedAt());
            }
            if (container.getAssignedVehicleId() != null && container.getAssignedDriverId() != null && container.getAssignedShipmentId() != null) {
                var inspection = inspections.findFirstByVehicleIdAndDriverIdAndShipmentIdOrderByInspectionTimeDescCreatedAtDesc(
                    container.getAssignedVehicleId(), container.getAssignedDriverId(), container.getAssignedShipmentId()).orElse(null);
                add(fields, "Trước chuyến", "Kết quả Pre-trip", inspection == null ? null : inspection.getStatus());
                add(fields, "Trước chuyến", "Thời điểm Pre-trip", inspection == null ? null : inspection.getInspectionTime());
                add(fields, "Trước chuyến", "ID biên bản", inspection == null ? null : inspection.getId());
            }
        }
        if ("IN_TRANSIT".equals(stage) || "HANDOVER".equals(stage)) {
            add(fields, "Tín hiệu", "Vị trí khai báo", container.getLastLocationName());
            add(fields, "Tín hiệu", "Vĩ độ", container.getLastLatitude());
            add(fields, "Tín hiệu", "Kinh độ", container.getLastLongitude());
            add(fields, "Tín hiệu", "Lần nhận GPS", container.getLastPositionReceivedAt());
            add(fields, "Tín hiệu", "Lần nhận thiết bị", container.getLastTelemetryReceivedAt());
            add(fields, "Tín hiệu", "Nhiệt cấp (°C)", container.getSupplyAirTempC());
            add(fields, "Tín hiệu", "Lần nhận nhiệt cấp", container.getLastSupplyAirTempAt());
            add(fields, "Tín hiệu", "Nhiệt hồi (°C)", container.getReturnAirTempC());
            add(fields, "Tín hiệu", "Lần nhận nhiệt hồi", container.getLastReturnAirTempAt());
        }
        if ("HANDOVER".equals(stage)) {
            add(fields, "Bàn giao", "Người nhận ePOD", container.getEpodRecipient());
            add(fields, "Bàn giao", "Thời điểm ePOD", container.getCompletedAt());
            add(fields, "Bàn giao", "Ghi chú ePOD", container.getEpodNotes());
        }
        try { return json.writeValueAsString(fields); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException(error); }
    }

    public List<Evidence> read(String value) {
        if (value == null) return List.of();
        try { return json.readValue(value, new TypeReference<List<Evidence>>() {}); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException(error); }
    }

    private void add(List<Evidence> fields, String group, String label, Object value) {
        fields.add(new Evidence(group, label, value == null ? "Chưa ghi nhận" : value.toString()));
    }
}
