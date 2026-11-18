# Eureka Server — giám sát trạng thái dịch vụ

Eureka là màn hình hạ tầng riêng tại **http://localhost:8761**, không nằm trong React portal. Registry hiển thị instance, trạng thái đăng ký, heartbeat và liên kết health/info. Mỗi service gửi trạng thái tổng hợp từ Spring Boot Actuator lên Eureka; đây không phải công cụ đo latency, CPU, RAM, log hay tracing.

## Cấu hình đã triển khai

- Module `backend/eureka-server`, Spring Boot 3.3.4 và Spring Cloud 2023.0.3, độc lập với database nghiệp vụ.
- Gateway và 11 backend service (Identity, Asset, Shipment, Routing, Tracking, Carbon, Incident, Notification, Payment, Hub Shipper, Chat) có Eureka Client.
- `spring.application.name` là tên đăng ký. ID mặc định `<service>:<port>`. Khi chạy nhiều instance, đặt `EUREKA_INSTANCE_ID` khác nhau cho từng process.
- Healthcheck được bật trong `application.yaml`. Actuator `DOWN` được phản ánh vào trạng thái đăng ký; không coi một request nghiệp vụ 401/403 là service offline.
- Heartbeat mặc định 30 giây, lease 90 giây. Hủy đăng ký khi shutdown bình thường; khi mất process đột ngột cần chờ lease/chu kỳ eviction. Self-preservation được giữ bật nên registry có thể giữ instance cũ khi mất nhiều heartbeat; danh sách không đảm bảo phản ánh lỗi ngay lập tức.
- Đây là đăng ký và theo dõi trạng thái. Gateway vẫn dùng route URL hiện có, chưa chuyển sang `lb://`; client không tải registry (`fetch-registry: false`). Thay đổi routing/discovery runtime là phạm vi riêng.

## Chạy local

```bash
# Build lại jar khi cập nhật source; dev-start không tự thay jar đã tồn tại.
mvn -f backend/pom.xml package -DskipTests
./scripts/dev-start.sh
```

Script khởi động/chờ Eureka trước khi bật các client, in địa chỉ dashboard; dev-stop dừng cả registry. Client đang chạy từ jar cũ cần restart sau khi build. Script không tự restart process đang chạy.

Chạy riêng registry:

```bash
mvn -f backend/eureka-server/pom.xml verify
java -jar backend/eureka-server/target/eureka-server-0.1.0-SNAPSHOT.jar
```

Chạy riêng một client:

```bash
EUREKA_CLIENT_ENABLED=true \
EUREKA_SERVER_URL=http://127.0.0.1:8761/eureka/ \
CHAT_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat \
java -jar backend/chat-service/target/chat-service-0.1.0-SNAPSHOT.jar
```

Các client mặc định không bật khi chạy jar trực tiếp để unit/integration test và chạy service độc lập không phụ thuộc registry. `dev-start` export `EUREKA_CLIENT_ENABLED=true`; `.env.example` cũng bật rõ ràng. Không cần thay `.env` hiện tại nếu dùng script.

Biến môi trường:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `EUREKA_PORT` | `8761` | Cổng registry |
| `EUREKA_BIND_ADDRESS` | `127.0.0.1` | Interface của server |
| `EUREKA_START_LOCAL` | `true` trong dev-start | `false` khi dùng registry bên ngoài |
| `EUREKA_CLIENT_ENABLED` | `false` trong YAML, `true` trong dev-start | Đăng ký instance |
| `EUREKA_SERVER_URL` | `http://127.0.0.1:8761/eureka/` | Phải có `/eureka/` |
| `EUREKA_INSTANCE_HOSTNAME` | `localhost` | Host client công bố, cần truy cập được từ dashboard/hạ tầng |
| `EUREKA_INSTANCE_ID` | `${server.port}` | Suffix duy nhất theo instance |

Eureka local chỉ bind loopback và không có tài khoản đăng nhập riêng. Khi triển khai trong container/mạng dùng chung, đặt hostname/URL truy cập được, bảo vệ dashboard/registry trong mạng quản trị với access control phù hợp. Không route Eureka vào UI khách hàng và không expose registry công khai.

## Kiểm thử

```bash
mvn -f backend/eureka-server/pom.xml verify
CHAT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/ccadro_chat_test \
  mvn -f backend/chat-service/pom.xml verify
mvn -f backend/api-gateway/pom.xml verify
```

`EurekaRegistryIntegrationTest` chạy registry và ứng dụng client độc lập trên port ngẫu nhiên, kiểm tra dashboard, registration có port thật, heartbeat gia hạn, health chuyển DOWN và unregister khi shutdown.

Tài liệu đối chiếu: [Spring Cloud Netflix — Eureka client/server](https://docs.spring.io/spring-cloud-netflix/reference/spring-cloud-netflix.html).

## Kết quả xác minh local

Build sạch 14 module và 66 kiểm thử backend đã đạt, không có test bị skip. Do IDE đồng thời cập nhật `target`, bản kiểm tra được build từ source sao chép vào `/tmp/ccadro-backend-eureka-mapstruct`, sau đó các JAR đã qua kiểm tra được đưa lại `backend/<module>/target/`. Gateway, Identity, Asset và Chat đang chạy đã được restart với Eureka Client bật và xuất hiện `UP` tại registry local. Các service chưa chạy sẽ xuất hiện khi khởi động bằng `dev-start`.
