# Kiểm tra UI quản lý container (local)

Truy cập `http://localhost:5173/containers` bằng tài khoản test local
`dispatcher` / `123`. Dữ liệu được đọc từ API và PostgreSQL, không có cơ chế
thay lỗi API bằng dữ liệu giả trên frontend.

## Những thay đổi

- Card tạo container độc lập, chia nhóm định danh / công ty, tải trọng,
  niêm phong / thiết bị giám sát; nút Hủy và Tạo hồ sơ rõ ràng.
- Thêm hàng hóa cũng dùng card riêng, có thông tin cơ sở nhận, người nhận,
  tọa độ giao, SLA và nhiệt độ yêu cầu khi bật chuỗi lạnh.
- Tìm kiếm / lọc trạng thái có nhãn, focus và nút xóa bộ lọc; giữ native select
  cho bàn phím và điện thoại, bỏ giao diện select mặc định của Safari.
- Các tab Thông tin, Hàng hóa, Lộ trình, Kiểm soát theo đợt, Kết nối và
  Checklist hồ sơ phân loại riêng dữ liệu, hành động và lịch sử; trạng thái
  container không gộp với trạng thái từng mã hàng. Danh sách ưu tiên container
  đang vận chuyển, sau đó sắp theo thời điểm cập nhật.
- Tab Lộ trình kiểm tra vận đơn/tọa độ/tải trọng trước khi gọi API, hiển thị
  từng phương án theo nhà cung cấp, khoảng cách, thời gian, nhiên liệu/CO₂ ước
  tính; dispatcher ghi chú và chốt để tạo phiên bản hiệu lực, xem lịch sử.
  Kết quả mô phỏng bị phân biệt và không thể chốt chính thức. Chi tiết khảo sát
  provider và các giới hạn xe tải nằm trong `CONTAINER_WORKFLOW_RESEARCH.md`.
- Khi một danh mục phụ bị lỗi, vẫn hiển thị container đã tải thành công.
  Lỗi manifest có nút thử lại và checklist không tự coi dữ liệu lỗi là rỗng.
- Bố cục tự xếp cột trên điện thoại, không ép khung chi tiết rộng cố định.

## Bộ dữ liệu mẫu

Chạy xem trước hoặc thêm dữ liệu vào **Docker local**:

```sh
python3 scripts/seed-container-ui-demo.py
python3 scripts/seed-container-ui-demo.py --apply
```

Script chỉ thêm bản ghi, có transaction, khóa khi seed, kiểm tra dữ liệu nền,
không ghi đè dữ liệu cũ, không chạy tự động lúc khởi động service. Chạy lại
không sinh bản ghi trùng. Mã `DEMU` là định danh mô phỏng theo cấu trúc có số
kiểm tra, không phải tuyên bố mã chủ sở hữu BIC đã đăng ký. Người, biển số,
chữ ký và POD mẫu không có giá trị vận hành / chứng từ thực tế.

| Container | Trạng thái | Công ty phụ trách | Hàng hóa |
| --- | --- | --- | --- |
| DEMU0000016 | Sẵn sàng | VINAMILK | Chưa đóng hàng |
| DEMU0000021 | Đã phân công | SAMSUNG_VN | 2 mã hàng điện tử / đóng gói |
| DEMU0000037 | Đang vận chuyển | VINAMILK | 3 mã hàng lạnh; 3.600 kg; 300 kiện |
| DEMU0000042 | Đã giao | VINAMILK | 2 mã hàng; có ePOD mô phỏng |
| DEMU0000058 | Bảo trì | VINAMILK | Không phân công vận chuyển |

Vận đơn, xe, tài xế và chuyến đi của các trường hợp có phân công cũng được
thêm để liên kết đúng dữ liệu. Các bản ghi đang có trước đó được giữ nguyên;
UI sẽ chỉ rõ thông tin còn thiếu ở những hồ sơ cũ.

## Phạm vi checklist

Kiểm tra 11 nhóm: hồ sơ thiết bị, biển an toàn CSC, công ty, xe / tài xế, vận đơn / hành trình,
mã hàng / cơ sở giao, tải trọng, niêm phong, chuỗi lạnh, GPS / IoT, ePOD.
Các kết quả là **Đã có thông tin**, **Cần bổ sung**, **Chưa xác định** hoặc
**Không áp dụng**. ePOD chỉ bắt buộc khi trạng thái là Đã giao. Container đã
giao có thể mở niêm phong. API có thời điểm nhận riêng cho GPS, ETA và từng
nhóm cảm biến; UI không xem giá trị chưa có timestamp là dữ liệu hiện hành.
Chi tiết vận đơn hiển thị hạn giao, lịch lấy hàng, tải khai báo, manifest và
cảnh báo sai lệch tải trọng. CSC có thể bổ sung cho hồ sơ cũ; ngày kiểm tra chỉ
cảnh báo quá hạn khi khai báo rõ PES hoặc ACEP.

Đây là checklist đầy đủ dữ liệu hồ sơ, **không phải phê duyệt an toàn trước
chuyến, kiểm định lạnh hay điều kiện xuất bến do backend xác nhận**. Thanh
trạng thái hiển thị trạng thái hiện tại, không bịa ra lịch sử hoặc thời điểm
chuyển trạng thái. UI thêm hàng chỉ mở ở Sẵn sàng / Đã phân công.

## Sửa tích hợp backend

- Gateway cho DISPATCHER / SAFETY_MANAGER đọc đúng hai endpoint danh mục cơ
  sở và manifest cần thiết. Không mở thêm quyền điều phối hub, phân công
  shipper hay sửa/xóa manifest qua nhóm endpoint hub.
- Mapper của asset-service ánh xạ tường minh ba trường E-Seal: JavaBeans
  getter `getESeal…` và tên trường builder `eSeal…` khác nhau, trước đây
  MapStruct bỏ sót chúng ở cả chiều tạo và trả hồ sơ.
- Giữ hợp đồng JSON hiện tại (`esealNumber`, `esealStatus`,
  `esealIntegrityPct`); frontend đọc được cả dạng này và `eSeal…`.

## Kiểm tra

```sh
cd frontend
npm test -- --maxWorkers=2 --minWorkers=1
npm run build
npx eslint src/systems/operations/features/containers src/test/ContainerManagementPage.test.jsx --ext js,jsx --max-warnings 0
```

Có test cho lọc, card thêm mới và payload số, lỗi từng danh mục, lỗi lưu,
manifest lỗi / thử lại, phản hồi đến muộn khi đổi container, chuỗi lạnh,
quá tải và ePOD thiếu. Gateway test kiểm tra cả quyền đọc được mở và quyền
ghi hub vẫn bị chặn; mapper test giữ đủ E-Seal qua DTO / entity / JSON.

## Kết quả xác minh local ngày 20/11/2026

- Frontend: 100/100 test toàn bộ dự án đạt; 17/17 test riêng màn hình container
  được chạy lại sau chỉnh sửa cuối; build production thành công.
- Backend: 18/18 test gateway và 10/10 test asset-service đạt; hai service đã
  được đóng gói và khởi động lại với bản sửa.
- Đăng nhập Dispatcher: 5 API đọc cần thiết trả 200; tạo container kèm E-Seal,
  thêm mặt hàng và đọc lại manifest thành công. Bản ghi kiểm thử tạm đã xóa.
- Quyền hub ngoài phạm vi vẫn 403; truy cập container ẩn danh là 401;
  tài liệu nội bộ qua gateway là 404.
- Chromium thực tế: đã xem cả 5 hồ sơ mẫu, chế độ sáng / tối và mobile
  390px; không có lỗi JavaScript hoặc tràn ngang trên màn hình container.
  Font input mobile 16px; form rộng 366px trong viewport 390px.
- Seed lặp lại vẫn đúng 5 container mẫu / 7 mã hàng, tổng 11 container cùng
  6 hồ sơ cũ. Các ảnh và kết quả kiểm tra API nằm trong thư mục local được
  git-ignore: `logs/container-ui-review/`.
- ESLint phạm vi module container đạt. ESLint toàn dự án còn lỗi `no-empty`
  tại `frontend/src/shared/components/ErrorReportModal.jsx:45` và các cảnh báo
  import không dùng trong nhóm trang lỗi đang được chỉnh sửa riêng; không
  sửa các file đó trong thay đổi container này.
