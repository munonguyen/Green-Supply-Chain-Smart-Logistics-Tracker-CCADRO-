# Kiểm tra local sau restart

Thời điểm ghi nhận: 2026-11-19 23:59:58 +0700. Đây là xác minh môi trường local, không phải chứng nhận an toàn production.

## Kết quả

- 13 module backend đã được khởi động từ bộ JAR đã build và kiểm tra dependency Jackson.
- Health trực tiếp của Eureka và 11 business service trả HTTP 200, status UP. Gateway được kiểm tra bằng request nghiệp vụ đi tới Identity.
- **30/30 kiểm tra runtime đạt**, bao gồm frontend HTML, public API, API có Bearer, chặn header danh tính giả và các đường dẫn kỹ thuật.
- **10/10 tài khoản role** đăng nhập được bằng mật khẩu test hiện có, trả đúng role, đọc được hồ sơ bản thân; token sau logout bị từ chối.
- Frontend: **60/60 test đạt**, ESLint đạt, production build đạt. Còn warning bundle lớn hơn 500 kB.
- Backend: 135 test đạt; 7 Chat integration test cần MongoDB test URI chưa được cấu hình nên vẫn skipped. Đóng gói đủ 13 executable JAR đạt ở lượt kiểm chứng trước restart.

| Kiểm tra qua gateway | Kết quả |
|---|---|
| Public careers openings | 200 |
| Anonymous đọc users/containers/system health | 401 |
| Giả X-Auth-Username và X-Auth-Scope nhưng không có Bearer | 401 |
| Actuator, OpenAPI, Swagger, internal path | 404 |
| ADMIN truy cập Actuator/OpenAPI qua gateway | 404 |
| ADMIN đọc health, containers, trips, payments, contracts, Hub IAM | 200 |
| Hub IAM response | Không có password hoặc passwordHash |
| Frontend trên port 5173 | 200 |

Probe chỉ gọi GET hoặc login/logout; không gọi API tạo/xác nhận/hoàn thanh toán, gửi email hay ingest GPS. HTTP 200 cho HTML SPA không tự chứng minh route nội bộ trả HTTP 404 ở server; phần bảo vệ UI có test riêng.

## Khởi động local

`scripts/dev-start.sh` đã được cập nhật:

- Tạo process bằng Python Popen với start_new_session, tách khỏi vòng đời terminal/tool. Đã kiểm tra lại sau khi lệnh khởi động kết thúc; process được reparent về PID 1 và có process group riêng.
- Chờ health từng service trước khi chạy service tiếp theo. Gateway dùng public route kiểm chứng kết nối Identity, không dùng endpoint health cần Bearer làm readiness anonymous.
- Chỉ kiểm tra TCP listener khi xác định port đã được sử dụng.
- Giới hạn mặc định local: JVM 64–256 MB, SerialGC, hai processor logic; Hikari tối đa bốn kết nối và minimum idle một. Có thể override bằng CCADRO_JAVA_OPTS và các biến Spring datasource tương ứng.
- Frontend mặc định bind loopback; có thể cấu hình FRONTEND_HOST khi cần phục vụ mạng phát triển riêng.
- Framework logging mặc định INFO trong script. Không ghi token hoặc credential vào báo cáo kiểm tra.

## Kafka local

Kafka đã lặp restart trước lượt triển khai này. Lỗi thực tế là file replication-offset-checkpoint chứa toàn bộ byte NUL, khiến broker từ chối thư mục log.

Đã stop broker, sao lưu checkpoint lỗi và recovery checkpoint vào thư mục được ignore `logs/kafka-recovery/`, thay riêng checkpoint không còn entry có thể đọc bằng định dạng checkpoint rỗng hợp lệ rồi khởi động lại. Không recreate container, không xóa topic, không xóa log segment. Metadata request thành công và liệt kê bảy topic sau phục hồi. Đây không phải kiểm thử end-to-end quy trình tài chính/email qua Kafka hoặc cam kết đối soát mọi message lịch sử.

Định dạng checkpoint được đối chiếu với source Apache Kafka 3.7.1: `CheckpointFile` và `OffsetCheckpointFile`.

## Giới hạn

Các vấn đề quyền theo từng bản ghi, xác thực service-to-service và các hạng mục production trong `SYSTEM_SECURITY_REVIEW.md` vẫn phải xử lý. Gateway trả status đúng và service health UP không thay cho việc hoàn thành các hạng mục đó. Các tài khoản mật khẩu 123 chỉ dành cho test local.
