# Kiểm tra Container — chức năng độc lập

Mở menu **Kiểm tra Container** tại `/container-inspections`. Từ danh sách quản lý container, nút **Kiểm tra an toàn container** cũng mở trang này và chọn sẵn thiết bị tương ứng. Màn hình kiểm soát xuất bến chỉ đối chiếu kết quả và dẫn sang hồ sơ kiểm tra.

## Quy trình kiểm tra

1. Chọn container theo mã, loại hoặc trạng thái kiểm tra. Không cần gán vận đơn, xe, tài xế hay mở đợt xuất bến.
2. Bắt đầu một lần kiểm tra mới. Mỗi container có thứ tự lần kiểm tra riêng.
3. Chọn điểm trên mô hình để tới hạng mục. Xám: chưa đánh giá, xanh: đạt, đỏ: không đạt. Checklist riêng cho khô 20/40 feet, lạnh 20/40 feet, container sàn và mở nóc.
4. Ghi kết quả thực tế. Mục không đạt phải mô tả ít nhất 5 ký tự. Không tự xác nhận đạt từ GPS/cảm biến.
5. **Lưu tiến độ** giữ bản đang làm trong DB để rời trang và tiếp tục sau. Chỉ những thay đổi đã lưu được bảo toàn. Bản nháp có khóa phiên bản, từ chối ghi đè bởi một phiên sửa cũ.
6. **Hoàn tất đánh giá** chỉ khả dụng khi đủ mọi mục. Có lỗi là Không đạt; tất cả đạt là Đạt. Biên bản hoàn tất chỉ đọc, kiểm tra lại tạo lần mới và giữ nguyên lịch sử cũ.

Các trạng thái của hồ sơ thiết bị: Chưa kiểm tra, Đang kiểm tra (`DRAFT`), Hoàn tất · Đạt (`PASSED`), Hoàn tất · Không đạt (`BLOCKED`), Cần kiểm tra lại (`EXPIRED`, trạng thái hiển thị khi hết hiệu lực).

Container đang vận chuyển chỉ được xem hồ sơ; kiểm tra trực tiếp sau khi kết thúc chuyến. Container ở kho, đã phân công, bảo trì hoặc đã giao có thể lập kiểm tra độc lập.

## Đối chiếu trước xuất bến

Duyệt xuất bến và thao tác tài xế khởi hành đọc **lần kiểm tra mới nhất của container**, đúng loại, đúng phiên bản checklist và đạt trong 24 giờ. Không phụ thuộc lần kiểm tra đó có gắn đợt điều phối hay không. Bắt đầu bản nháp mới hoặc hoàn tất lần không đạt sẽ làm kết quả đạt trước đó không còn được dùng để xuất bến.

Biên bản kiểm tra thiết bị không thay thế Pre-trip của xe/tài xế, CSC, seal, tải trọng hay các điều kiện phân công khác. Bước duyệt xuất bến lưu ID biên bản đã đối chiếu vào bằng chứng của đợt.

## API và lưu trữ

- GET `/api/v1/assets/container-inspections`: danh sách container với trạng thái và tiến độ kiểm tra mới nhất.
- GET `/api/v1/assets/containers/{containerCode}/safety-inspections`: checklist, lần hiện tại và lịch sử thiết bị.
- POST cùng đường dẫn: `complete=false` lưu tiến độ, `complete=true` hoàn tất. Cập nhật bản nháp gửi `inspectionId` và `revision`. Không gửi `roundNumber` khi thực hiện độc lập; trường này chỉ còn là ngữ cảnh tương thích tùy chọn.

Backend xác định người kiểm tra từ header gateway đã xác thực. ADMIN, DISPATCHER và SAFETY_MANAGER có quyền. Client không được quyết định trạng thái tổng hợp hoặc số lần kiểm tra.

`ContainerSafetyInspection` lưu container, loại thiết bị, số lần kiểm tra, phiên bản checklist, các kết quả/ghi nhận, tiến độ, người thực hiện, thời điểm hoàn tất/cập nhật và phiên bản khóa đồng thời. Các trường liên kết đợt kiểm soát được phép để trống.

## Triển khai và xác minh

Áp dụng V049 rồi V050 trước khi chạy asset-service/tracking-service mới. Localhost đã được sao lưu, nâng DB tới V050 bằng Flyway và khởi động lại hai dịch vụ. Không xóa các biên bản đã có.

Kiểm thử backend: 66 test đạt. Frontend liên quan tới mô hình xe và hồ sơ kiểm tra: 45 test đạt; build và kiểm tra ESLint các file chức năng đạt. HTTP qua gateway xác minh đủ sáu loại: bắt đầu tại kho không có chuyến/đợt, lưu và tiếp tục bản nháp, chặn ghi đè phiên cũ, chặn hoàn tất thiếu mục và chặn sửa biên bản đã hoàn tất. Trình duyệt xác minh menu riêng, chọn điểm trên mô hình, tải lại vẫn giữ tiến độ và hoàn tất hồ sơ độc lập. Dữ liệu kiểm thử tạm được xóa sau xác minh.

Checklist là mẫu vận hành nội bộ cần đơn vị an toàn/chủ sở hữu hiệu chỉnh theo thiết bị và hàng cụ thể; không cấp chứng nhận CSC hay kết luận kiểm định pháp lý. Tham khảo [IMO/ILO/UNECE CTU Code](https://imo.org/en/ourwork/safety/pages/ctu-code.aspx), chương 8 về kiểm tra CTU trước đóng hàng. Mô hình là sơ đồ điều hướng, không phải bằng chứng kiểm tra thực địa.

## Giao diện tổ hợp xe

Sơ đồ hiển thị đầu kéo, cabin, bánh xe, khung sơ mi rơ moóc và container theo sáu loại thiết bị. Có hai góc nhìn Phối cảnh/Bên hông, bộ lọc điểm kết cấu/cụm lạnh, màu kết quả và điểm đang chọn. Mô hình là SVG tương tác trong giao diện; không phải mô hình 3D có thể quay tự do. Đầu kéo và rơ moóc cung cấp ngữ cảnh của tổ hợp; các điểm đánh giá được lấy từ checklist container, còn kiểm tra xe vẫn dùng Pre-trip.

Danh sách hạng mục có bộ lọc Tất cả/Chưa kiểm tra/Có lỗi. Bấm số trên xe mở card ngay cạnh vị trí đó trên máy tính hoặc bảng nổi phía dưới trên điện thoại, không cuộn trang hay thay đổi bộ lọc danh sách. Card cho chấm Đạt/Không đạt, nhập ghi nhận, lưu tiến độ và chuyển tới điểm chưa chấm tiếp theo. Kết quả đồng bộ với mô hình và checklist. Biên bản đã hoàn tất/lịch sử chỉ cho xem; có thể bắt đầu lần kiểm tra mới từ card của hồ sơ hiện tại. ESC hoặc nút đóng đưa focus về số đã chọn. Khi lỗi mạng hoặc xung đột lưu, ghi nhận đang nhập vẫn được giữ.
