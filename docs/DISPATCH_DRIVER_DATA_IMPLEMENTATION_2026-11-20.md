# Bổ sung điều phối, hồ sơ lái xe và kiểm kê dữ liệu — 20/11/2026

Tài liệu này cập nhật phần đã sửa sau báo cáo `DISPATCHER_BUSINESS_AUDIT_2026-11-20.md`. Các rủi ro trong báo cáo cũ vẫn cần nghiệm thu nếu không được đánh dấu xử lý ở đây. Bản sửa đang ở working tree, chưa triển khai lên hệ thống vận hành.

## Quy trình đã thay đổi

1. Admin tạo tài khoản DRIVER, khai báo nhân sự, ngày sinh, số/hạng/ngày cấp/ngày hết hạn GPLX, kiểm tra danh tính, sức khỏe và tập huấn.
2. Phê duyệt hồ sơ kiểm tra luật hạng CE và FC chuyển tiếp. Bước này gắn tài khoản DRIVER đang hoạt động với hồ sơ đội xe. Tài khoản hoặc hồ sơ trùng bị chặn. Thay đổi thông tin định danh tài khoản, GPLX, ngày sinh hoặc các xác nhận tuân thủ đưa hồ sơ về chờ duyệt.
3. Dispatcher tra danh sách điều kiện phân công. API trả mã nhân viên, trạng thái hồ sơ, hạng/ngày GPLX, số GPLX đã che và nguyên nhân chưa đạt. API không trả lương hoặc CCCD. Danh sách và lệnh phân công cùng đọc view `driver_dispatch_qualification`.
4. Khi phân công container, xe và tài xế được giữ chỗ ở trạng thái ASSIGNED. Lệnh vận đơn phải dùng đúng bộ ba container–xe–tài xế đã chọn. Trường hợp vận đơn không gắn container vẫn được tạo lệnh riêng.
5. Lệnh điều phối giữ khóa bản ghi vận đơn, container, xe và tài xế trong giao dịch PostgreSQL. Tạo Tracking Trip ở SCHEDULED và ghi lệnh cùng trạng thái DISPATCHED của vận đơn. Lỗi trong giao dịch cục bộ hoàn tác giữ chỗ mới. Tracking Trip đã được tạo bên ngoài giao dịch có thể còn lại sau timeout, nên chỉ cho khởi hành khi có lệnh ASSIGNED khớp. Retry chuyến SCHEDULED có thể cập nhật phân công trước khi chạy.
6. Khoang lái chỉ nhận hồ sơ liên kết chính xác tài khoản. Loại bỏ chọn tài xế đầu danh sách và container mẫu làm dữ liệu vận hành. Danh sách chuyến và live fleet được giới hạn phía server theo tài xế đăng nhập.
7. Tài xế gửi Pre-trip có shipmentId, driverId, vehicleId. Server đối chiếu lệnh được giao. API lỗi không tạo chứng nhận đạt ở local. Biên bản không đạt vẫn được lưu theo cơ chế hiện có.
8. Dispatcher xác nhận xuất bến container sau các bước kiểm soát. Tài xế xác nhận khởi hành trong khoang lái. Server kiểm tra lại lệnh, hồ sơ, biên bản gần nhất đúng bộ ba và xác nhận xuất bến container. Xe chuyển IN_TRANSIT, tài xế ON_TRIP, chuyến EN_ROUTE. Dispatcher không tự start khi tạo lệnh.

Chính sách Pre-trip tối đa 24 giờ là **chính sách nội bộ trong bản sửa**, chưa phải quy định pháp luật được viện dẫn. Cần xác nhận theo ca làm việc thực tế. Việc đọc và cập nhật liên dịch vụ ở trên phụ thuộc cấu hình **dùng chung PostgreSQL hiện có**. Khi tách database từng service, phải thay các adapter JDBC/view bằng hợp đồng API/event, reservation owner và cơ chế phục hồi phân tán.

## Căn cứ GPLX và giờ lái

- [Luật 36/2024/QH15, điều 57, 59 và 89](https://xaydungchinhsach.chinhphu.vn/toan-van-luat-trat-tu-an-toan-giao-thong-duong-bo-119240909105718285.htm) dùng làm căn cứ hạng CE cho đầu kéo sơ mi rơ moóc, tuổi cấp CE tối thiểu 24, chuyển tiếp GPLX FC đã cấp trước 01/01/2025.
- [Văn bản hợp nhất 55/VBHN-VPQH năm 2026](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/3/55-vbhn-vpqh.pdf), điều 64 đã sửa bởi Luật 118/2025/QH15, hiệu lực 01/07/2026. Giới hạn lái liên tục 4 giờ vẫn áp dụng; thời gian làm việc ngày/tuần theo Bộ luật Lao động. Bản sửa không dùng ngưỡng 10 giờ/ngày như một kết luận pháp luật hiện hành.
- Bộ đếm HOS hiện là số liệu nội bộ. Chưa chứng minh độ mới, thời gian nghỉ, lịch sử ngày/tuần, làm thêm hoặc tích hợp thiết bị. Không được coi hồ sơ đạt trong ứng dụng là kết quả xác minh trực tiếp với cơ quan cấp GPLX.
- Tham khảo [Samsara TMS compliance](https://developers.samsara.com/docs/tms-compliance) để phân biệt hồ sơ nhân sự với nguồn giờ lái sẵn có; [Geotab GeoDocs](https://marketplace.geotab.com/solutions/geodocs) cho nhóm hồ sơ và chứng từ. Chưa kết nối tài khoản hoặc mua dịch vụ của các nhà cung cấp.

## Quản lý dữ liệu nội bộ

Mở `/admin/data` bằng ADMIN. Hai nguồn quan sát độc lập:

- `GET /api/v1/admin/system/data` trả số lượng từ 22 tập dữ liệu PostgreSQL theo danh sách bảng cố định. Có số tài xế chờ duyệt, GPLX quá hạn, hồ sơ không đạt đối chiếu, tài khoản đã xóa, sự kiện chờ phát và Saga chưa kết thúc. Không tải toàn bộ hồ sơ nhạy cảm về trình duyệt để đếm.
- `GET /api/v1/admin/system/health` đọc registry Eureka và thử Actuator health cho 12 service dự kiến. Có UP, DEGRADED, DOWN, NOT_REGISTERED, CHECK_FAILED, CHECK_TIMEOUT. Identity đã bật fetch-registry khi Eureka client được bật. Cần `EUREKA_CLIENT_ENABLED=true` và registry đang hoạt động để có số liệu runtime.

22 nguồn gồm tài khoản, nhân sự, chi nhánh, công ty, tài xế, phương tiện, container, manifest, vận đơn, chuyến, sự cố, hợp đồng, thanh toán, thông báo, phiên bản tuyến, tính carbon, Pre-trip, ứng tuyển, hub, tài khoản hub, outbox và Saga. Một nguồn lỗi hiển thị riêng; không biến lỗi thành số 0.

**Chưa bao phủ** nội dung MongoDB chat, Redis session/cache, Kafka consumer lag, toàn bộ event history, log/audit tập trung, file/object storage, tài liệu đính kèm, backup retention và restore drill. Kiểm kê số dòng không xác nhận dữ liệu đầy đủ/đúng nghiệp vụ hoặc toàn bộ service đang chạy. Sơ đồ microservices người dùng gửi là mục tiêu tham khảo, không phản ánh database-per-service của repo hiện tại.

## Kiểm chứng và giới hạn

- Frontend build production, ESLint và bộ Vitest toàn dự án.
- Bộ Maven của Gateway, Identity, Asset, Routing, Shipment và Tracking chạy ở bản sao độc lập để tránh IDE Java ghi đè `target` trong lúc test.
- Bổ sung kiểm thử từ chối khởi hành bởi Dispatcher, tài xế đọc chuyến người khác và khởi hành thiếu Pre-trip; kiểm thử UI khi registry lỗi nhưng kiểm kê dữ liệu vẫn đọc được.
- Migration V042 và 10 tình huống hồ sơ được thực thi với PostgreSQL WASM/PGlite, gồm CE hợp lệ, sai hạng, FC sai ngày chuyển tiếp, quá hạn, chưa duyệt, sức khỏe chưa đạt, tài khoản khóa, đủ 4 giờ lái và CE thiếu tuổi. Đây là kiểm tra SQL, không thay cho nghiệm thu trên PostgreSQL/PostGIS thật.
- Docker daemon không truy cập được trong phiên này. Chưa chạy migration lên database thật, chưa kiểm thử hành trình bằng tài khoản thật và các thiết bị GPS/seal, chưa kiểm chứng khôi phục/timeout/concurrency qua HTTP.

Cách chạy lại SQL test, dùng thư mục tạm để không thêm dependency vào frontend:

```sh
npm install --prefix /tmp/ccadro-db-check @electric-sql/pglite
cp backend/db/tests/driver-qualification.mjs /tmp/ccadro-db-check/check.mjs
node /tmp/ccadro-db-check/check.mjs backend/db/migration/V042__driver_qualification_and_date_of_birth.sql
```

Các hạng mục vẫn cần nghiệm thu riêng gồm hoàn chuyến/ePOD và giải phóng tài nguyên thống nhất, hủy/đổi phân công, ownership mọi API chi tiết container, ingestion GPS thật, độ mới HOS, phục hồi outbox và reservation sau lỗi. Không kết luận hệ thống đã vận hành khép kín chỉ từ build/unit test.
