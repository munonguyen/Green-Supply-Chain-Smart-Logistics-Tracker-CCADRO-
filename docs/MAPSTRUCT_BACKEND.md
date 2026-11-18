# MapStruct trong backend

MapStruct sinh code chuyển đổi tại thời điểm compile; Spring inject mapper vào controller/service. Entity và public response có thể phát triển độc lập. Chỉ mapping dữ liệu thuộc mapper; kiểm tra quyền, truy vấn repository, mã hóa mật khẩu, sinh ID/timestamp, tính tiền và các quyết định nghiệp vụ vẫn nằm trong service.

## Phạm vi từng ứng dụng

| Ứng dụng | Mapper |
|---|---|
| Identity | `UserMapper`, `RoleMapper`, `PermissionMapper`, `CompanyMapper` |
| Asset | `VehicleMapper`, `DriverMapper`, `ContainerMapper`, `VehicleMaintenanceMapper`, `PreTripInspectionMapper`, `HandoverMapper` |
| Shipment | `ShipmentMapper`, `DispatchOrderMapper`, `GeometryMapper` |
| Routing | `RoutingMapper`, `RouteDecisionMapper`, `GeometryMapper` |
| Tracking | `TrackingMapper`, `RerouteProposalMapper`, `GeometryMapper` |
| Carbon | `CarbonMapper`, `PodMapper` |
| Incident | `FieldIncidentMapper`, `GeometryMapper` |
| Notification | `EmergencyNotificationMapper` |
| Payment | `PaymentMapper`, `ContractMapper` (transaction/audit/contract/SLA event) |
| Hub Shipper | `HubWorkspaceMapper` (workspace đã lọc quyền, auth context từ header đã xử lý) |
| Chat | `ChatMapper` (Mongo document → response record; summary nhiều nguồn) |
| API Gateway | `IdentityRequestMapper` (request introspection) |
| Eureka Server | Không có entity/DTO nghiệp vụ để chuyển đổi; dùng model của Eureka, không tạo mapper giả |

Các `GeometryMapper` là helper hình học được MapStruct gọi, không phải mỗi helper đều cần annotation `@Mapper`. Gateway không có database riêng. Hub workspace hiện giữ schema entity lồng có sẵn trong response; việc đưa sang DTO lồng riêng cần thay contract có kiểm soát, không tự đổi trong refactor này.

## Quy ước build và code

Các ứng dụng dùng MapStruct **1.5.5.Final**, processor `mapstruct-processor` và `lombok-mapstruct-binding` **0.2.0** cùng Lombok. Giữ version đồng bộ trong các POM độc lập; backend/pom.xml là aggregator, không phải parent mà các service kế thừa.

- Mapper dùng `componentModel="spring"`. Các mapper mới đặt `unmappedTargetPolicy=ERROR` để phát hiện trường response bị bỏ quên khi build.
- Các bản chuyển từ builder thủ công dùng `@BeanMapping(ignoreByDefault=true)` và danh sách `@Mapping` tường minh, giữ đúng trường từng được công bố; không tự ánh xạ thêm dữ liệu nhạy cảm mới cùng tên. Những mapper có sẵn tiếp tục dùng quy tắc đã có để không thay đổi semantics partial update.
- Không tự dùng `@MappingTarget` cho mọi request: cần quy định rõ `null` là giữ giá trị hay xóa giá trị; không được ghi đè ID/version, owner, password, trạng thái duyệt, thông tin xóa mềm do client truyền.
- Hợp đồng giữ quy tắc cũ: limit/used null → 0; availableCredit = max(0, limit-used). Chat giữ sender/readBy/reactions/metadata và null lastMessage.
- Response tổng hợp (thống kê thanh toán, tính nhiên liệu, điểm phạt), giải mã JWT/JSON và ánh xạ hàng native SQL có tính toán không được di chuyển máy móc vào mapper. Đây là xử lý nghiệp vụ/adapter, không phải sao chép entity đơn thuần.
- Không sửa `target/generated-sources/annotations/*MapperImpl.java`; Maven sinh lại khi compile. Tests thuần Java dùng `Mappers.getMapper(...)` để chạy mapper thật; runtime dùng bean Spring.

## Kiểm tra

```bash
CHAT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat_test \
  mvn -f backend/pom.xml verify
```

Integration phụ thuộc môi trường khác có thể có điều kiện chạy riêng. Kiểm tra số test bị skip trong báo cáo Surefire; compile thành công không có nghĩa đã kiểm tra toàn bộ luồng runtime. Source generated ở `backend/<service>/target/generated-sources/annotations` hỗ trợ debug từng field.

Tài liệu: [MapStruct 1.5 Reference Guide](https://mapstruct.org/documentation/1.5/reference/html/).

## Kết quả xác minh local

Build sạch 14 module và 66 kiểm thử backend đã đạt, không có test bị skip. Do IDE đồng thời cập nhật `target`, bản kiểm tra được build từ source sao chép vào `/tmp/ccadro-backend-eureka-mapstruct`, sau đó các JAR đã qua kiểm tra được đưa lại `backend/<module>/target/`. Gateway, Identity, Asset và Chat đang chạy đã được restart với Eureka Client bật và xuất hiện `UP` tại registry local. Các service chưa chạy sẽ xuất hiện khi khởi động bằng `dev-start`.
