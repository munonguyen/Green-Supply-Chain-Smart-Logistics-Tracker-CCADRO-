# Rà soát bảo mật CCADRO — 19/11/2026

Cập nhật vận hành: đã restart và kiểm tra local sau lượt thay đổi; xem `LOCAL_RUNTIME_VERIFICATION.md`. Các số liệu trước restart bên dưới được giữ làm lịch sử kiểm tra.

## Kết luận

**Chưa đủ điều kiện triển khai production.** Hệ thống có xác thực tập trung, BCrypt, quản lý phiên, blacklist và một số kiểm soát nghiệp vụ tốt, nhưng việc xác thực tại ranh giới service và quyền truy cập từng bản ghi chưa đồng đều. Hiển thị 404 trên frontend hoặc chặn URL tại gateway không giải quyết các thiếu sót này.

Đã rà soát cấu hình/routing của 13 module Maven, các luồng xác thực/phân quyền chính, frontend, cấu hình Docker và thực hiện HTTP probe trên môi trường local. Đây là rà soát code kết hợp kiểm thử có mục tiêu, **không phải chứng nhận an toàn, pentest toàn diện hay kiểm toán hạ tầng production**. Không thực hiện thao tác tài chính, gửi email, xóa dữ liệu nghiệp vụ hoặc dò mật khẩu hàng loạt.

Phải phân biệt ba trạng thái:

- Tài khoản test: đã cập nhật database local và kiểm tra bằng API thật.
- Bản sửa code: đã kiểm thử trên bản sao source/build độc lập để tránh xung đột với IDE đang biên dịch.
- Các tiến trình BE hiện tại: chưa được restart trong đợt này; kết quả HTTP bên dưới phản ánh các tiến trình đang chạy, không chứng minh bản sửa mới đã được triển khai.

## 1. Các phát hiện cần xử lý

Mức độ dưới đây là ưu tiên triển khai trong dự án, không phải điểm CVSS.

| Mã | Ưu tiên | Phát hiện và bằng chứng | Trạng thái / hướng xử lý |
|---|---|---|---|
| SEC-01 | P0 trước khi mở mạng | Gọi trực tiếp asset/shipment/tracking/notification không có token vẫn nhận HTTP 200. Nhiều module không có filter xác thực tại service và tin `X-Auth-*` do gateway truyền. | Chưa khắc phục đầy đủ. Mặc định loopback giúp thu hẹp truy cập cùng máy; khi chạy phân tán phải cô lập mạng, xác thực service gọi vào, và chỉ tin identity có thể kiểm chứng. Không coi header hoặc CORS là bằng chứng danh tính. |
| SEC-02 | P0 trước khi phục vụ nhiều công ty | Quyền theo URL chưa đủ: `AssetController.getContainers` không nhận danh tính công ty; `TrackingController.getAllTrips` nhận `driverId` từ query, không buộc khớp tài xế đang đăng nhập. Các endpoint thanh toán/hợp đồng danh sách và chi tiết chưa thống nhất kiểm tra owner. | Chưa sửa toàn bộ. Áp dụng policy theo actor, công ty, hub, tài xế và quan hệ tới bản ghi ngay trong use case; repository phải truy vấn trong phạm vi đã được cho phép. Kiểm tra cả list/detail/export/SSE/write, không chỉ UI. |
| SEC-03 | P1 | Frontend lưu access và refresh token trong `localStorage`; BE vừa đặt HttpOnly cookie vừa trả refresh token trong JSON. Driver SSE còn gửi JWT qua query `?token=`, có thể đi vào access log. Nguồn: `frontend/src/hooks/useLiveIdentity.js`, `frontend/src/services/api.js`, `DriverTerminalPage.jsx`, `identity/.../controller/AuthController.java`. | Chưa chuyển cơ chế lưu token. Hướng sửa: refresh token chỉ trong HttpOnly/Secure cookie, access token trong bộ nhớ hoặc BFF; SSE dùng credential/ticket riêng hạn ngắn, không JWT dài hạn trong URL; thiết kế đồng bộ refresh, logout, nhiều tab và CSRF trước khi thay. Cookie hiện phụ thuộc `request.isSecure()`: phải xác minh cấu hình TLS proxy. |
| SEC-04 | P1 | Chính sách tạo/đổi mật khẩu hiện vẫn cho tối thiểu 3 ký tự trong `AuthenticationService`, các DTO đăng ký/tạo tài khoản. Khóa 5 lần sai/15 phút có nhưng chưa thấy rate limit phân tán theo IP/tài khoản cho mọi endpoint. | Mật khẩu `123` chỉ phục vụ fixture local trong phần 6. Chưa có chính sách mật khẩu production tách riêng; cần bổ sung, kiểm tra mật khẩu phổ biến, chống credential stuffing và MFA cho quyền cao. Không hạ chính sách production để phục vụ demo. |
| SEC-05 | P1 | Refresh rotation có lưu current/previous hash và thu hồi family khi reuse, nhưng `UserSessionRepository` không có khóa/version chống hai request rotation đồng thời; chỉ giữ một thế hệ hash cũ. | Chưa chứng minh an toàn với cạnh tranh đồng thời hoặc replay nhiều thế hệ. Cần khóa/compare-and-swap ở persistence, lưu lịch sử token đã dùng có hạn, kiểm thử hai request song song và nhiều tab. |
| SEC-06 | P1 | Token trước đây chỉ được kiểm chữ ký/hạn dùng, thiếu ràng buộc issuer/algorithm/claim. Phiên không còn trong DB có thể vẫn được introspect chấp nhận. | Đã sửa code, có regression test. Vẫn cần chuẩn hóa token profile/audience/type, quản lý vòng đời khóa và triển khai bản mới. |
| SEC-07 | P1 | Gateway đang chạy vẫn trả 200 cho `/actuator/health` và `/v3/api-docs`. Các service trước đây bật docs và health detail mặc định. | Code gateway chặn bề mặt kỹ thuật bằng 404; cấu hình service đã opt-in docs và ẩn health detail. Cần rebuild/restart và probe lại; actuator metrics/info vẫn phải được bảo vệ bằng mạng hoặc xác thực ở từng service. |
| SEC-08 | P1/P2 theo bề mặt | `npm audit` báo 8 package entries có cảnh báo: 2 critical, 1 high, 5 moderate. Phần critical/high nằm trong chuỗi công cụ dev/test; runtime dependency scan còn 2 moderate thuộc react-router/react-router-dom. | Chưa nâng major tự động. Cần nâng có kiểm thử tương thích; không mở Vite/Vitest UI ra ngoài mạng tin cậy. Kết quả audit không tự chứng minh app có thể bị khai thác ở production. Chi tiết phần 5. |
| SEC-09 | P1 | Môi trường Docker là cấu hình phát triển: mật khẩu DB mặc định, Redis/Mongo không cấu hình xác thực trong compose được kiểm tra, Kafka PLAINTEXT. DB credentials dùng chung giữa các service. | Không dùng compose này làm mẫu production. Tách DB role/schema theo service, secret manager, TLS/ACL, network policy, backup mã hóa và kiểm tra phục hồi. Chưa xác minh hạ tầng production. |
| SEC-10 | P2 | Nhánh demo frontend có thể tạo session cục bộ khi `VITE_DEMO_MODE=true`; local digest và route guard không phải kiểm soát truy cập dữ liệu. | Production phải tắt demo và kiểm chứng artifact build. Backend phải tiếp tục từ chối token giả dù UI cho hiển thị màn hình. |
| SEC-11 | P2 | Chưa có bằng chứng kiểm thử đầy đủ CSP/HSTS/security headers, redaction token trong log, CSRF khi dùng cookie, giới hạn kích thước/tần suất telemetry/chat/API, kiểm soát export/download và toàn bộ audit trail. | Phải kiểm tra tại reverse proxy lẫn ứng dụng. Không đánh dấu an toàn chỉ vì chưa thấy lỗi trong unit test. |
| SEC-12 | P2 | `AuthenticationFilter` đặt `onErrorResume` bên ngoài cả chuỗi downstream nên lỗi từ service nghiệp vụ có thể bị chuyển thành 401. | Cần phân biệt credential không hợp lệ với Identity unavailable và lỗi downstream 5xx, tránh client tự logout hoặc che nguyên nhân vận hành. Chưa sửa trong đợt này. |

Các bằng chứng SEC-02 cho thấy thiếu ràng buộc trong code; không suy diễn rằng mọi request đã trả dữ liệu của công ty khác. Ví dụ local chỉ có một chuyến trong lần probe, nên chưa chứng minh bằng dữ liệu thực rằng tài xế đọc được chuyến của người khác.

## 2. Những kiểm soát đang có và thay đổi đã hoàn thành

### Kiểm soát đã hiện diện

- Identity sử dụng BCrypt; JWT HS512 có thời hạn; refresh token ngẫu nhiên được lưu dưới dạng hash; có session DB, blacklist và cơ chế logout/thu hồi phiên.
- Introspection lấy role/scope từ user hiện tại trong DB, không chỉ dùng role cũ trong JWT.
- Identity có filter xác thực Bearer riêng và tái tạo trusted identity headers; gateway loại bỏ `X-Auth-*` và `X-Internal-Token` do client tự gửi.
- Hub có kiểm tra hub/shipper được gán, quyền auditor chỉ đọc và điều kiện POD; vẫn cần bảo vệ nguồn identity khi service được gọi trực tiếp.
- Chat xác thực qua Identity, kiểm tra thành viên cuộc hội thoại và sử dụng socket ticket một lần.
- Payment kiểm chữ ký HMAC callback bằng so sánh constant-time, kiểm số tiền, có xử lý callback đã PAID và chặn trạng thái REFUNDED; thao tác confirm/refund thủ công yêu cầu ADMIN. Đây chưa phải xác nhận tương thích chữ ký/replay của mọi nhà cung cấp thanh toán thật.
- CORS sử dụng origin cụ thể; các port hạ tầng trong compose mặc định bind loopback. Đây là giảm bề mặt truy cập, không thay thế authentication/authorization.

### Bản sửa bổ sung trong đợt rà soát này

1. `identity/security/AccessTokenPolicy.java`: bắt buộc HS512, issuer `ccadro.com`, subject/JTI/iat/exp hợp lệ, kiểm tra iat/nbf và quan hệ thời gian. Chữ ký, expiry, blacklist tiếp tục được kiểm tra trong service.
2. `AuthenticationService.introspect`: khi dùng session repository, bắt buộc SID hợp lệ, session tồn tại, chưa thu hồi, chưa hết hạn, đúng username và user ID. Không chấp nhận session bị xóa/mất hoặc gắn với tài khoản khác.
3. Đăng nhập username không tồn tại trả lỗi xác thực 401 thay vì 404. Chưa tuyên bố loại bỏ toàn bộ user enumeration: thông điệp, timing và trạng thái khóa vẫn cần rà soát thống nhất.
4. `HubIamAccountService`: so khớp scope theo token phân tách bằng khoảng trắng; chuỗi như `ROLE_ADMINISTRATOR` không được nhận thành `ROLE_ADMIN`.
5. `ChatAuthenticationService`: từ chối phản hồi identity null/thiếu username/thiếu scope bằng lỗi phiên, tránh NPE hoặc tạo actor thiếu danh tính.
6. Cấu hình các service: `springdoc` chỉ bật khi `API_DOCS_ENABLED=true`; health detail đặt `never`.
7. Đồng bộ test frontend với trang 404 chung hiện tại; không yêu cầu trang từ chối quyền hiển thị thông tin role hay tự đăng xuất phiên hợp lệ.
8. Driver SSE đăng ký lại khi token thay đổi, đóng kết nối dùng token cũ; bổ sung dependency `token` cho effect hiện có.

Các sửa đổi giữ phạm vi nhỏ. Policy token nằm trong lớp security adapter; không đưa truy vấn DB/HTTP vào policy này. Cấu trúc hiện tại của toàn repository vẫn là các lớp controller/service/repository; đợt này **không chuyển toàn hệ thống thành Clean Architecture** và không coi việc đổi tên thư mục là hoàn thành kiến trúc đó.

## 3. Phạm vi theo module

| Module | Phần đã kiểm tra | Việc còn thiếu trọng yếu |
|---|---|---|
| api-gateway | Route public/private, Bearer, RBAC, forwarded headers, blacklist, docs/actuator | Triển khai bản mới, rate limiting, chính sách quyền chi tiết nhất quán |
| identity-service | Login/register, mật khẩu, JWT, refresh/logout, session, user/role/IAM | Mật khẩu production, MFA, concurrent refresh, token profile, kiểm tra từng endpoint quản trị |
| asset-service | Container/driver, API danh sách, driver self profile, cấu hình | Service authentication; tenant/owner policy cho container, driver, handover |
| shipment-service | Ranh giới API, danh sách shipment, cấu hình | Service authentication và quyền theo shipment/công ty |
| routing-service | Route/configuration/CORS | Xác thực service, quyền lệnh tính tuyến, chống abuse/SSRF theo nguồn dữ liệu |
| tracking-service | Trips, live fleet, telemetry/SSE, query filters | Buộc driver/company từ actor; áp dụng cả realtime; xác thực nguồn telemetry |
| carbon-service | Route/configuration/CORS | Quyền báo cáo/điều chỉnh theo công ty và xác thực service |
| incident-service | Route/configuration/CORS | Quyền sự cố/chứng cứ theo người phụ trách, xác thực service |
| notification-service | Anonymous list, internal command/evidence token, cấu hình | Bảo vệ toàn bộ đọc/ghi; quyền người nhận; service identity thống nhất |
| payment-service | Controller quyền cao, owner evidence, HMAC callback, trạng thái | Owner policy đồng nhất cho list/detail/checkout/contract; provider-specific verification |
| hub-shipper-service | Hub isolation, shipper assignment, POD, quyền chỉ đọc | Trusted actor boundary khi gọi trực tiếp service |
| chat-service | Introspection, conversation membership, ticket | Giới hạn abuse/payload và kiểm tra revoke trong vòng đời socket dài |
| eureka-server | Bind address, management config | Private network, xác thực registry/service registration khi triển khai phân tán |

## 4. HTTP probe trên tiến trình local đang chạy

Chỉ kiểm tra GET không thay đổi nghiệp vụ; token được cấp và logout cho đúng tài khoản test. Không ghi token hoặc nội dung dữ liệu cá nhân vào báo cáo.

| Caller | Port | Path | Quan sát |
|---|---:|---|---|
| Anonymous | 8888 | `/api/v1/assets/containers` | 401 |
| Anonymous | 8888 | `/actuator/health` | 200 — bản đang chạy chưa nhận bộ lọc mới |
| Anonymous | 8888 | `/v3/api-docs` | 200 — bản đang chạy chưa nhận cấu hình mới |
| Anonymous | 8081 | `/api/v1/assets/containers` | 200 |
| Anonymous | 8082 | `/api/v1/shipments` | 200 |
| Anonymous | 8084 | `/api/v1/tracking/trips` | 200 |
| Anonymous | 8087 | `/api/v1/notifications` | 200 |
| Anonymous | 8089 | `/api/v1/hub-shipper/workspace` | 403 |
| Anonymous | 8090 | `/api/v1/chat/conversations` | 401 |
| customer | 8888 | `/api/v1/assets/containers` | 200, 6 bản ghi; controller chưa có tenant filter |
| driver | 8888 | `/api/v1/tracking/trips` | 200, 1 bản ghi; chưa đủ dữ liệu để kết luận cross-driver bằng runtime |
| driver | 8888 | `/api/v1/assets/drivers` | 200, 8 bản ghi; cần tách self profile/danh bạ theo use case |
| hub_auditor | 8888 | `/api/v1/hub-shipper/workspace?hubCode=HUB-AMATA-BH` | 403 với hub khác hub được gán |

Probe payments/contracts qua gateway trả 401 trong môi trường này. Payment service không chạy tại thời điểm kiểm tra trước đó; không kết luận owner isolation đúng từ phản hồi này, vì gateway có thể chuyển lỗi downstream thành 401. Phần payment trong báo cáo dựa trên đọc code, chưa xác minh HTTP nghiệp vụ thật.

Chính sách status đích: API nghiệp vụ thiếu credential → 401; đã xác thực thiếu quyền → 403 hoặc 404 theo chính sách che tài nguyên; đường dẫn kỹ thuật không công bố qua gateway → 404. Trang 404 của React SPA không tự đổi HTTP status của HTML. Chi tiết: `ACCESS_BOUNDARY_SECURITY.md`.

## 5. Dependency audit và kiểm thử

Kết quả `npm audit --json` tại thời điểm rà soát, trên lockfile hiện có:

| Nhóm | Kết quả |
|---|---|
| Tất cả frontend dependencies | 8 package entries: 2 critical, 1 high, 5 moderate |
| Chỉ runtime (`--omit=dev`) | 2 moderate: `react-router`, `react-router-dom` |
| Critical/high của dev/test | `vitest`, `tinypool`, `vite`; tác động phụ thuộc cách chạy server/test và dữ liệu đầu vào |

Các entry bắc cầu có thể cùng trỏ một advisory, không được cộng thành số lỗ hổng độc lập. Router có cảnh báo redirect và SSR hydration; app hiện là SPA nên phải đánh giá điều kiện khai thác cụ thể, không suy diễn SSR đang được sử dụng. Không chạy `npm audit fix --force`: công cụ đề xuất thay đổi major ở các dependency trực tiếp.

Chưa chạy SCA/CVE toàn bộ Maven dependencies, quét container image, scan git history/secret toàn diện hoặc pentest XSS/SQLi/SSRF. Đây là phần còn lại của kiểm toán, không phải kết quả âm tính.

Kiểm thử đã chạy:

- BE: **42 test đạt**, 0 fail/error/skip, trong api-gateway, identity, asset, hub-shipper, chat. Bao gồm invalid issuer/algorithm/claims, session mất/hết hạn/bị thu hồi/sai owner, scope gần giống ADMIN, chat identity thiếu dữ liệu, gateway deny/headers và hub/driver isolation hiện có.
- FE: **17 test đạt** trong RequireRole, RoleIsolationAndTokenAuth, HubIamSecurity, LiveIdentity, ChatLoginRecovery. Có warning môi trường React/router trong test log; không phải assertion fail.
- API thật: **10/10 tài khoản** login thành công, role đúng, `/users/me` trả 200 và token sau logout bị từ chối 401.
- Script seed từ chối khi thiếu opt-in và khi `CCADRO_ENV=production`; đã kiểm tra cú pháp Bash/Python.
- Frontend ESLint đạt; production build đạt, còn warning bundle lớn hơn 500 kB. Đây là kết quả build/lint, không phải xác nhận đã xử lý hết các phát hiện bảo mật.

## 6. Tài khoản test local

**Mật khẩu chung: `123`.** Username chính xác là role viết thường, giữ dấu gạch dưới. Không đổi tên role trong database.

| Username | Role | Cổng giao diện |
|---|---|---|
| admin | ADMIN | `/portal` |
| dispatcher | DISPATCHER | `/portal` |
| driver | DRIVER | `/driver` |
| safety_manager | SAFETY_MANAGER | `/portal` |
| esg_auditor | ESG_AUDITOR | `/portal` |
| customer | CUSTOMER | `/customer` |
| shipper | SHIPPER | `/shipper` |
| hub_manager | HUB_MANAGER | `/shipper` |
| hub_shipper | HUB_SHIPPER | `/shipper` |
| hub_auditor | HUB_AUDITOR | `/shipper` |

Seed lấy company/hub/shipper binding từ fixture hiện có để dùng mã nghiệp vụ thật. Customer hiện gắn VINAMILK; hub_manager/hub_shipper gắn HUB-DINHBANG-BN. Mỗi role-test user được gán đúng một role. Các tài khoản tên khác được giữ nguyên. Session cũ của các role-test user bị thu hồi khi reset mật khẩu; cần đăng nhập lại.

Chạy lại có chủ đích tại local:

```bash
CCADRO_ENABLE_TEST_ACCOUNTS=true CCADRO_ENV=development bash scripts/setup-role-test-accounts.sh
python3 scripts/verify-role-test-accounts.py
```

Seed nằm ở `backend/db/demo/seed_role_test_accounts.sql`, **không nằm trong Flyway migrations và không được tự chạy lúc startup**. Hai cờ môi trường là chốt chống chạy nhầm, không phải cơ chế phát hiện/chứng minh database production. Không trỏ script vào database thật. Mật khẩu `123` không được dùng cho tài khoản thực tế hoặc dịch vụ công khai.

## 7. Thứ tự triển khai tiếp theo

1. Đóng bề mặt truy cập service/registry/DB bằng network policy; xác định trust model service-to-service và identity propagation có thể xác minh.
2. Thiết lập actor/context và policy theo tài nguyên tại use case; sửa container, trips/live/SSE, shipment, thanh toán/hợp đồng trước; thêm test ít nhất hai công ty/hai tài xế/hai hub cho từng thao tác.
3. Tách profile local/test khỏi production; tăng cường mật khẩu/rate limit/MFA; chuyển refresh cookie và bổ sung CSRF, concurrent rotation.
4. Nâng dependency theo kế hoạch có test; thêm Maven/container SCA, secret scan và kiểm tra artifact không bật demo.
5. Rebuild/restart có kiểm soát và chạy lại negative HTTP tests. Chỉ xác nhận triển khai an toàn sau khi cả source, runtime và hạ tầng đều đạt.

## 8. Nguồn nghiên cứu

- OWASP Microservices Security Cheat Sheet — kiểm soát tại edge/service, identity propagation và service-to-service authentication: https://cheatsheetseries.owasp.org/cheatsheets/Microservices_Security_Cheat_Sheet.html
- OWASP Authorization Cheat Sheet — deny by default, kiểm tra mọi request và quyền theo thuộc tính/quan hệ: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet — vòng đời phiên, cookie và rủi ro lưu credential trong Web Storage: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- RFC 9110 — nghĩa của 401/403/404: https://www.rfc-editor.org/rfc/rfc9110.html
- Advisory gốc được `npm audit` tham chiếu: Vite GHSA-4w7w-66w2-5vf9; Vitest GHSA-5xrq-8626-4rwp; Tinypool GHSA-85c8-ppgw-ccpr; React Router GHSA-wrjc-x8rr-h8h6 và GHSA-337j-9hxr-rhxg. Các ID dùng để đối chiếu, mức độ được lấy từ kết quả audit tại thời điểm chạy.
