package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.*;
import com.ccadro.asset.dto.response.ContainerControlResponse;
import com.ccadro.asset.dto.response.ContainerControlResponse.*;
import com.ccadro.asset.entity.*;
import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.DriverStatus;
import com.ccadro.asset.entity.enums.InspectionStatus;
import com.ccadro.asset.entity.enums.VehicleStatus;
import com.ccadro.asset.repository.*;
import lombok.RequiredArgsConstructor;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContainerControlService {
    private final ContainerRepository containers;
    private final ContainerControlRoundRepository rounds;
    private final ContainerControlStageRepository confirmations;
    private final ContainerCargoManifestItemRepository cargo;
    private final DriverRepository drivers;
    private final VehicleRepository vehicles;
    private final PreTripInspectionRepository inspections;
    private final ContainerSafetyInspectionService containerSafetyInspections;
    private final DriverDispatchEligibility driverEligibility;
    private final ContainerControlEvidence evidence;
    private static final List<String> ROLES = List.of("ADMIN", "DISPATCHER", "SAFETY_MANAGER");
    private static final List<String> STAGES = List.of("PREPARATION", "DEPARTURE", "IN_TRANSIT", "HANDOVER");
    private static final List<String> LABELS = List.of("Chuẩn bị", "Xuất bến", "Trong hành trình", "Bàn giao");
    private static final List<List<Check>> CHECKS = List.of(
        List.of(new Check("identity_condition", "Đối chiếu mã và tình trạng container"), new Check("manifest_destination", "Đối chiếu hàng hóa, đơn vị và điểm giao"), new Check("load_securing", "Kiểm tra tải trọng, đóng hàng và chằng buộc")),
        List.of(new Check("vehicle_driver", "Xác nhận xe, tài xế và kiểm tra trước chuyến"), new Check("seal_verified", "Đối chiếu số và tình trạng niêm phong"), new Check("route_handover", "Bàn giao chứng từ và lộ trình")),
        List.of(new Check("position_reviewed", "Đối chiếu vị trí và tiến độ với tài xế"), new Check("condition_reviewed", "Kiểm tra tình trạng hàng, điều kiện bảo quản"), new Check("incidents_reviewed", "Rà soát sự cố và ghi nhận hướng xử lý")),
        List.of(new Check("arrival_receiver", "Đối chiếu điểm đến và đơn vị tiếp nhận"), new Check("seal_handover", "Kiểm tra niêm phong khi bàn giao"), new Check("quantity_pod", "Đối soát số kiện và bằng chứng ePOD")));
    private String role(String scope) {
        return ROLES.stream().filter(r -> scope != null && Arrays.asList(scope.split("\\s+")).contains("ROLE_" + r)).findFirst()
            .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Không có quyền kiểm soát container"));
    }
    private void require(boolean value, String message) {
        if (!value) throw new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT, message);
    }
    private Container find(String code, boolean lock) {
        Container c = (lock ? containers.findForControlUpdate(code) : containers.findByContainerCode(code))
            .orElseThrow(() -> new AppException(ErrorCode.CONTAINER_NOT_FOUND, "Không tìm thấy container"));
        require(!Boolean.TRUE.equals(c.getIsDeleted()), "Container đã xóa");
        return c;
    }
    public ContainerControlResponse get(String code, String scope) {
        role(scope); find(code, false); return response(code);
    }
    @Transactional
    public ContainerControlResponse start(String code, ContainerControlRoundRequest request, String actor, String scope) {
        String role = role(scope); require(actor != null && !actor.isBlank(), "Thiếu người thực hiện");
        Container c = find(code, true);
        var previous = rounds.findFirstByContainerCodeOrderByRoundNumberDesc(code).orElse(null);
        int current = previous == null ? 0 : previous.getRoundNumber();
        require(request.getExpectedRoundNumber() == current, "Đợt kiểm soát đã thay đổi; hãy tải lại");
        require(previous == null || previous.getCompletedAt() != null, "Đợt hiện tại chưa hoàn tất");
        require(c.getStatus() == ContainerStatus.AVAILABLE || c.getStatus() == ContainerStatus.ASSIGNED,
            "Chỉ mở đợt khi container Sẵn sàng hoặc Đã phân công; không xác nhận hồi tố hành trình cũ");
        rounds.save(ContainerControlRound.builder().containerCode(code).roundNumber(current + 1).startedAt(Instant.now())
            .startedBy(actor).startedRole(role).initialStatus(c.getStatus().name()).build());
        return response(code);
    }
    @Transactional
    public ContainerControlResponse complete(String code, String stage, ContainerControlStageRequest request, String actor, String scope) {
        String role = role(scope); require(actor != null && !actor.isBlank(), "Thiếu người thực hiện");
        Container c = find(code, true);
        var round = rounds.findFirstByContainerCodeOrderByRoundNumberDesc(code).orElseThrow(() -> new AppException(ErrorCode.CONTAINER_CONTROL_CONFLICT, "Chưa mở đợt kiểm soát"));
        require(round.getRoundNumber() == request.getRoundNumber() && round.getCompletedAt() == null, "Đợt đã thay đổi hoặc hoàn tất");
        int index = STAGES.indexOf(stage); require(index >= 0, "Giai đoạn không hợp lệ");
        var saved = confirmations.findByRoundIdOrderByCompletedAtAsc(round.getId());
        require(saved.size() == index, "Phải xác nhận tuần tự; không được ghi đè xác nhận cũ");
        var expected = new HashSet<>(CHECKS.get(index).stream().map(Check::key).toList());
        require(expected.equals(new HashSet<>(request.getCheckedKeys())) && request.getCheckedKeys().size() == expected.size(), "Cần kiểm tra đủ các mục trong giai đoạn");
        require(request.getNotes() != null && !request.getNotes().isBlank(), "Cần ghi chú kết quả đối chiếu thực tế");
        if (index <= 1) {
            require(c.getStatus() == ContainerStatus.ASSIGNED && c.getAssignedVehicleId() != null
                && c.getAssignedDriverId() != null && c.getAssignedShipmentId() != null
                && c.getAssignedShipmentCode() != null && c.getOriginName() != null && c.getDestinationName() != null,
                "Cần phân công vận đơn, xe, tài xế và hành trình");
            var items = cargo.findByContainerCodeOrderByItemCodeAsc(code).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getIsDeleted()) && Objects.equals(item.getShipmentCode(), c.getAssignedShipmentCode()))
                .toList();
            require(!items.isEmpty(), "Cần khai báo manifest của vận đơn hiện tại");
            double weight = items.stream().mapToDouble(item -> item.getWeightKg() == null ? 0 : item.getWeightKg()).sum();
            require(c.getMaxPayloadTons() != null && weight <= c.getMaxPayloadTons().doubleValue() * 1000,
                "Khối lượng vượt tải trọng hoặc thiếu tải trọng");
            require(items.stream().noneMatch(item -> Boolean.TRUE.equals(item.getRequiresColdChain())
                && (!Boolean.TRUE.equals(c.getIsReefer()) || item.getRequiredTempC() == null)),
                "Cần container lạnh và nhiệt độ yêu cầu cho hàng chuỗi lạnh");
        }
        if (index == 1) {
            require(containerSafetyInspections.latestPassedFor(c, round) != null,
                "Cần hoàn tất hồ sơ kiểm tra container độc lập, đúng loại và có kết quả đạt trong 24 giờ");
            var driver = drivers.findById(c.getAssignedDriverId())
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_NOT_FOUND));
            require(!Boolean.TRUE.equals(driver.getIsDeleted()) && driver.getStatus() == DriverStatus.ASSIGNED,
                "Tài xế không còn được giữ chỗ cho chuyến này");
            var qualification = driverEligibility.get(driver.getId());
            require(qualification.qualificationIssue() == null, qualification.qualificationIssue());

            var vehicle = vehicles.findById(c.getAssignedVehicleId())
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
            require(!Boolean.TRUE.equals(vehicle.getIsDeleted()) && vehicle.getStatus() == VehicleStatus.ASSIGNED,
                "Xe không còn được giữ chỗ cho chuyến này");
            var inspection = inspections.findFirstByVehicleIdAndDriverIdAndShipmentIdOrderByInspectionTimeDescCreatedAtDesc(
                    vehicle.getId(), driver.getId(), c.getAssignedShipmentId()).orElse(null);
            require(inspection != null && inspection.getStatus() == InspectionStatus.PASSED
                && c.getAssignedDriverId().equals(inspection.getDriverId())
                && !inspection.getInspectionTime().isBefore(Instant.now().minus(java.time.Duration.ofHours(24))),
                "Cần biên bản Pre-trip đạt trong 24 giờ, gắn đúng xe và tài xế");

        }
        if (index == 2) require(c.getStatus() == ContainerStatus.IN_TRANSIT, "Container chưa trong hành trình");
        if (index == 3) {
            require(c.getStatus() == ContainerStatus.DELIVERED && c.getCompletedAt() != null && c.getEpodRecipient() != null
                && c.getEpodSignature() != null && !c.getEpodSignature().isBlank(), "Cần bằng chứng bàn giao ePOD trước khi hoàn tất");
            round.setCompletedAt(Instant.now());
            round.setShipmentCode(c.getAssignedShipmentCode());
            round.setEpodRecipient(c.getEpodRecipient());
            round.setEpodSignature(c.getEpodSignature());
            round.setEpodAt(c.getCompletedAt());
            round.setEpodNotes(c.getEpodNotes());
            rounds.save(round);
        }
        confirmations.save(ContainerControlStage.builder().roundId(round.getId()).stage(stage).checkedKeys(String.join(",", request.getCheckedKeys()))
            .completedAt(Instant.now()).completedBy(actor).completedRole(role).notes(request.getNotes().trim())
            .evidenceJson(evidence.capture(c, stage, round.getId())).build());
        return response(code);
    }
    public boolean hasActiveRound(String code) {
        return rounds.findFirstByContainerCodeOrderByRoundNumberDesc(code).filter(r -> r.getCompletedAt() == null).isPresent();
    }
    public boolean hasRound(String code) { return rounds.findFirstByContainerCodeOrderByRoundNumberDesc(code).isPresent(); }
    public boolean isConfirmed(String code, String stage) {
        return rounds.findFirstByContainerCodeOrderByRoundNumberDesc(code).map(r -> confirmations.existsByRoundIdAndStage(r.getId(), stage)).orElse(false);
    }
    private ContainerControlResponse response(String code) {
        var all = rounds.findByContainerCodeOrderByRoundNumberDesc(code);
        if (all.isEmpty()) return new ContainerControlResponse(code, 0, null, null, null, null, null, null, null, null, stages(null), List.of());
        return map(all.get(0), all.stream().skip(1).map(r -> map(r, List.of())).toList());
    }
    private ContainerControlResponse map(ContainerControlRound r, List<ContainerControlResponse> history) {
        return new ContainerControlResponse(r.getContainerCode(), r.getRoundNumber(), r.getStartedAt(), r.getStartedBy(), r.getStartedRole(), r.getInitialStatus(), r.getCompletedAt(), r.getShipmentCode(), r.getEpodRecipient(), r.getEpodAt(), stages(r.getId()), history);
    }
    private List<Stage> stages(UUID round) {
        var saved = round == null ? List.<ContainerControlStage>of() : confirmations.findByRoundIdOrderByCompletedAtAsc(round);
        List<Stage> result = new ArrayList<>();
        for (int i = 0; i < STAGES.size(); i++) {
            String key = STAGES.get(i); var s = saved.stream().filter(v -> v.getStage().equals(key)).findFirst().orElse(null);
            result.add(new Stage(key, LABELS.get(i), CHECKS.get(i), ROLES, s == null ? List.of() : Arrays.asList(s.getCheckedKeys().split(",")),
                s == null ? null : s.getCompletedAt(), s == null ? null : s.getCompletedBy(), s == null ? null : s.getCompletedRole(), s == null ? null : s.getNotes(),
                s == null ? List.of() : evidence.read(s.getEvidenceJson())));
        }
        return result;
    }
}
