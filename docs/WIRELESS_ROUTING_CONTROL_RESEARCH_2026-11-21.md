# Kết nối không dây và kiểm soát đợt container

Ngày đối chiếu tài liệu hãng: 21/11/2026.

## Kết luận và phương án tham chiếu

Có thể nhận GPS không dây qua mạng di động; định tuyến là xử lý phần mềm sau khi nhận tọa độ và xác định đúng chuyến. GNSS/GPS lấy vị trí, mạng di động truyền dữ liệu. IMEI là định danh, không tự thiết lập kết nối hoặc chứng minh quyền sở hữu thiết bị.

Đối với đội đầu kéo: chọn kiến trúc tham chiếu Teltonika FMC234 có SIM dữ liệu 4G, lắp nguồn xe đúng hướng dẫn → Traccar nhận và giải mã giao thức Teltonika → dịch vụ chuyển đổi riêng → CCADRO HTTP JSON → Tracking của chuyến/tuyến hiện hành. Đây là đề xuất triển khai; chưa cài Traccar, adapter hoặc kết nối phần cứng. Không suy ra cấu hình FMC234 từ FMC920; dùng đúng hướng dẫn firmware/model khi triển khai.

- FMC234: LTE Cat 1, Bluetooth LE, nguồn 10–30 V, IP67 và pin dự phòng 1000 mAh theo tài liệu hãng. Kiểm tra biến thể băng tần, SIM/APN và phủ sóng thực tế với nhà mạng. Không cam kết thời lượng pin từ dung lượng danh định.
- Traccar liệt kê FMC234 với giao thức teltonika và cổng mặc định 5027. Cổng thực tế, TLS, firewall và xác thực phải được cấu hình cho triển khai cụ thể; không mở listener tùy tiện trên máy phát triển.
- Traccar hỗ trợ chuyển vị trí đã giải mã dạng JSON và header xác thực. JSON mặc định của Traccar không phải schema CCADRO: cần adapter, không trỏ thẳng forward.url vào cổng hiện có.
- Adapter cần ánh xạ thiết bị được quản lý vào credential CCADRO; tạo eventId UUID ổn định từ instance + thiết bị + position ID, giữ nguyên khi retry; chuẩn hóa UTC, tọa độ, đơn vị km/h, kiểm tra GPS hợp lệ; từ chối thiết bị không nằm trong danh mục ánh xạ. Không đưa khóa vào trình duyệt hoặc log.
- GPS xe chỉ là vị trí đại diện container khi đã xác nhận gắn cùng xe, vận đơn và tài xế. Tháo container khỏi xe phải dừng suy luận này. Hệ thống hiện chưa có cảm biến xác nhận gắn/tháo tự động.

Nếu cần theo container ngay cả khi nằm bãi hoặc chuyển qua nhiều đầu kéo: dùng thiết bị độc lập gắn container và nền tảng API, ví dụ Nexxiot Globehopper/Edge. Nexxiot công bố kết nối di động, GNSS và tích hợp API; cần dịch vụ, quyền API và đối chiếu model/gói báo cáo. Không coi tên sản phẩm trong dữ liệu demo là thiết bị đã được tích hợp.

Bluetooth LE phù hợp truyền cảm biến cự ly gần tới gateway có mạng. Không phải đường truyền xuyên Internet; không thêm nút “Bluetooth đã kết nối” khi chưa có gateway/protocol thực tế. Vỏ thép, vị trí lắp và điều kiện nhiệt/ẩm cần khảo sát tại hiện trường. Wi-Fi chỉ phù hợp khi thiết bị hỗ trợ và có vùng phủ; không mặc định phủ được hành trình đường bộ.

## Giới hạn hiện tại và cách nghiệm thu

Cổng hiện có: POST /api/v1/assets/device-ingest/{deviceId}, X-Device-Key; JSON eventId, observedAt, latitude, longitude, speedKmh. Chỉ GPS; chưa nhập nhiệt độ Bluetooth qua cổng này. Chỉ chuyển Tracking khi có một chuyến EN_ROUTE/DELAYED và route hiệu lực khớp ID phân công.

Localhost không truy cập được từ thiết bị ngoài máy chủ. Cần địa chỉ mạng triển khai phù hợp, HTTPS và cấu hình mạng trước khi thử vật lý. Ngưỡng freshness hiện là 2 phút/10 phút; chưa tùy chỉnh theo model. Gói quá 10 phút bị từ chối, trong khi tracker có thể lưu và gửi bù sau mất mạng: cần luồng nhập lịch sử riêng, không thay thời điểm cũ bằng thời gian hiện tại để vượt kiểm tra.

Nghiệm thu phần cứng: kiểm tra nguồn, SIM/APN, GNSS fix và đồng hồ; nhận gói thật; thử retry/duplicate và mất mạng; so tọa độ thực địa; thử sai credential; xác nhận gắn đúng chuyến và route; thử tháo container; thử nhiệt độ cảm biến riêng nếu sử dụng. Chưa thực hiện các kiểm tra phần cứng này.

## Kiểm soát theo đợt đã bổ sung

Màn hình hiển thị người mở, giờ mở, số bước, bước chờ, vận đơn, hành trình, ID liên kết xe/tài xế, hàng của vận đơn, số kiện, khối lượng/tải tối đa, seal, mốc GPS và ePOD. Đây là hồ sơ hiện tại, không phải chứng nhận đã đối chiếu thực tế.

Mỗi bước Chuẩn bị / Xuất bến / Trong hành trình / Bàn giao có hướng dẫn nghiệp vụ. Khi xác nhận mới, backend lưu evidence_json lấy từ dữ liệu máy chủ cùng người xác nhận, thời gian, checklist và ghi chú. Bản lưu gồm định danh phân công, manifest hiện hành, seal, Pre-trip phù hợp hoặc mốc GPS/nhiệt và ePOD tùy bước. Bản ghi cũ không được gán dữ liệu hiện tại làm bằng chứng quá khứ.

Các trạng thái, kết quả Pre-trip và ePOD trong bản lưu là dữ liệu đã khai báo, không tự chứng minh thực tế hiện trường hoặc hiệu lực pháp lý. Chưa có file ảnh kiểm tra độc lập, dữ liệu modem/SIM, RSSI, GNSS quality hay dữ liệu hãng đã kết nối.

## Nguồn chính hãng

- https://wiki.teltonika-gps.com/view/FMC234_General_description
- https://wiki.teltonika-gps.com/images/2/22/DS-FMC920.pdf
- https://wiki.teltonika-gps.com/view/FMC920_GPRS_settings
- https://wiki.teltonika-gps.com/view/Teltonika_Data_Sending_Protocols
- https://www.traccar.org/devices/
- https://www.traccar.org/forward/
- https://nexxiot.com/edge/
- https://nexxiot.com/globehopper/
