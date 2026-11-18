# CCADRO architecture review: AS-IS → TARGET

Tài liệu này là source-of-truth cho hai sơ đồ kiến trúc cần dựng theo style ảnh mẫu: nền trắng, các tầng ngang, khối bo góc màu pastel, icon công nghệ nhỏ, mũi tên đồng bộ/bất đồng bộ và chú giải ở góc dưới.

Hai sơ đồ được dựng bằng code theo yêu cầu bổ sung của người dùng. PNG 6400 × 4560 và SVG chỉnh sửa được nằm trong `docs/assets/architecture-generated/`. Script tái tạo SVG: `python3 scripts/generate-architecture.py`. Sơ đồ mô tả cấu trúc source/config đã kiểm tra, không xác nhận trạng thái runtime hay tải thực tế.

- [Ảnh hiện trạng](assets/architecture-generated/ccadro-architecture-current.png)
- [Ảnh khắc phục đề xuất](assets/architecture-generated/ccadro-architecture-proposed.png)
- [SVG hiện trạng](assets/architecture-generated/ccadro-architecture-current.svg)
- [SVG đề xuất](assets/architecture-generated/ccadro-architecture-proposed.svg)

## AS-IS — kiến trúc đang có trong source

### Tầng truy cập

- **Web Portal**: React 18 + Vite + Leaflet, cổng `5173`.
- **GPS Simulator / Driver Terminal**: gửi telemetry tới Gateway.
- **API Gateway**: Spring Cloud Gateway, cổng `8888`; route tới `8080–8089`, xác thực JWT bằng introspection với Identity Service, CORS, Swagger aggregation.
- **Identity Service**: cổng `8080`; phát hành/introspect JWT và cung cấp RBAC.

### Tầng domain services

| Service | Port | Chức năng chính từ code |
|---|---:|---|
| Asset | 8081 | vehicle, driver, container, pre-trip, hub assets |
| Shipment + Saga | 8082 | shipment, dispatch order, Saga state, transactional outbox |
| Routing | 8083 | route planning, route version/decision, OSRM adapter + deterministic mock fallback |
| Tracking | 8084 | trip, telemetry, deviation, reroute, SSE fleet stream |
| Carbon | 8085 | GLEC emission, fuel/cost model, benchmark, ePOD |
| Incident | 8086 | field incident, resolution, demerit; phát cảnh báo Kafka |
| Notification | 8087 | Kafka consumer, emergency notification, SSE, email evidence worker |
| Payment | 8088 | payment, contracts, evidence relay; VNPay signed checkout nếu cấu hình, mặc định sandbox |
| Hub Shipper | 8089 | hub isolation, local shipper, manifest, photo POD metadata |

### Tầng dữ liệu và hạ tầng hiện tại

- **Một PostgreSQL/PostGIS dùng chung**, cổng container `5432`, Flyway `V001–V028`. Cổng host lấy từ `POSTGRES_PORT` (`.env.example`: 5432); service config và Maven có fallback 5433, nên cần thống nhất khi chạy. Maven aggregator chạy migration từ `backend/db/migration`; service configs dùng cùng database `ccadro`.
- **Redis `6379`** được provision trong Docker Compose. Chưa có đường Tracking → Redis được xác nhận trong code path hiện tại; live telemetry dùng JPA/native SQL và `CopyOnWriteArrayList<SseEmitter>`.
- **Kafka `9092`** chạy một broker/controller trong Compose. Topic cảnh báo khẩn cấp là `ccadro.emergency.notifications`.
- **Shipment outbox** ghi `outbox_event`, scheduler đọc PENDING rồi gọi `notification-service` qua REST. Nó không publish Kafka.
- **SSE**: Tracking stream giữ emitter trong memory; Notification cũng phát SSE.
- **External**: OSRM hoặc mock fallback; VNPay signed URL khi đủ cấu hình, mặc định sandbox; Brevo khi đủ cấu hình. Không khẳng định các phương thức thanh toán hiển thị trên UI đều có tích hợp live. Frontend dùng `localStorage` và `BroadcastChannel` cho session/chat/payment state, có cả auth offline fallback tạo token cục bộ.
- **POD**: Hub Shipper lưu `proofImageUrl`/caption metadata; không có object-storage service được triển khai trong source.

### Nhận xét cần đặt trong panel đỏ của sơ đồ AS-IS

1. Process tách service, data vẫn dùng chung.
2. Tracking/Incident phát cảnh báo async không qua durable outbox; Kafka listener catch/log exception mà không rethrow. Broker đơn là giới hạn HA, không tự nó là lỗi cho MVP. Shipment outbox gửi REST là một cơ chế relay có thật, không phải relay Kafka.
3. Saga bù trừ log lỗi nhưng chưa có worker retry/reconcile bền vững; reserve xe/tài xế qua nhiều request, cần thao tác nguyên tử và idempotency.
4. Chưa có object storage; POD nhận `proofImageUrl` metadata, chưa có pipeline upload và kiểm soát vòng đời file.
5. Frontend có offline auth, token cục bộ và local ledger; chat BroadcastChannel chỉ đồng bộ giữa tab, không đồng nghĩa đồng bộ đa thiết bị.
6. Internal call dùng localhost; xác thực tập trung ở Gateway. Redis chưa có đường đọc/ghi Tracking xác nhận, SSE giữ subscriber trong memory; cần giới hạn mạng, xác thực nội bộ và quan sát hệ thống khi đưa production.

## TARGET — kiến trúc khắc phục đề xuất

### Tầng edge và bảo mật

- Web/GPS → **Ingress / API Gateway**, tăng replica khi yêu cầu vận hành cần HA.
- Gateway xác thực JWT bằng Identity, rate limit theo client, correlation ID, timeout và circuit breaker.
- Các service không public port; internal traffic chạy private network và mTLS/service identity.

### Tầng domain và giao tiếp

- Giữ mười bounded context hiện có, mỗi service sở hữu schema/database với role riêng: Identity, Asset, Shipment, Routing, Tracking, Carbon, Incident, Notification, Payment, Hub Shipper. Với MVP, một PostgreSQL có nhiều schema/role là bước chuyển thực dụng; tách instance sau khi bỏ JOIN xuyên domain và xác định owner cho hub/manifest.
- Dùng service discovery hoặc DNS nội bộ thay cho URL `localhost`.
- Giữ REST cho request/response và Saga orchestration; thêm idempotency key, timeout, retry có backoff, DLQ và trạng thái bù trừ.

### Event backbone

- Kafka có retention, retry và DLQ/replay. MVP có thể giữ một broker; khi cần HA production, dùng ba broker với replication factor 3 và chính sách ACK/min ISR phù hợp.
- Event nghiệp vụ quan trọng đi theo **Transactional Outbox → Kafka**; Notification và Carbon là consumer theo nhu cầu thực. Audit/analytics là mở rộng tùy nhu cầu, không phải hai service đang có trong source.
- Consumer lưu event ID/idempotency key để xử lý at-least-once an toàn.

### Data và lưu trữ

- Tách database/schema theo service; cấm cross-service SQL JOIN. Trao đổi bằng ID và API/event.
- Tracking dùng Redis cho latest position/TTL/cooldown và Pub/Sub fan-out SSE khi chạy nhiều replica; telemetry lịch sử ghi PostgreSQL/PostGIS. Timescale là lựa chọn mở rộng theo tải, chưa triển khai trong source. Pub/Sub không phải log bền vững; client kết nối lại lấy snapshot từ DB/read model.
- Thêm Object Storage S3-compatible cho ảnh POD/evidence; DB chỉ lưu object key, checksum, content type và retention metadata.
- Read models/search index được xây qua events; không để service đọc bảng domain của service khác.

### Vận hành

- Health/readiness, metrics, logs và traces tập trung; alert cho Kafka lag, outbox age, Saga stuck, DB pool và SSE subscribers.
- CI/CD build image từng service, scan image, deploy rolling/blue-green; secrets trong secret manager.

### Chú giải sơ đồ

- Mũi tên liền: synchronous REST/Feign.
- Mũi tên nét đứt: asynchronous Kafka event.
- Viền đỏ: vấn đề AS-IS.
- Viền xanh lá: thành phần khắc phục/target.

## Bằng chứng source đã đối chiếu

- Gateway routes: `backend/api-gateway/src/main/resources/application.yaml`.
- Shared DB + Flyway modules: `backend/pom.xml`, `backend/*/src/main/resources/application.yaml`, `backend/db/migration/`.
- One-broker Kafka/Redis/Postgres: `docker-compose.yml`.
- Outbox relay qua REST: `backend/shipment-service/src/main/java/com/ccadro/shipment/saga/OutboxRelayScheduler.java`.
- Kafka emergency path: `backend/tracking-service/.../EmergencyNotificationPublisher.java`, `backend/incident-service/.../FieldIncidentService.java`, `backend/notification-service/.../EmergencyNotificationKafkaListener.java`.
- In-memory SSE: `backend/tracking-service/.../FleetTelemetryStreamService.java`.
- Cross-table native joins: `backend/tracking-service/.../TripRepository.java`.
- POD URL metadata: `backend/hub-shipper-service/.../ContainerCargoManifestItem.java`.
