# Khắc phục ADMIN — đợt 1 (17/11/2026)

Đã triển khai lớp nền về tính đúng đắn của dữ liệu và quyền truy cập từ báo cáo `ADMIN_BUSINESS_UX_REVIEW.md`. Đây là đợt 1; không coi toàn bộ 15 phát hiện đã hoàn tất.

## Đã sửa

- Live IAM lấy tài khoản, doanh nghiệp, role và permission từ Identity; đăng nhập không yêu cầu có user trong seed/localStorage. Giữ ID thực server trả về. Demo chỉ hoạt động khi bật `VITE_DEMO_MODE=true`.
- Tạo/sửa/khóa/mở khóa/reset password/xóa mềm/restore user và CRUD doanh nghiệp chỉ cập nhật UI sau khi server xác nhận. Lỗi được chuyển lên form. Quyền hiển thị theo role backend, không cho chỉnh checkbox override chưa được hỗ trợ. Cập nhật role gửi `roles` đúng contract.
- Identity xác minh JWT ở service boundary, thay header `X-Auth-*` bằng claims thật, chặn mutation user và catalog role/permission ngoài ADMIN. Hồ sơ chỉ đọc bởi owner hoặc ADMIN. `/users/me` hỗ trợ đọc và cập nhật các trường cá nhân cho chính chủ.
- Introspection đọc scope/hub hiện tại từ database để thay đổi role có hiệu lực khi kiểm quyền request tiếp theo.
- Checklist và incident không còn xác nhận thành công khi API lỗi. Không mặc định đạt checklist; chọn xe/tài xế/chuyến thật và nhập tọa độ. Nhãn checklist khớp tiêu chí dầu/dung dịch, cố định hàng hóa và cứu hộ của DTO. Bỏ các số điểm phạt giả khỏi màn hình.
- Bản Gateway mới trả CORS với origin cụ thể và credentials, đăng nhập Chrome thông thường đã thành công.
- Dashboard live bỏ điểm xếp hạng quy ước, dùng số đếm nghiệp vụ và báo nguồn tải lỗi; không giữ dữ liệu cũ khi server trả danh sách rỗng. SSE dùng token phiên hiện tại.
- Các toggle “chính sách hệ thống” chưa có backend được ghi rõ chưa hỗ trợ thay đổi trong live mode, không báo đã lưu chính sách vào hệ thống.
- Sidebar mobile thành drawer và mặc định đóng. Các entry điều phối/lập tuyến/GPS/carbon mở danh sách chọn đối tượng thật qua `/operations/*`, không dùng ID mẫu. `/governance` mặc định mở kiểm tra an toàn thay vì trùng IAM.
- Doanh nghiệp mới mặc định PENDING và hạn mức 0 trong form; không tự xác nhận KYC/hạn mức mẫu.

## Xác minh

- Backend Identity/Gateway: 17 test pass, gồm 3 ca mới về giả header và quyền CUSTOMER.
- Frontend: 47 test pass, gồm live IAM và ghi inspection/incident thất bại. Các test demo cũ bật demo một cách tường minh.
- Production build frontend thành công. Maven verify Identity/Gateway thành công.
- Chrome thông thường: đăng nhập; user chỉ có ở backend xuất hiện; giả lỗi 503 không tạo user local; Identity không JWT + header ADMIN trả 401; CUSTOMER đọc admin profile/role catalog trả 403; mobile nội dung rộng 390px.
- Bằng chứng: [verification.json](ui-review/admin-fixes/verification.json), [danh sách live](ui-review/admin-fixes/01-live-directory.png), [mobile](ui-review/admin-fixes/02-mobile.png).
- Đã cập nhật JAR Identity/Gateway và bật môi trường local. Khi Docker bị tắt, các chức năng dùng PostgreSQL/Redis sẽ không hoạt động dù JVM vẫn còn chạy.

## Công việc còn lại

1. Workspace tài sản/bảo trì đầy đủ, quy tắc availability thống nhất và chặn vô hiệu hóa xe đang có chuyến.
2. Hàng đợi thẩm định incident, quyết định demerit/blacklist có evidence và audit; quản lý ca UC15.
3. Xuất file carbon thật theo phạm vi, hash trên bytes file, tách estimate/actual.
4. Workflow KYC/hạn mức có bằng chứng, phê duyệt và lịch sử; chính sách hệ thống có API/version/audit.
5. Quyền truy cập tại các service nghiệp vụ khác vẫn cần rà soát; đợt này củng cố boundary của Identity, không tuyên bố toàn backend đã đầy đủ authorization.
6. Một số màn hình nghiệp vụ ngoài IAM còn fallback demo và thao tác lạc quan; cần tiếp tục loại bỏ trong live mode. Form đăng ký CUSTOMER hiện dùng contract backend hiện có; hồ sơ doanh nghiệp đầy đủ cần luồng riêng.

Không thay đổi dữ liệu user/role thật trong các ca thử lỗi; dùng browser context riêng và mock response 503 cho mutation thử nghiệm.
