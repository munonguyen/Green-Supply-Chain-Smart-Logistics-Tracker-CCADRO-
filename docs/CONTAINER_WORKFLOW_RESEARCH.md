# Hồ sơ và kiểm soát container

Màn `/containers` mở bảng tra cứu trước. Nút **Thông tin chi tiết** mở một hồ sơ toàn chiều rộng. Bố cục tham chiếu cách BookingCare mở hồ sơ theo yêu cầu và chia thành các tab nghiệp vụ. **Thông tin**, **Hàng hóa**, **Kết nối** và **Checklist hồ sơ** phục vụ tra cứu. **Kiểm soát theo đợt** gom thao tác và lịch sử ngay trong hồ sơ. [Danh sách bệnh nhân BookingCare](https://github.com/munonguyen/BookingCare/blob/main/FE/src/containers/System/Admin/patients/PatientManage.js) · [Bố cục hồ sơ EHR](https://github.com/munonguyen/BookingCare/blob/main/FE/src/containers/System/Admin/patients/PatientEHRModal.js)

| Giai đoạn | Thao tác và điều kiện |
| --- | --- |
| Chuẩn bị | Mở đợt, chọn vận đơn, xe, tài xế. Thêm và đối chiếu manifest của vận đơn hiện tại, tình trạng container, tải trọng và chằng buộc. |
| Xuất bến | Xác nhận xe và tài xế, kiểm tra trước chuyến, niêm phong, chứng từ và lộ trình. Máy chủ kiểm tra phân công và manifest trước khi chuyển container sang **Đang vận chuyển**. |
| Trong hành trình | Đối chiếu vị trí, tiến độ, bảo quản và sự cố. Ghi nhận kết quả kiểm soát trước khi tài xế nộp ePOD. |
| Bàn giao | Đối chiếu điểm đến, người nhận, niêm phong và số kiện. Hoàn tất đợt khi đã có ePOD. Điều phối hoặc quản trị có thể đưa container về **Sẵn sàng** để mở đợt sau. |

Checklist thao tác lưu tài khoản, vai trò, thời điểm, các mục đã đánh dấu và ghi chú. Các mốc đã lưu chỉ xem. Checklist hồ sơ tính độ đầy đủ của trường dữ liệu. Quy trình soạn theo các chủ đề kiểm tra container, đóng hàng và chằng buộc trong CTU Code. Doanh nghiệp cần đối chiếu quy trình nội bộ, loại hàng và quyền tại từng điểm bàn giao khi áp dụng thực tế. [IMO CTU Code](https://www.imo.org/en/OurWork/Safety/Pages/CTU-Code.aspx)

| Vai trò | Phạm vi trong luồng này |
| --- | --- |
| Điều phối và quản trị | Mở đợt, xác nhận checklist, phân công chuyến, tạo hồ sơ và khai báo hàng, đưa container về sẵn sàng sau bàn giao. |
| An toàn | Tra cứu hồ sơ, mở đợt và xác nhận các mục đã trực tiếp đối chiếu. |
| Tài xế | Gửi dữ liệu theo dõi và nộp ePOD qua màn tài xế hiện có. |
| Trụ sở và shipper | Xử lý từng kiện hàng theo luồng nhận và giao chặng cuối. |

Bàn giao container tại cơ sở là mốc cấp thiết bị. Mỗi kiện vẫn có trạng thái, cơ sở nhận, địa chỉ và người nhận riêng. Tên công ty ở mỗi kiện chỉ rõ đó là đơn vị phụ trách **vận chuyển container**. Hồ sơ chưa có xác nhận cũ giữ đúng dữ liệu đã lưu và chỉ bắt đầu đợt mới khi đang sẵn sàng hoặc đã phân công. DCSA tách các sự kiện hàng, chuyến vận tải và thiết bị trong chuẩn Track & Trace. [DCSA Track & Trace](https://dcsa.org/standards/track-and-trace)

Giao diện kiểm tra API mỗi 30 giây khi trang đang hiển thị và trình duyệt trực tuyến. Máy chủ lưu thời điểm nhận chung, GPS, vị trí dạng chữ, tiến độ, tốc độ, ETA và từng nhóm/giá trị cảm biến riêng. Một gói chỉ có GPS không làm mới thời điểm nhiệt độ, pin hay niêm phong. Dữ liệu có tuổi tối đa 2 phút được xem là mới, trên 2 đến 10 phút là chậm, trên 10 phút là mất cập nhật. Các ngưỡng là mặc định vận hành và phụ thuộc chu kỳ gửi thực tế. Máy chủ ghi thời điểm **nhận**, gồm dữ liệu từ trình mô phỏng nếu môi trường chạy mô phỏng. Giám sát phần cứng cần heartbeat từ gateway IoT và đối chiếu định danh thiết bị; sự kiện có thể đến lặp hoặc sai thứ tự. [AWS IoT lifecycle events](https://docs.aws.amazon.com/iot/latest/developerguide/life-cycle-events.html)

## Thông tin cần có để dispatcher đối chiếu

- Bảng danh sách tập trung trạng thái, đơn vị, xe, tài xế, vận đơn, tuyến, GPS, tiến độ, ETA và các mốc nhận dữ liệu riêng. Cần chú ý bao gồm thiếu liên kết hồ sơ xe/tài xế/vận đơn, GPS hoặc ETA cũ, nhiệt độ reefer chưa có mốc mới, cảnh báo e-seal và ngày kiểm tra CSC quá hạn.
- Hồ sơ chi tiết tải kế hoạch vận đơn từ shipment-service: khách hàng, loại hàng, khối lượng/thể tích khai báo, địa chỉ lấy/giao, lịch lấy hàng, hạn giao, hàng nguy hiểm và trạng thái vận đơn. Manifest được so sánh với tải trọng container và khối lượng khai báo; sai lệch được hiển thị để kiểm tra, không tự giả định dung sai.
- Các số đo IoT luôn đi kèm mốc nhận riêng. Giá trị đã lưu mà chưa có timestamp không được trình bày như dữ liệu hiện hành. ETA chỉ được so hạn giao khi cả ETA và GPS đều mới. Reefer hiển thị setpoint, nhiệt độ cấp/hồi và trạng thái cảnh báo từ thiết bị; thiếu dữ liệu, timestamp cũ hoặc mã cảnh báo lạ cần được kiểm tra. Chưa kết luận đạt/không đạt vì chưa có ngưỡng dung sai theo hàng hóa.
- Biển CSC có thể ghi nhận cơ quan/quốc gia và tham chiếu phê duyệt, ngày sản xuất, phương thức PES/ACEP, ngày kiểm tra kế tiếp hoặc mã ACEP. Chỉ dữ liệu CSC đã khai báo mới được dùng để cảnh báo ngày kiểm tra quá hạn; bản ghi nhập vào không phải xác nhận tính hợp lệ pháp lý.

IMO mô tả CSC 1972 yêu cầu phê duyệt an toàn, biển phê duyệt kèm dữ liệu kỹ thuật và trách nhiệm kiểm tra định kỳ của chủ sở hữu. BIC xác định mã kích thước/loại theo ISO 6346 và chức năng của check digit. Hướng dẫn reefer của AIG khuyến nghị lưu ý setpoint, cảnh báo, vị trí cảm biến cấp/hồi và hồ sơ nhiệt trong vận chuyển. [IMO CSC 1972](https://imo.org/en/OurWork/Safety/Pages/Containers-Default.aspx) · [BIC size & type code](https://www.bic-code.org/size-type-code/) · [AIG Reefer transport checklist](https://www.aig.com/content/dam/aig/america-canada/us/documents/business/risk-engineering/mlce/mlce-reefer-transport-recs-aig.pdf)

## Định tuyến và kết nối thiết bị theo luồng thị trường

Định tuyến đường và kết nối telematics là hai tích hợp độc lập. OSRM Route Service nhận chuỗi tọa độ và có thể trả các tuyến thay thế cùng hình học/lượt rẽ; nó không tự thay thế một dịch vụ tối ưu toàn đội xe hoặc bảo đảm đường phù hợp với container/xe tải. Tài liệu Google Route Optimization mô tả bài toán thực tế qua các ràng buộc vận đơn, phương tiện, tải hàng, giờ làm và cửa sổ giao nhận. Google Routes cũng có sản phẩm large-vehicle routing riêng. Vì vậy trước khi dùng tuyến cho chuyến thật cần có hồ sơ phương tiện (khối lượng/tải trọng, chiều cao, chiều rộng, chiều dài, số trục, loại nhiên liệu), hạn chế đường theo khu vực/giờ, phí đường, hàng nguy hiểm và điều kiện giao nhận. Các adapter hiện tại chỉ gửi tuyến `driving` cho cặp tọa độ; không gửi những thuộc tính này.

Luồng trong chi tiết container: (1) xác minh vận đơn, tọa độ lấy/giao và tải trọng khai báo; (2) gọi API định tuyến và xem nguồn của từng kết quả; (3) so khoảng cách, thời gian, nhiên liệu/CO₂ ước tính và ghi chú kiểm tra đường; (4) dispatcher xác nhận để tạo RouteVersion hiệu lực; (5) theo dõi phiên bản và quyết định trước đó. Kết quả `MOCK` là dữ liệu thử, không được chốt thành tuyến chính thức. Khi đang vận chuyển chỉ tra cứu tuyến hiện hành; việc đổi tuyến phải qua luồng đề xuất/phê duyệt reroute. Điểm tổng hợp là xếp hạng tham khảo, không đồng nghĩa đã duyệt.

Trong cấu hình đang có, provider mặc định là OSRM qua URL dịch vụ công khai và adapter gọi Route Service `driving`. Khi endpoint lỗi, adapter trả tuyến mô phỏng; phản hồi phải được phân biệt theo `providerName`. GraphHopper adapter hiện cũng chuyển sang mock thay vì gọi GraphHopper thật. `TrafficProvider` và `WeatherProvider` hiện là mock nên không được trình bày thời gian tuyến như ETA dựa trên giao thông/thời tiết trực tiếp. Kết quả OSRM không kiểm tra điều kiện xe tải, đường cấm hay cầu/tĩnh không, nên dispatcher vẫn phải kiểm tra trước khi dùng.

Mô hình kết nối thiết bị của nhà cung cấp telematics thường định danh phương tiện/thiết bị và gửi thời điểm UTC, tọa độ, tốc độ, hướng, độ chính xác/quality cùng thời điểm nhận phía nền tảng; webhook mẫu Lytx minh họa các trường này. Để hiện trạng thái kết nối đáng tin, cần thêm đăng ký provider và thông tin xác thực ở backend, ánh xạ `vehicleId`/VIN/serial sang xe và container, xác minh chữ ký/nguồn sự kiện, chống gửi lặp, xử lý gói đến sai thứ tự, giám sát heartbeat và trạng thái sức khỏe webhook. Tên thiết bị đã khai báo hoặc một gói dữ liệu cũ không đủ chứng minh kết nối đang sống. Hiện màn hình tách rõ freshness của GPS/cảm biến với lần kiểm tra API định tuyến; kết nối thiết bị thật vẫn cần endpoint và tài khoản provider mà kho mã hiện chưa cấu hình.

Tham khảo tài liệu nhà cung cấp/chuẩn API: [OSRM Route Service](https://project-osrm.org/docs/v26.6.1/index.html), [Google Route Optimization overview](https://developers.google.com/maps/documentation/route-optimization/overview), [Google large-vehicle routes and ETAs](https://developers.google.com/maps/documentation/routes/lvr-routes-etas), [Lytx GPS webhook reference](https://developer.lytx.com/docs/webhook_gps).

V038 ghi nhận mốc telemetry/GPS và lịch sử kiểm soát theo giai đoạn. V039 ghi nhận timestamp riêng cho số đo và ETA; V040 bổ sung hồ sơ biển CSC; V041 thêm setpoint và trạng thái cảnh báo reefer. Áp dụng migration trước khi khởi động asset-service mới. Ngưỡng nhiệt độ, dung sai và tích hợp xác thực chủ sở hữu/hiệu lực CSC vẫn cần quy định hoặc nguồn dữ liệu nghiệp vụ trước khi hệ thống được phép kết luận tuân thủ.
