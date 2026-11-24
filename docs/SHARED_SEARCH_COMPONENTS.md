# Component tìm kiếm dùng chung

`SearchField` là phần nhập tìm kiếm duy nhất trong `frontend/src/shared/components`.
`SearchToolbar` kết hợp chính `SearchField` với số kết quả và bộ lọc thùng rác.
Hai component chỉ hiển thị và phát sự kiện; chức năng lọc, phân quyền, debounce
và gọi API tiếp tục thuộc màn hình / hook nghiệp vụ.

## Sử dụng

```jsx
import { SearchField, SearchToolbar } from '@/shared';

<SearchField
  label="Tìm container"
  value={query}
  onValueChange={setQuery}
  placeholder="Mã container, công ty hoặc biển số…"
/>

<SearchToolbar
  label="Tìm vận đơn"
  value={query}
  onChange={setQuery}
  loading={loading}
  totalCount={shipments.length}
  matchedCount={filteredShipments.length}
  showDeleted={showDeleted}
  onToggleDeleted={setShowDeleted}
  deletedCount={deletedCount}
/>
```

`SearchField.onValueChange` và `SearchToolbar.onChange` nhận **chuỗi**, không
phải DOM event. Bấm nút xóa hoặc Esc phát chuỗi rỗng và trả focus về input.
Esc khi ô đã rỗng tiếp tục truyền đến dialog chứa nó. Enter giữ nguyên hành
vi submit của form. Không xử lý Esc để xóa trong lúc đang nhập bằng IME.

## Quy ước giao diện

- Nhãn mô tả đối tượng tìm kiếm; placeholder chỉ là ví dụ, không thay nhãn.
- `hideLabel` chỉ ẩn nhãn về mặt thị giác cho những vị trí như Messenger,
  không bỏ tên truy cập của input.
- Control cao 46px, nút xóa có vùng bấm 44 × 44px, góc bo thống nhất 10px.
- Icon, nội dung và nút xóa nằm trong flex flow, không đặt đè tuyệt đối.
  Số kết quả / thùng rác nằm ngoài input; không hiện badge tên engine.
- Width theo khung chứa, `min-width: 0`; không đặt chiều rộng tối thiểu cố
  định hoặc padding chừa chỗ cho số kết quả ở từng màn hình.
- Màu lấy từ theme tokens. `tone="blue"` dùng cho ngữ cảnh Messenger.
- Có focus ring, loading, error, hint, disabled, readOnly, ref và các thuộc
  tính native như `name`, `maxLength`, `autoFocus`, `aria-*`.
- Input mobile / thiết bị cảm ứng dùng font 16px. Bộ lọc thùng rác tự xuống
  hàng khi khung toolbar hẹp. Animation tuân theo reduced-motion.
- Chỉ đưa `totalCount` / `matchedCount` khi có dữ liệu thực; thiếu số liệu
  thì không tự hiện `0/0`. Khi đang tải, truyền `loading` để hiện trạng thái
  đang tìm thay số kết quả tạm thời.

## Phạm vi áp dụng

Đã chuyển 22 vị trí sang implementation dùng chung:

| Phân hệ | Vị trí |
| --- | --- |
| Điều phối | Container, vận đơn, hành lang, hệ số phát thải |
| Admin | Dashboard, tài khoản, công ty, chi nhánh, nhân sự, ứng tuyển |
| Customer | Container, tài xế, vận đơn, hợp đồng, giao dịch |
| Hub | Hàng hóa trong manifest, tài khoản trụ sở |
| Messenger | Danh sách hội thoại, danh bạ, nội dung trong hội thoại |
| Public | Tra cứu vận đơn, tìm phân hệ trên trang 404 |

`ElasticSearchBar.jsx` còn là entry point tương thích, re-export
`SearchToolbar`; không còn một implementation tìm kiếm riêng. Các màn hình
mới dùng `SearchField` hoặc `SearchToolbar`. Các props cũ `rounded`,
`minWidth`, `tookMs` không được chuyển vào DOM hoặc dùng để phá vỡ chuẩn.
Thuật toán tìm kiếm không dấu hiện tại được giữ nguyên.

ESLint chặn `<input type="search">` bên ngoài `SearchField.jsx` để tránh tạo
thêm control tìm kiếm với CSS riêng. Điều chỉnh layout ở khung chứa, không
ghi đè kích thước / border / padding nội bộ của component.

## Kiểm tra

```sh
cd frontend
npm test -- --maxWorkers=2 --minWorkers=1
npm run build
npx eslint src/shared/components/SearchField.jsx src/shared/components/SearchToolbar.jsx src/test/SearchField.test.jsx --max-warnings 0
```

Test riêng bao phủ nhãn / ID, chuỗi tiếng Việt, xóa và focus, Esc, IME,
Enter, ref / native props, lỗi / hint, loading, disabled / readOnly, số kết
quả bằng 0, bộ lọc thùng rác và tương thích entry point cũ. Ảnh kiểm tra local
được lưu trong `logs/search-ui-review/` (git-ignore).

## Kết quả xác minh ngày 20/11/2026

- 92/92 kiểm thử toàn bộ frontend đạt; gồm 17 ca riêng SearchField / SearchToolbar.
- Build production thành công; ESLint cho component, các màn hình tính năng
  được chuyển đổi và kiểm thử mới đạt. Rule ngăn input tìm kiếm riêng đã được
  kiểm tra bằng một đoạn JSX không hợp lệ qua stdin.
- Render trực tiếp component thực tế trong Chromium ở chế độ sáng / tối,
  chiều rộng 1280px / 390px / 320px: không tràn ngang, nút xóa không đè lên
  nội dung, không bị cắt nút, Esc xóa và giữ focus đúng. Ảnh trong
  `logs/search-ui-review/shared-component-*.png`. Đây là bộ minh họa trạng
  thái của component, không phải số liệu nghiệp vụ thật.
- Việc kiểm tra lại end-to-end với tài khoản thật trên mọi portal chưa hoàn
  tất vì gateway local hết thời gian phản hồi trong lượt xác minh cuối.
  Không thay thế phản hồi API lỗi bằng dữ liệu giả trong ứng dụng.
