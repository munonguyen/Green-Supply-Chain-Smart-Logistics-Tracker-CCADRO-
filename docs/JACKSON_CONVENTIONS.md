# Quy ước Jackson cho backend CCADRO

Áp dụng ngày 19/11/2026 cho 13 module Maven. Phạm vi là dependency, JSON boundary, serialization và kiểm thử hợp đồng JSON; không phải chuyển đổi toàn bộ hệ thống thành Clean Architecture hoặc hoàn tất các phát hiện trong `SYSTEM_SECURITY_REVIEW.md`.

Cập nhật vận hành: đã restart và kiểm tra local sau lượt thay đổi; xem `LOCAL_RUNTIME_VERIFICATION.md`. Các số liệu trước restart bên dưới được giữ làm lịch sử kiểm tra.

## Dependency và cấu hình

- Mỗi module khai báo trực tiếp các Jackson API mà source sử dụng. Các artifact được chọn theo import thực tế: `jackson-annotations`, `jackson-core`, `jackson-databind`; payment còn trực tiếp sử dụng `jackson-datatype-jsr310` trong test.
- Không ghi đè phiên bản Jackson riêng lẻ. Giữ bộ phiên bản do Spring Boot 3.3.4 quản lý; đợt này không nâng Spring Boot/Jackson hoặc tuyên bố đã khắc phục CVE.
- Không đặt Jackson thành dependency test-only nếu framework cần chính artifact đó khi chạy: khai báo trực tiếp scope test có thể làm thay đổi scope của dependency bắc cầu.
- Mỗi service dùng `ObjectMapper` do Spring Boot cấu hình và inject qua constructor. Không tạo mapper tĩnh, mapper fallback hoặc `new ObjectMapper()` trong production code.
- Không thêm cấu hình JSON toàn cục chỉ để đồng nhất hình thức. Giữ các hợp đồng hiện có: Hub dùng `data`, phần lớn service dùng `result`, Chat có envelope riêng; giữ timestamp, null handling và field naming.
- Unit test adapter có thể tạo mapper riêng khi chỉ kiểm tra dữ liệu JSON đơn giản. Kiểm thử hợp đồng API phải dùng `@JsonTest` với mapper thực tế do Boot cấu hình, bao gồm module Java Time và mixin.

## Ranh giới trách nhiệm

### Asset

`DriverService` phụ thuộc port `DriverCertificationCodec`; `PreTripInspectionService` phụ thuộc port `InspectionChecklistEncoder`. Hai adapter Jackson ở `infrastructure/json` chịu trách nhiệm mã hóa/đọc biểu diễn lưu trữ. Các use case này không import Jackson.

Giữ fallback đọc dữ liệu chứng chỉ cũ bị thiếu/sai JSON. Chuẩn hóa giá trị JSON `null` thành fallback thay vì trả danh sách null. Riêng lỗi ghi chứng chỉ phải báo lỗi, không âm thầm lưu một bộ chứng chỉ mặc định khác với dữ liệu người dùng nhập. Lỗi JSON checklist vẫn dùng mã lỗi ứng dụng cũ và giữ cause để phục vụ chẩn đoán.

### Tracking

`FleetTelemetryService` phụ thuộc `RouteWaypointDecoder`, không sở hữu static mapper hoặc parse `JsonNode`. `JacksonRouteWaypointDecoder` xử lý dữ liệu tuyến lưu trữ, giữ thứ tự tọa độ từ GeoJSON `[longitude, latitude]` sang response hiện tại `[latitude, longitude]`. Route lịch sử thiếu/sai JSON trả danh sách rỗng như trước.

### Notification

`PaymentEvidenceEmailWorker` yêu cầu mapper được inject; loại bỏ constructor chỉ để tiện test và fallback `new ObjectMapper()`. Kafka vẫn có thể chưa được cấu hình theo hành vi hiện có. Test phải cung cấp dependency cần thiết một cách rõ ràng.

### Identity

Các endpoint Hub IAM trả `HubIamAccountResponse` qua `HubIamAccountMapper`, thay vì serialize entity trực tiếp. DTO là allowlist, không khai báo `password` hoặc `passwordHash`; MapStruct báo lỗi khi không map đủ field đích. Các field công khai cũ được giữ nguyên để không đổi hợp đồng frontend.

Giữ `@JsonIgnore` tại `HubIamAccount.passwordHash` như lớp bảo vệ bổ sung cho persistence model cũ. Không xóa lớp bảo vệ credential chỉ để làm sạch import. Các API khác vẫn phải lựa chọn response DTO theo quyền; Jackson không thực hiện authorization.

### Dữ liệu không gian

Các quy tắc ẩn geometry chuyển từ entity sang `configuration/json/*JsonMixin` trong shipment, routing, tracking và incident. Spring Boot tự đăng ký các `@JsonMixin` cho mapper được quản lý. Các trường tọa độ tính sẵn vẫn xuất hiện như trước; không expose object JTS/PostGIS hoặc đồ thị đối tượng nội bộ.

Không serialize các entity này bằng mapper tự tạo. Khi thêm một boundary ngoài HTTP, inject mapper hiện có hoặc dùng DTO rõ ràng. Đây là biện pháp tương thích với API cũ, không phải khuyến nghị trả entity cho endpoint mới.

### Các adapter khác

Gateway filter, HTTP client, websocket, Kafka/outbox và renderer lưu trữ có thể dùng Jackson vì chúng xử lý giao thức/biểu diễn dữ liệu. Không thêm một `JsonService` dùng chung giữa các microservice hoặc một shared module chỉ để bọc `ObjectMapper`.

## Kiểm thử và xác minh

- `JsonContractTest` trong cả 13 module kiểm tra mapper cấu hình thật, Unicode, thời gian ISO-8601 và envelope/null semantics tương ứng từng module.
- `GeometryJsonContractTest` trong bốn service kiểm tra geometry không xuất ra JSON và giữ tọa độ công khai.
- `HubIamAccountJsonTest` kiểm tra DTO không chứa credential, kể cả khi serialize bằng mapper khác.
- Adapter tests kiểm tra đảo thứ tự tọa độ GeoJSON, dữ liệu lịch sử hỏng/null, round-trip chứng chỉ Unicode và lỗi ghi không bị che giấu.
- Các test nghiệp vụ hiện có tiếp tục phải đạt, không chỉ các test JSON mới.

Kết quả test trên source đã thay đổi: 142 test được liệt kê trong báo cáo Surefire của đủ 13 module, trong đó **135 đạt, 0 failure, 0 error, 7 skipped**. Bảy test Chat integration cần biến `CHAT_TEST_MONGODB_URI` nên được bỏ qua khi môi trường test MongoDB chưa được cấu hình; không coi chúng là đã kiểm thử thành công.

Đóng gói Maven đạt cho toàn bộ reactor. Đã mở và kiểm tra đủ **13 executable JAR**: mỗi JAR có `jackson-core`, `jackson-annotations`, `jackson-databind` và Java Time module đồng bộ phiên bản `2.17.2`; các adapter/DTO mới có trong artifact và test classes không bị đóng gói vào ứng dụng.

Lệnh kiểm tra toàn bộ backend:

```bash
mvn -f backend/pom.xml test
mvn -f backend/pom.xml -DskipTests package
```

Kiểm tra dependency một module:

```bash
mvn -f backend/identity-service/pom.xml dependency:tree '-Dincludes=com.fasterxml.jackson.*:*'
```

Build kiểm chứng trong lượt thay đổi này dùng bản sao source riêng để tránh xung đột với thư mục `target` mà IDE đang dùng. Không tự restart các tiến trình ứng dụng local. Muốn áp dụng runtime phải rebuild/restart theo quy trình môi trường tương ứng.

Build toàn bộ còn phát hiện một đoạn hàm `isNotBlank` và dấu đóng class bị lặp sẵn ở cuối `PaymentService.java`. Đã xóa phần dư để module biên dịch; không thay đổi logic thanh toán. Bộ test được chạy theo từng chặng để giảm áp lực bộ nhớ khi stack local vẫn hoạt động.

Cấu hình JPA auditing của Payment được tách khỏi bootstrap class sang `JpaAuditingConfiguration`. Ứng dụng đầy đủ vẫn bật auditing qua component scan; JSON slice không bị buộc khởi tạo JPA metamodel khi chỉ kiểm tra serialization.

## Tài liệu tham chiếu

- Spring Boot 3.3 JSON auto-configuration và mixins: https://docs.spring.io/spring-boot/3.3/reference/features/json.html
- Jackson Databind 2.x, module và mapper reuse: https://github.com/FasterXML/jackson-databind/blob/2.x/README.md
- Maven dependency mechanism, scope và dependency management: https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html
