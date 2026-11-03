# ⚠️ TASK-15: Quản Trị Sự Cố Hiện Trường, Phê Duyệt Ngoại Lệ & Kỷ Luật Điểm Trừ Tài Xế Công Bằng (UC16, UC17, UC18)

> **Phân hệ**: `incident-service (:8086)`  
> **Use Cases**: `UC16` (Báo cáo sự cố hiện trường), `UC17` (Thẩm định & xử lý ngoại lệ), `UC18` (Quản trị điểm trừ kỷ luật tài xế)  
> **Quy tắc bất biến**: `BRULE-02`, `BRULE-17`, `BRULE-18`  
> **Chuẩn thiết kế**: Clean Code BookShop (`@RequiredArgsConstructor`, `@FieldDefaults`, MapStruct Pure Interface + `GeometryMapper`)

---

## 1. 🏢 Lý Do Nghiệp Vụ & Bài Toán Doanh Nghiệp (Why This Task Exists)

Trong vận hành đội xe container đường dài thực tế:
1. **Rủi ro giấu giếm sự cố nếu phạt tự động (`BRULE-17`)**: Khi xe gặp tai nạn giao thông, sạt lở, ngập nước hoặc CSGT phân luồng buộc phải đi vòng ra ngoài hành lang, nếu hệ thống tự động trừ điểm kỷ luật tài xế ngay khi nhận báo cáo thì tài xế sẽ sợ bị phạt và không dám báo cáo sự cố hiện trường. Do đó, việc báo cáo sự cố (`UC16`) phải được ghi nhận ở trạng thái `PENDING_REVIEW` và **tuyệt đối không tự động phạt tài xế**.
2. **Thẩm định khách quan của Giám sát viên (`UC17`)**: Chỉ khi Giám sát viên vận hành (`Supervisor / Dispatcher`) kiểm tra bằng chứng hiện trường và ra quyết định tại `POST /api/v1/incidents/{incidentId}/resolve`:
   - `APPROVED_TRIGGER_REROUTE`: Sự cố khách quan làm tắc đường $\rightarrow$ Cho phép mở lộ trình vòng (`UC10`), miễn trừ phạt.
   - `APPROVED_EXCUSED`: Sự cố bất khả kháng có lý do chính đáng $\rightarrow$ Miễn trừ trách nhiệm.
   - `REJECTED`: Bác bỏ báo cáo không đủ căn cứ.
   - `ESCALATE_TO_DEMERIT`: Xác định lỗi chủ quan của tài xế (tự ý đi sai tuyến, vi phạm quy trình an toàn) $\rightarrow$ Lúc này mới phát sinh bản ghi điểm trừ `DemeritRecord`.
3. **Ngưỡng kỷ luật có con người phê duyệt (`BRULE-18 / UC18`)**: Hệ thống cộng dồn điểm phạt theo ngưỡng cấu hình trong `CcadroProperties`:
   - Đạt $\ge 10$ điểm (`warningThreshold`): Chuyển sang mức cảnh báo `WARNING`.
   - Đạt $\ge 20$ điểm (`reviewRequiredThreshold`): Chuyển sang trạng thái `REVIEW_REQUIRED` chờ Trưởng bộ phận An toàn / Nhân sự phê duyệt (`PUT /api/v1/incidents/demerits/{demeritId}/review`), tuyệt đối không tự động sa thải hay khóa cứng tài xế khi chưa qua thẩm định nhân sự.

---

## 2. 🔌 Đặc Tả Hợp Đồng REST API (`incident-service :8086`)

| Phương Thức | Endpoint (Qua API Gateway `:8888`) | Mục Đích Nghiệp Vụ | Quy Tắc |
| :---: | :--- | :--- | :---: |
| `POST` | `/api/v1/incidents` | Tài xế gửi báo cáo sự cố hiện trường kèm tọa độ `Point(4326)` | `UC16`, `BRULE-02`, `BRULE-17` |
| `GET` | `/api/v1/incidents/trips/{tripId}` | Tra cứu danh sách sự cố của một chuyến đi | `UC16` |
| `POST` | `/api/v1/incidents/{incidentId}/resolve` | Giám sát viên thẩm định và ra quyết định xử lý sự cố | `UC17`, `BRULE-17` |
| `GET` | `/api/v1/incidents/drivers/{driverId}/demerit-summary` | Tổng hợp điểm trừ lũy kế và trạng thái kỷ luật của tài xế | `UC18`, `BRULE-18` |
| `PUT` | `/api/v1/incidents/demerits/{demeritId}/review` | Quản lý An toàn / HR phê duyệt quyết định kỷ luật điểm trừ | `UC18`, `BRULE-18` |

---

## 3. 💻 Hướng Dẫn Triển Khai Chuẩn Clean Code BookShop

### Bước 1: Ánh xạ không gian với `FieldIncidentMapper` (Pure Interface)
File: `backend/incident-service/src/main/java/com/ccadro/incident/mapper/FieldIncidentMapper.java`

```java
@Mapper(componentModel = "spring", uses = {GeometryMapper.class})
public interface FieldIncidentMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "incidentLocation", expression = "java(geometryMapper.toPoint(request.getLongitude(), request.getLatitude()))")
    @Mapping(target = "status", constant = "PENDING_REVIEW")
    @Mapping(target = "reportedAt", ignore = true)
    FieldIncident toEntity(FieldIncidentRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "incidentId", source = "incidentId")
    @Mapping(target = "decision", source = "normalizedDecision")
    @Mapping(target = "resolvedAt", ignore = true)
    ExceptionResolution toResolutionEntity(ExceptionResolutionRequest request, UUID incidentId, String normalizedDecision);
}
```

### Bước 2: Triển khai `BRULE-17` & `BRULE-18` trong `FieldIncidentService`
File: `backend/incident-service/src/main/java/com/ccadro/incident/service/FieldIncidentService.java`

```java
@Transactional
public ExceptionResolution resolveIncident(UUID incidentId, ExceptionResolutionRequest request) {
    FieldIncident incident = fieldIncidentRepository.findById(incidentId)
            .orElseThrow(() -> new AppException(ErrorCode.INCIDENT_NOT_FOUND));

    String decision = request.getDecision().trim().toUpperCase();
    ExceptionResolution resolution = fieldIncidentMapper.toResolutionEntity(request, incidentId, decision);
    ExceptionResolution savedResolution = exceptionResolutionRepository.save(resolution);

    switch (decision) {
        case "APPROVED_TRIGGER_REROUTE" -> incident.setStatus("APPROVED_REROUTE");
        case "APPROVED_EXCUSED"         -> incident.setStatus("APPROVED_EXCUSED");
        case "REJECTED"                 -> incident.setStatus("REJECTED");
        case "ESCALATE_TO_DEMERIT"      -> {
            incident.setStatus("ESCALATED_DEMERIT");
            int points = (request.getDemeritPoints() != null && request.getDemeritPoints() > 0)
                    ? request.getDemeritPoints() : 5;
            String category = request.getViolationCategory() != null
                    ? request.getViolationCategory() : "UNAUTHORIZED_DEVIATION";
            issueDemeritForIncident(incident, points, category, request.getReviewedBy(), request.getReviewNotes());
        }
        default -> throw new AppException(ErrorCode.INVALID_RESOLUTION_DECISION);
    }
    return savedResolution;
}
```

---

## 4. 🧪 Kịch Bản Kiểm Thử (cURL)

```bash
# 1. Tài xế báo cáo sự cố hiện trường (Trạng thái khởi tạo: PENDING_REVIEW)
curl -X POST http://localhost:8888/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "incidentCode": "INC-2026-001",
    "tripId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "driverId": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
    "incidentType": "TRAFFIC_CONGESTION",
    "severity": "HIGH",
    "latitude": 10.8050,
    "longitude": 106.7420,
    "description": "Tai nạn giao thông phong tỏa làn xe tải nặng tại ngã tư MK"
  }'

# 2. Giám sát viên thẩm định sự cố khách quan & cho phép đổi tuyến
curl -X POST http://localhost:8888/api/v1/incidents/<INCIDENT_ID>/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "reviewedBy": "supervisor.hcm",
    "decision": "APPROVED_TRIGGER_REROUTE",
    "reviewNotes": "Sự cố khách quan đã xác minh, miễn trừ phạt tài xế và mở luồng đổi tuyến"
  }'

# 3. Tra cứu tổng hợp điểm trừ và ngưỡng kỷ luật của tài xế
curl -s http://localhost:8888/api/v1/incidents/drivers/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed/demerit-summary | jq
```

