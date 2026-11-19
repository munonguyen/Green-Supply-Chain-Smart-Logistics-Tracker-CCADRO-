# Chính sách bề mặt truy cập CCADRO

Rà soát ngày 19/11/2026. Đây là thay đổi code/cấu hình, chưa phải xác nhận triển khai production.

Cập nhật vận hành: đã restart và kiểm tra local sau lượt thay đổi; xem `LOCAL_RUNTIME_VERIFICATION.md`. Các số liệu trước restart bên dưới được giữ làm lịch sử kiểm tra.

## Phân biệt trang web và API

| Bề mặt | Chưa đăng nhập | Đã đăng nhập sai quyền |
|---|---|---|
| Trang nội bộ: `/driver`, `/portal`, `/containers`, `/admin/...` | Trang 404 chung | Trang 404 chung, không tiết lộ danh sách role |
| Cổng đối tác: `/customer`, `/shipper` | Chuyển tới `/login` | Trang 404 chung |
| API nghiệp vụ qua Gateway | HTTP 401 JSON + `WWW-Authenticate: Bearer` | HTTP 403 JSON |
| Đường dẫn kỹ thuật/nội bộ qua Gateway | HTTP 404 | HTTP 404, kể cả token ADMIN |

Trang React là SPA: hiển thị trang 404 **không đổi HTTP status của HTML** mà Vite/server tĩnh đã trả về (thường là 200). HTTP 404 ở gateway là status thật. Muốn HTTP 404 cho lần tải HTML cần server rendering hoặc reverse proxy có chính sách tương ứng. Không dùng route guard frontend làm hàng rào bảo mật dữ liệu.

API nghiệp vụ được UI nội bộ sử dụng vẫn phải đi qua Gateway có xác thực; không thể chặn tất cả API đó bằng 404 chỉ vì chúng thuộc phân hệ nội bộ.

## Các thay đổi

- `PublicSurfaceFilter` chạy ở lớp WebFlux trước định tuyến, phủ cả tài nguyên cục bộ của Gateway: chặn `/internal`, `/actuator`, API docs, Swagger, `/services/...`, lệnh email dành cho service, và các biến thể đường dẫn mơ hồ. Phản hồi 404 không chứa chi tiết và có `Cache-Control: no-store`.
- Swagger/OpenAPI trên Gateway bị tắt. Đọc tài liệu API qua môi trường phát triển riêng/private; không bật công khai để chữa lỗi truy cập.
- `AuthenticationFilter` không còn cho Swagger/Actuator qua theo phép so khớp chuỗi; public endpoints được giới hạn phương thức. Endpoint introspect phía gateway yêu cầu Bearer; lời gọi trực tiếp Identity giữa các service không đổi.
- Lọc mọi header `X-Auth-*` và `X-Internal-Token` từ client trước khi forward, rồi lấy danh tính/công ty từ token đã xác minh.
- Bearer sai định dạng bị từ chối; namespace chưa có trong chính sách RBAC mặc định bị từ chối với vai trò không phải ADMIN.
- Các service nghiệp vụ mặc định bind `127.0.0.1`. Có thể cấu hình `SERVER_ADDRESS`, nhưng khi chạy container phải đặt trên mạng riêng và chỉ publish gateway; không publish thẳng các cổng 8080–8091 ra Internet.
- Ngoại lệ có chủ đích: đăng nhập/refresh/logout/đăng ký, tuyển dụng công khai; webhook thanh toán xác thực tại Payment Service; Socket.IO dùng ticket một lần do Chat Service kiểm tra. Không thay cơ chế này bằng redirect HTML.

## Giới hạn và phần phải triển khai tiếp

1. Cô lập loopback là mặc định cấu hình cho môi trường cùng máy, không thay thế xác thực service-to-service. Nhiều service vẫn tin forwarded identity headers khi được gọi trực tiếp; cần mTLS hoặc service credentials và JWT validation tại mỗi service trước khi triển khai phân tán.
2. Chưa rà hết quyền theo từng bản ghi (IDOR/BOLA): driver phải chỉ xem chuyến được gán; khách hàng chỉ xem hàng của chính công ty. RBAC theo URL chưa chứng minh được điều này.
3. Triển khai thực tế cần HTTPS, firewall/private subnet, rate limit đăng nhập/API, quản lý secret và log không ghi token. Đợt này chưa thay hạ tầng đang chạy hoặc tự restart service.
4. Không coi localhost là nguồn tin cậy để bỏ xác thực; client có thể giả `X-Forwarded-For`, `Origin`, `Referer`.
5. Không kết luận nguyên nhân màn hình Safari trống chỉ từ ảnh; route guard mới có test riêng, nhưng lỗi runtime khi tài khoản hợp lệ vẫn cần log/browser để chẩn đoán nếu còn xuất hiện.

## Kiểm thử

- Gateway: anonymous API 401 JSON, sai role 403, header giả bị xóa, Bearer sai định dạng, deny namespace chưa phân loại, Swagger/Actuator/internal command 404 kể cả header ADMIN giả.
- Kiểm thử HTTP gateway dùng cổng ngẫu nhiên và service mock; không cần token thật hay gọi dữ liệu production.
- Frontend: anonymous nội bộ 404, external chuyển login, sai role không lộ role/account, đúng role render nội dung.

## Nguồn thiết kế

- RFC 9110 §15.5.2, §15.5.4, §15.5.5: 401 yêu cầu challenge, 403 thiếu quyền, 404 có thể dùng khi không muốn công bố tài nguyên. https://www.rfc-editor.org/rfc/rfc9110.html
- OWASP REST Security Cheat Sheet, Access Control và Management endpoints: không công khai management endpoint, hạn chế mạng/port và kiểm soát truy cập phía server. https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html

Nguồn định hướng kiến trúc; không thay cho kiểm thử xâm nhập và kiểm tra cấu hình môi trường thực tế.
