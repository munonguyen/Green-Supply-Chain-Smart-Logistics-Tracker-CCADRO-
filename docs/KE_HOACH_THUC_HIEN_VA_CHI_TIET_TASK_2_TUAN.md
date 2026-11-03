# Kế Hoạch 2 Tuần & Đặc Tả Chi Tiết 16 Task Doanh Nghiệp (CCADRO Enterprise v4.0)
**Hệ Thống Giám Sát Chuỗi Cung Ứng Xanh & Điều Vận Logistics Thông Minh**  
*Chuẩn kiến trúc: Domain-Driven Microservices (`Database-per-Service`, Ports `8080`–`8086`) + Spring Cloud Gateway (`:8888`) + Chuẩn Clean Code BookShop*

---

## 📌 1. BẢNG TỔNG QUAN PHÂN BỔ 16 TASK & LÝ DO NGHIỆP VỤ DOANH NGHIỆP

| Tuần | Ngày | Mã Task | Tên Nhiệm Vụ | Microservice & Port | Use Case & Quy Tắc (`BRULE`) | Lý Do Nghiệp Vụ Thực Tế Doanh Nghiệp (Why) |
| :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| **0** | Hạ tầng | `TASK-00` | Cổng Biên API Gateway & Xác Thực Tập Trung JWT | `api-gateway :8888`<br>`identity-service :8080` | Edge Security, JWT Introspect | Bảo vệ toàn bộ hệ thống tại cổng biên duy nhất, kiểm tra token đã logout (`invalidated_tokens`) và giải quyết CORS tập trung. |
| **1** | Ngày 1 | `TASK-01` | Quản Trị Đội Xe, Tài Xế, Container & Bảo Dưỡng | `asset-service :8081` | `UC01`, `UC02`, `UC15`<br>`BRULE-01`, `BRULE-02` | Chống trùng lặp biển số/mã xe (`BRULE-02`); tự động khóa xe sang `MAINTENANCE` khi phát sinh bảo dưỡng khẩn cấp (`EMERGENCY/CORRECTIVE`). |
| **1** | Ngày 2 | `TASK-02` | Biên Bản Kiểm Tra An Toàn 6 Điểm Tiền Xuất Bến | `asset-service :8081` | `UC03`<br>`BRULE-01` | Bắt buộc kiểm tra 6 hạng mục an toàn kỹ thuật. Nếu trượt $\ge 1$ mục, commit biên bản lỗi (`noRollbackFor = InspectionFailedException`) và khóa xe `MAINTENANCE`. |
| **1** | Ngày 3 | `TASK-03` | Khởi Tạo Vận Đơn Không Gian PostGIS & Cô Lập Khách Hàng | `shipment-service :8082` | `UC04`<br>`BRULE-02`, `BRULE-16` | Định vị tọa độ lấy/giao hàng `Point(4326)` qua `GeometryMapper` và cô lập dữ liệu vận đơn theo từng chủ hàng (`customerId`). |
| **1** | Ngày 4 | `TASK-04` | Lệnh Điều Phối Xuất Bến & Chốt Chặn Chống Quá Tải | `shipment-service :8082` $\rightarrow$ `asset-service :8081` | `UC06`<br>`BRULE-01`, `02`, `03` | Chặn rủi ro phạt quá tải và tai nạn bằng cách gọi liên dịch vụ kiểm tra xe `AVAILABLE` (`BRULE-01`) và `cargoWeightTons <= maxPayloadTons` (`BRULE-03`). |
| **1** | Ngày 5 | `TASK-05` | Thuật Toán Lập Lộ Trình Xanh Đa Tiêu Chí Pareto | `routing-service :8083` | **UC05 (Cốt lõi)**<br>`BRULE-04`, `05`, `06` | Cân bằng 3 đại lượng ($\text{CO}_2$, Thời gian, Quãng đường) bằng chuẩn hóa trọng số $\sum w = 1.0$ (`BRULE-05`) và chuẩn hóa Min-Max (`BRULE-04`). |
| **1** | Ngày 6 | `TASK-06` | Phê Duyệt Tuyến Đường & Phiên Bản Lộ Trình Bất Biến | `routing-service :8083` | `UC05`, `UC06`<br>`BRULE-09` | Lưu biên bản kiểm toán quyết định chọn đường của Điều phối viên (`RouteDecision`) và sinh phiên bản lộ trình bất biến `RouteVersion (v1, v2...)`. |
| **1** | Ngày 7 | `TASK-07` | Giao Diện Bản Đồ Số React Leaflet So Sánh 3 Tuyến | `frontend :5173` | **UC05 GIS UI** | Hiển thị trực quan 3 phương án tuyến (`LineString`) trên bản đồ Leaflet kèm bảng so sánh lượng $\text{CO}_2$ tiết kiệm. |
| **2** | Ngày 8 | `TASK-08` | Thu Nhận GPS Telemetry, Lọc Nhiễu & Cộng Dồn Km | `tracking-service :8084` | `UC07`, `UC08` | Chặn điểm GPS nhảy vận tốc ảo (`speed > 150 km/h` $\rightarrow$ `qualityPassed = false`), cộng dồn Haversine vào `actualDistanceMeters` và đẩy Redis Live Cache. |
| **2** | Ngày 9 | `TASK-09` | Máy Trạng Thái Cảnh Báo Lệch Hành Lang 3 Điểm Liên Tiếp | `tracking-service :8084` | **UC09 (Cốt lõi)**<br>`BRULE-10` | Chống cảnh báo giả bằng cách đếm 3 điểm hợp lệ liên tiếp vượt `50m` (`YELLOW`) / `200m` (`RED`) và tự đóng (`RESOLVED`) khi 3 điểm quay về $\le 50\text{m}$. |
| **2** | Ngày 10 | `TASK-10` | Bộ Mô Phỏng Hành Trình GPS & Kiểm Thử Lệch Tuyến | `tracking-service :8084` | **UC09 / UC10 Test** | Giả lập luồng tín hiệu GPS thực tế (đi chuẩn, nhảy điểm nhiễu, lệch hành lang $>200\text{m}$ 3 lần liên tiếp) phục vụ kiểm thử tự động E2E. |
| **2** | Ngày 11 | `TASK-11` | Đánh Giá Đổi Tuyến Động: Cooldown 300s & Lợi Ích $\ge 10\%$ | `tracking-service :8084` | **UC10 (Cốt lõi)**<br>`BRULE-07`, `BRULE-08` | Chống dao động lộ trình bằng cửa sổ Cooldown `300s` (`BRULE-07`) và chỉ sinh `RerouteProposal` khi lợi ích cải thiện $\ge 10\%$ (`BRULE-08`). |
| **2** | Ngày 12 | `TASK-12` | Phê Duyệt Đổi Tuyến Động (Dispatcher Human-in-the-Loop) | `tracking-service :8084` | **UC10 (Cốt lõi)**<br>`BRULE-09` | Chỉ khi Điều phối viên bấm `ACCEPTED` mới đóng cảnh báo cũ và chuyển chuyến xe sang lộ trình mới. |
| **2** | Ngày 13 | `TASK-13` | Giao Hàng ePOD & Kế Toán Phát Thải Hậu Kiểm GLEC v3 | `carbon-service :8085` | **UC11, UC12 (Cốt lõi)**<br>`BRULE-06, 11..14` | Tách biệt dự báo và hậu kiểm; tính $\text{WTW} = \text{TTW} + \text{WTT}$, không nhân trùng DAF trên `GPS_ACTUAL` (`BRULE-11`), khóa `BLOCKED` nếu thiếu hệ số (`BRULE-13`) và lưu phiên bản bất biến `SUPERSEDED` (`BRULE-14`). |
| **2** | Ngày 14 | `TASK-14` | Đối Chuẩn Hành Lang Vận Tải Xanh & Báo Cáo ESG SHA-256 | `carbon-service :8085` | **UC13 (Cốt lõi)**, `UC14`<br>`BRULE-15` | Đối chuẩn cường độ phát thải với hành lang chuẩn, giữ nguyên cả kết quả âm chống tẩy xanh (`BRULE-15`) và ký băm `SHA-256` báo cáo kiểm toán ESG. |
| **2** | Ngày 14+ | `TASK-15` | Quản Trị Sự Cố Hiện Trường & Điểm Trừ Tài Xế Công Bằng | `incident-service :8086` | `UC16`, `UC17`, `UC18`<br>`BRULE-17`, `BRULE-18` | Không tự động phạt tài xế khi báo cáo sự cố (`BRULE-17`); chỉ ghi điểm trừ khi Giám sát viên kết luận lỗi chủ quan và yêu cầu HR duyệt khi chạm ngưỡng 20 điểm (`BRULE-18`). |

---

## 📌 2. ĐẶC TẢ CHI TIẾT CÁC TASK CỐT LÕI (CHUẨN CLEAN CODE BOOKSHOP)

### TASK-02: Kiểm Tra An Toàn Tiền Xuất Bến 6 Điểm (`UC03` / `BRULE-01`)
- **Lý do nghiệp vụ**: Bắt buộc kiểm tra 6 hạng mục sống còn (`tires, brakes, lights, fluids, cargo_securing, emergency_kit`). Nếu trượt $\ge 1$ mục, vừa phải trả lỗi HTTP 422 (`1108`) cho tài xế, vừa phải commit biên bản lỗi và khóa xe sang `MAINTENANCE` trong Database.
- **Giải pháp Clean Code**:
  - Đóng gói logic đánh giá vào `record ChecklistEvaluation`.
  - Dùng `@JdbcTypeCode(SqlTypes.JSON)` cho trường `Map<String, String> checklistJson`.
  - Dùng `@Transactional(noRollbackFor = InspectionFailedException.class)` và cơ chế **JPA Dirty Checking** (`vehicle.setStatus(eval.getTargetVehicleStatus())`).

### TASK-04: Lệnh Điều Phối Xuất Bến & Chốt Chặn Chống Quá Tải (`UC06` / `BRULE-01, 02, 03`)
- **Lý do nghiệp vụ**: Ngăn chặn hành vi điều xe đang bảo dưỡng hoặc chở quá tải trọng đăng kiểm.
- **Giải pháp Clean Code**:
  - Tại `ShipmentService#createDispatchOrder` (`POST /api/v1/shipments/dispatch`), gọi đồng bộ sang `asset-service (:8081)` qua `RestClient`.
  - Kiểm tra `vehicle.status == AVAILABLE` (`BRULE-01`) và `shipment.cargoWeightTons <= vehicle.maxPayloadTons` (`BRULE-03`, ném `ErrorCode.INVALID_CARGO_WEIGHT` nếu vượt tải).

### TASK-05 & TASK-06: Lập Lộ Trình Xanh Đa Tiêu Chí Pareto & Quản Lý Phiên Bản Tuyến (`UC05` / `BRULE-04, 05, 09`)
- **Lý do nghiệp vụ**: Tối ưu hóa đồng thời 3 đại lượng có đơn vị khác nhau ($\text{CO}_2$, Thời gian, Quãng đường) và lưu vết quyết định của Điều phối viên.
- **Giải pháp Clean Code**:
  - Tại `RoutingService#planRoutes` (`POST /api/v1/routing/plan`), chuẩn hóa tổng trọng số $\sum w = 1.0$ (`BRULE-05`) và chuẩn hóa Min-Max (`BRULE-04`) trên tập ứng viên.
  - Tại `RoutingService#selectRoute` (`POST /api/v1/routing/select`), lưu `RouteDecision`, vô hiệu hóa các `RouteVersion` cũ và kích hoạt `RouteVersion` mới (`v1`, `v2`...).

### TASK-08, TASK-09, TASK-11, TASK-12: Giám Sát GPS, Cảnh Báo Lệch 3 Điểm & Đổi Tuyến Động (`UC07-10` / `BRULE-07..10`)
- **Lý do nghiệp vụ**: Lọc bỏ tín hiệu GPS nhảy điểm ảo (`speed > 150 km/h`), chống cảnh báo giả bằng máy trạng thái đếm 3 điểm liên tiếp, và chống rung lắc lộ trình khi đổi tuyến động.
- **Giải pháp Clean Code**:
  - Tại `TrackingService#ingestTelemetry` (`POST /api/v1/tracking/telemetry`), kiểm tra `validateGpsQuality`, cộng dồn Haversine vào `trip.actualDistanceMeters`, cập nhật Redis Live Cache và chạy `evaluateDeviationStateMachine` (3 điểm liên tiếp vượt `50m YELLOW` / `200m RED`, tự đóng `RESOLVED` khi 3 điểm $\le 50\text{m}$).
  - Tại `TrackingService#evaluateDynamicReroute`, kiểm tra cửa sổ Cooldown `300s` (`BRULE-07`) và ngưỡng lợi ích $\ge 10\%$ (`BRULE-08`).
  - Tại `TrackingService#decideRerouteProposal` (`PUT /api/v1/tracking/reroute-proposals/{id}/decision`), thực thi phê duyệt `ACCEPTED / REJECTED` (`BRULE-09`).

### TASK-13 & TASK-14: Giao Hàng ePOD, Kế Toán Phát Thải GLEC v3 & Đối Chuẩn Hành Lang ESG (`UC11-14` / `BRULE-06, 11..15`)
- **Lý do nghiệp vụ**: Đảm bảo số liệu báo cáo phát thải khí nhà kính đạt chuẩn kiểm toán quốc tế GLEC Framework v3.0 & ISO 14083, chống nhân trùng hệ số DAF và chống "tẩy xanh" (Greenwashing).
- **Giải pháp Clean Code**:
  - Tại `CarbonService#calculateGlecV3Emissions` (`POST /api/v1/carbon/pod` & `POST /api/v1/carbon/calculate`), chuyển các bản ghi cũ sang `SUPERSEDED` kèm `versionNumber++` (`BRULE-14`), đặt `BLOCKED` nếu thiếu hệ số (`BRULE-13`), giữ `isDafApplied = false` cho `GPS_ACTUAL` (`BRULE-11`), và tính $\text{WTW} = \text{TTW} + \text{WTT}$ (`BRULE-12`).
  - Tại `CarbonService#evaluateTripBenchmark` (`POST /api/v1/carbon/benchmarks/evaluate/{tripId}`), bảo toàn giá trị âm nếu phát thải thực tế vượt định mức (`BRULE-15`).
  - Tại `CarbonService#exportCarbonReport` (`POST /api/v1/carbon/reports/export`), ký băm `SHA-256` (`fileHash`).

### TASK-15: Quản Trị Sự Cố Hiện Trường & Điểm Trừ Kỷ Luật Tài Xế Công Bằng (`UC16-18` / `BRULE-17, 18`)
- **Lý do nghiệp vụ**: Khuyến khích tài xế trung thực báo cáo sự cố hiện trường mà không sợ bị hệ thống phạt tự động oan sai.
- **Giải pháp Clean Code**:
  - Tại `FieldIncidentService#createIncident` (`POST /api/v1/incidents`), khởi tạo sự cố ở trạng thái `PENDING_REVIEW` (`BRULE-17`).
  - Tại `FieldIncidentService#resolveIncident` (`POST /api/v1/incidents/{id}/resolve`), chỉ khi Giám sát viên chọn `ESCALATE_TO_DEMERIT` mới tạo `DemeritRecord`.
  - Tại `FieldIncidentService#getDriverDemeritSummary` & `reviewDemeritRecord`, đối chiếu ngưỡng `10 điểm (WARNING)` và `20 điểm (REVIEW_REQUIRED)` chờ Quản lý An toàn / HR phê duyệt (`BRULE-18`).
