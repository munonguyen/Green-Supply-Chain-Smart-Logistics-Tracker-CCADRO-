# Hồ sơ thanh toán và email hợp đồng

## Phạm vi đã triển khai

Code hiện tại là hệ thống microservices Spring Boot sau API Gateway, có các dịch vụ
identity, asset, shipment, routing, tracking, carbon, incident, notification, payment
và hub-shipper. Các dịch vụ hiện dùng chung PostgreSQL; chưa có database độc lập
cho từng dịch vụ. Tính năng này giữ cấu trúc hiện tại, giao tiếp payment → notification
qua HTTP nội bộ và lưu hàng đợi bền vững trong PostgreSQL, không phụ thuộc Redis/Kafka.

1. Gateway loại bỏ header danh tính do client gửi, lấy username/email từ identity.
   Email nhận hồ sơ được gắn với giao dịch khi tạo; client không được thay bằng email
   trong JSON. Việc này xác nhận nguồn email là tài khoản, chưa xác minh quyền sở hữu hộp thư.
2. Khi giao dịch chuyển sang `PAID`, payment lưu snapshot và hàng đợi gửi trong cùng
   transaction với thanh toán. Snapshot lỗi thì transaction rollback; lỗi gửi email
   sau đó không đảo ngược thanh toán.
3. Snapshot gồm thông tin pháp nhân theo cấu hình, khách hàng, số tiền, phương thức,
   nguồn xác nhận, mã đối soát, hợp đồng của cùng khách hàng/vận đơn và sự kiện SLA.
   Nếu không có hợp đồng phù hợp, ghi `NOT_LINKED`; không tự tạo hoặc ký hợp đồng.
4. Relay chuyển nguyên nội dung sang inbox của notification bằng event UUID ổn định.
   Notification kiểm tra SHA-256 và chống nhận trùng. Hai worker dùng khóa PostgreSQL
   `FOR UPDATE SKIP LOCKED` để tránh xử lý đồng thời cùng bản ghi.
5. Notification gọi Brevo và lưu lịch sử từng lần gửi. Email chứa HTML cùng ZIP:
   `evidence.json`, `confirmation.html`, `checksums.txt`. ZIP dùng vì Brevo hỗ trợ ZIP,
   không hỗ trợ JSON như tệp đính kèm độc lập.
6. Người sở hữu giao dịch hoặc ADMIN có thể lấy bản lưu qua
   `GET /api/v1/payments/{transactionCode}/evidence`; màn hình thanh toán cho tải
   HTML/JSON từ đúng nội dung đã lưu. ADMIN được yêu cầu thử lại khi gửi lỗi qua
   `POST /api/v1/payments/{transactionCode}/evidence/retry`.

## Trạng thái và độ tin cậy

| Trạng thái | Ý nghĩa |
| --- | --- |
| `PENDING` | Đã lưu bền vững, chờ chuyển/gửi; vẫn giữ chờ khi chạy sandbox |
| `QUEUED` | Notification đã nhận hồ sơ; xem thêm `emailDelivery.status` |
| `PROVIDER_ACCEPTED` | Nhà cung cấp trả message ID; chưa chứng minh đã phát đến hộp thư |
| `FAILED` | Hết số lần thử; ADMIN có thể yêu cầu thử lại |
| `REVIEW_REQUIRED` | Timeout, phản hồi trùng hoặc thiếu message ID; cần đối soát provider trước khi xử lý |
| `BLOCKED_NO_RECIPIENT` | Giao dịch không có email nhận; không giả lập gửi thành công |
| `STATUS_UNAVAILABLE` | Tạm thời không đọc được trạng thái từ notification |

Snapshot và nội dung email được bảo vệ bằng trigger cấm UPDATE/DELETE nội dung;
lịch sử gửi chỉ cho INSERT. Đây là bảo vệ ở mức ứng dụng/database, không phải lưu trữ
WORM độc lập: tài khoản DBA có thể thay đổi trigger. Cần backup và phân quyền DB phù hợp.
SHA-256 giúp đối chiếu nội dung, không phải chữ ký số có chứng thư hoặc dấu thời gian tin cậy.
Hồ sơ không thay thế hóa đơn điện tử thuế, bản hợp đồng đã ký hợp lệ hay ePOD gốc.
Thanh toán không tự động ghi nhận nghiệm thu hoặc từ bỏ quyền khiếu nại.

Webhook lặp không tạo hồ sơ mới. Relay có thể gửi lại nhưng inbox nhận idempotent.
Brevo nhận cùng `headers.idempotencyKey` theo event UUID. Không cam kết gửi email
exactly-once: tiến trình có thể dừng sau khi provider nhận nhưng trước khi commit DB;
cửa sổ chống trùng của provider có giới hạn. Timeout được giữ `REVIEW_REQUIRED`
để tránh tự gửi lại khi chưa biết kết quả.

## Cấu hình vận hành

Các biến mẫu có trong `.env.example`; không đưa khóa thật vào Git.

| Biến | Mục đích |
| --- | --- |
| `CCADRO_INTERNAL_TOKEN` | Bí mật chung payment/notification, bắt buộc cho giao tiếp nội bộ |
| `NOTIFICATION_SERVICE_URL` | Địa chỉ notification mà payment truy cập được |
| `CCADRO_LEGAL_NAME`, `CCADRO_LEGAL_TAX_CODE`, `CCADRO_LEGAL_ADDRESS` | Pháp nhân phát hành thực tế |
| `CCADRO_LEGAL_SUPPORT_EMAIL`, `CCADRO_LEGAL_RESPONSE_TIME` | Đầu mối khiếu nại và thời hạn phản hồi do doanh nghiệp cung cấp |
| `CCADRO_BREVO_API_KEY` | Khóa Transactional Email của Brevo |
| `CCADRO_EMAIL_SENDER`, `CCADRO_EMAIL_SENDER_NAME` | Địa chỉ gửi đã xác thực và tên doanh nghiệp |
| `CCADRO_EMAIL_MODE` | `LIVE` cho gửi thật, `SANDBOX` để giữ hồ sơ chờ; `AUTO` gửi khi có khóa |
| `CCADRO_EVIDENCE_MAX_ATTEMPTS`, `CCADRO_EVIDENCE_RETRY_SECONDS` | Số lần thử và khoảng cách thử lại; mặc định 10/60 giây |
| `CCADRO_PAYMENT_WEBHOOK_SECRET` | Bí mật cho callback HMAC của adapter hiện tại; để trống sẽ từ chối callback |
| `CCADRO_PAYMENT_ALLOW_INSTANT_CONFIRM` | Giữ `false` cho thanh toán thực |
| `VITE_DEMO_MODE` | Giữ `false` để frontend không thay lỗi API bằng sổ thanh toán cục bộ |

Thông tin pháp nhân thiếu được hiển thị là chưa cấu hình/chưa ghi nhận. Cấu hình mới
chỉ áp dụng cho hồ sơ tạo sau đó, không viết lại bản lưu cũ. Các giao dịch PAID cũ
không được backfill tự động, vì không thể khôi phục chính xác hợp đồng tại thời điểm cũ.

Áp dụng Flyway V027 trước khi chạy code mới; không dùng Hibernate tạo/cập nhật schema.
Chạy `flyway:validate`, kiểm tra lịch sử migration rồi `flyway:migrate` với đúng biến
`POSTGRES_*` của môi trường. Không tự `repair`, reset DB hoặc đổi checksum của migration
đã chạy. V024 đã sửa tham chiếu `destination_hub`; V026 không còn reset mật khẩu demo.
Nếu môi trường khác đã áp dụng các migration đó, phải đối chiếu lịch sử riêng trước.
Script reset mật khẩu demo nằm ngoài Flyway ở `backend/db/demo/reset_demo_passwords.sql`.

Đường `/internal/payment-evidence/**` không có route public tại gateway; notification
kiểm tra token nội bộ và từ chối khi chưa cấu hình. Các cổng dịch vụ vẫn tin header
gateway: khi triển khai phải giới hạn truy cập trực tiếp từ bên ngoài, dùng mạng riêng
và TLS; không chỉ dựa vào việc ẩn đường dẫn.

## Kiểm chứng

- Unit tests kiểm tra quyền đọc, hash/escape HTML, nguồn email, sandbox, gửi lỗi,
  tệp ZIP và phản hồi provider không rõ ràng; frontend kiểm tra bỏ fallback PAID giả.
- `scripts/test-payment-evidence.py` chạy JAR payment/notification với PostgreSQL
  dùng riêng và mock Brevo tại localhost. Nó kiểm tra PAID qua webhook HMAC, callback
  lặp, chặn người khác đọc, retry sau 503, provider message ID, nội dung ZIP trùng hash
  và trigger từ chối sửa snapshot. Không gửi email ra ngoài.
- Script yêu cầu container riêng `ccadro-evidence-review`, DB `ccadro_review`, user
  `ccadro`, mật khẩu kiểm thử `evidence-review-only`, đã migrate V001–V027. Build JAR
  bằng `mvn -f backend/pom.xml -pl payment-service,notification-service clean package`
  rồi chạy `python3 scripts/test-payment-evidence.py`. Có thể dùng
  `CCADRO_REVIEW_JAR_ROOT` trỏ tới backend build tách biệt để tránh IDE ghi đè target.
- Chạy `make test`, frontend production build và `make smoke`. Smoke hiện có nhánh
  bỏ qua API khi server offline, nên kết quả đó không thay thế kiểm thử live gateway.

Kết quả ngày 16/11/2026: 39 test backend và 17 test frontend đạt khi chạy `make test`
trên bản sao nguồn có output build riêng; frontend production build đạt (còn cảnh báo
bundle lớn). PostgreSQL tạm migrate V001–V027 thành công, kiểm thử hai JAR và mock Brevo
ở trên đạt. `make smoke` đạt các bước hạ tầng nhưng bỏ qua API gateway đang offline.
Chưa gửi email thật, chưa áp dụng migration vào database ứng dụng hiện có.

Ngoài luồng email, bản sửa loại bỏ fallback vận đơn/tải trọng/quãng đường demo ở
các nhánh routing và carbon đã rà soát; chặn hub/shipper thiếu phân công; siết header
quyền cho quản lý người dùng và phê duyệt reroute. Đây chưa phải kiểm toán đầy đủ tất cả API.

## Những phần kiến trúc/nghiệp vụ cần tiếp tục

- Tách quyền sở hữu schema và tài khoản DB theo dịch vụ; các bảng hồ sơ/outbox thuộc
  payment, inbox/audit gửi thuộc notification. Hiện vẫn là shared database.
- Rà soát authorization toàn bộ API payment/contract/shipments theo khách hàng và hub;
  quyền mới của hồ sơ không có nghĩa mọi endpoint cũ đã được bảo vệ đầy đủ.
- Callback hiện là giao thức HMAC `transactionCode|amount` của ứng dụng, chưa phải
  chứng nhận tích hợp callback gốc của VNPay/PayOS. Adapter thực phải xác thực đầy đủ
  merchant, trạng thái, loại tiền, số tiền và chống replay theo hợp đồng provider.
- Cước/thuế/chiết khấu cần lấy từ báo giá đã phê duyệt phía server; endpoint tạo payment
  hiện còn nhận các tham số tính tiền từ client.
- Bổ sung email delivery/bounce webhook có xác thực, cảnh báo queue tồn, đối soát
  `REVIEW_REQUIRED`, backup/audit và chính sách lưu giữ dữ liệu.
- Để phát hành hợp đồng doanh nghiệp hoàn chỉnh: bổ sung pháp nhân hai bên, người đại
  diện/thẩm quyền, phiên bản điều khoản đã chấp thuận, phụ lục trách nhiệm/bảo hiểm,
  cơ chế ký số/dấu thời gian và quy trình tranh chấp được doanh nghiệp phê duyệt.
  Hiện tại là hồ sơ xác nhận giao dịch kèm bản chụp hợp đồng đang có trong hệ thống.

Tham chiếu provider: [Send transactional email](https://developers.brevo.com/reference/send-transac-email),
[Idempotency keys](https://developers.brevo.com/docs/heterogenous-versions-batch-emails).
