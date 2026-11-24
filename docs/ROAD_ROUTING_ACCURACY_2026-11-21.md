# Định tuyến đường thực, giao thông và CO₂ — 21/11/2026

## Phạm vi đã triển khai

- OSRM trả hình học đường đầy đủ, bước rẽ, quãng đường và thời gian. Không dùng mock khi dịch vụ lỗi. Giới hạn bắt điểm đầu/cuối cách mạng đường tối đa 100 m; thiếu đường phù hợp thì báo lỗi để sửa tọa độ cổng vào.
- Dùng thuật toán Min–Max và trọng số hiện có, chuẩn hóa tổng trọng số thành 1; bổ sung đánh dấu Pareto. Các nhãn “ngắn nhất”, “nhanh nhất”, “CO₂ thấp nhất” chỉ so sánh **tập phương án nhận được**.
- Dispatcher và driver dùng RouteVersion đã chốt. Thiếu hình học thì không thay bằng hành lang mẫu. Vệt GPS nét đứt là điểm ghi nhận, không phải đường dẫn đã tính.
- Sửa giao dịch chỉ đọc ở API calculate khiến ứng viên không lưu sau khi API trả kết quả. Phương án được lưu trước khi có thể chọn.
- API chọn tuyến ban đầu chỉ cho vận đơn PENDING/PLANNED; chuyến đã xuất bến cần đổi tuyến đồng bộ phiên bản.
- Driver không gửi GPS nội suy theo % tiến độ vào chuyến thực. Cập nhật từ vị trí thiết bị không tự sinh nhiệt độ, độ ẩm, pin hoặc trạng thái seal.
- Tracking đo phần đường còn lại theo hình học RouteVersion bằng PostGIS, thay việc nhân đường chim bay với 1,15/1,22. Không gán điểm xuất phát làm vị trí GPS khi thiếu tín hiệu; không có đường/GPS phù hợp thì bỏ ETA. ETA màn giám sát dùng tốc độ đo hiện tại nên chỉ là tham khảo, chưa phải dự báo giao thông theo từng đoạn.

## Nguồn dữ liệu và nghiên cứu

[OSRM Route API](https://project-osrm.org/docs/v5.24.0/api/) tính đường theo trọng số profile và trả các phương án thay thế; yêu cầu alternative không bảo đảm luôn có đủ số lượng. Profile `driving` trên máy chủ public không xác minh kích thước/tải trọng container, giờ cấm địa phương hay ùn tắc hiện tại. Đường ngắn nhất trong tập alternative không đồng nghĩa nghiệm ngắn nhất toàn mạng. Máy chủ public phù hợp phát triển; vận hành cần nhà cung cấp/SLA hoặc OSRM tự quản có dữ liệu cập nhật.

[TomTom Calculate Route](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/calculate-route) hỗ trợ `travelMode=truck`, kích thước/tổng khối lượng, `traffic=true`, giờ khởi hành, summary giao thông và chỉ dẫn. Adapter yêu cầu nhóm `fastest` và nhóm `shortest`, gộp các hình học trùng nhau. Thời gian do provider trả không bị nhân thêm mock traffic/weather. `shortest` phù hợp chặng ngắn/trung bình; chặng dài có thể bị giới hạn thời gian tính. Chưa dùng `eco` làm bằng chứng “phát thải thấp nhất” vì tiêu chí đó là cân bằng năng lượng/thời gian, cần dữ liệu xe phù hợp.

[Smart Freight Centre — primary data](https://academy.smartfreightcentre.org/blog/primary-data-for-emissions-accounting) giải thích vai trò dữ liệu nhiên liệu/năng lượng thực đo, tải hàng và quãng đường. Công thức hiện tại là `km đường × tấn hàng × hệ số kgCO₂e/tấn.km`. Đây là dự toán, chưa gồm tiêu hao thực từng xe, máy lạnh, chạy rỗng, độ dốc, dừng/chờ và khởi động. Không cộng DAF lên khoảng cách đường đã biết để tránh nhân vòng đường hai lần. Cùng hệ số và tải hàng thì phương án CO₂ thấp nhất sẽ trùng quãng đường thấp nhất; chưa thể suy ra tuyến ít carbon thực tế nhất chỉ từ mô hình này.

## Cấu hình vận hành

Local đang dùng `ROUTING_PROVIDER=osrm`, `ROUTING_BASE_URL=https://router.project-osrm.org`. TomTom đã có adapter và kiểm thử HTTP contract; **chưa gọi tài khoản TomTom thật**, chưa xác minh quyền gói dịch vụ/vùng phủ Việt Nam.

Để dùng TomTom cần `ROUTING_PROVIDER=tomtom`, `TOMTOM_API_KEY`, `CCADRO_TRUCK_GROSS_WEIGHT_KG`, `CCADRO_TRUCK_HEIGHT_METERS`, `CCADRO_TRUCK_WIDTH_METERS`, `CCADRO_TRUCK_LENGTH_METERS`. Tổng khối lượng phải gồm cả đầu kéo, sơ mi rơ moóc, vỏ và hàng. Giá trị 0 mặc định sẽ chặn yêu cầu; không dùng số đo xe giả. Hiện đây là **một profile xe theo môi trường**, chưa tự lấy profile khác nhau cho từng chuyến; đội xe nhiều cấu hình phải bổ sung ánh xạ hồ sơ trước khi vận hành. API `/plan` từ chối tùy chọn xe riêng/tránh đường chưa hỗ trợ thay vì âm thầm bỏ qua.

API key ở backend, không đưa vào frontend. Phải đối chiếu biển báo, hạn chế cầu/đường, lệnh cấm giờ và điều kiện thực địa; dữ liệu vendor không bảo đảm đầy đủ mọi hạn chế địa phương. OSRM không đủ điều kiện để tự động kết luận xe container được phép đi.

## Đổi tuyến từ GPS

1. Chuyến EN_ROUTE có GPS quality-passed trong 5 phút gần nhất.
2. PostGIS chiếu GPS lên tuyến đang áp dụng, đo chiều dài phần đường còn lại. Tính tuyến mới từ GPS đến điểm giao khai báo trong vận đơn.
3. Chỉ tạo đề xuất khi có hình học đường provider thực và đạt ngưỡng giảm quãng đường cấu hình (mặc định 10%). Đây là lợi ích **quãng đường**, không phải phần trăm carbon/nhiên liệu thực đo. Tự động có cooldown; dispatcher có thể yêu cầu tính lại.
4. Lưu sourceCandidateId, hình học, quãng đường, ETA và metadata. Hiển thị đường chờ duyệt màu cam riêng với tuyến đang chạy.
5. Trước duyệt kiểm tra GPS/đề xuất chưa quá 5 phút, xe cách đầu tuyến không quá 250 m. Routing kiểm tra candidate còn mới, thuộc đúng vận đơn và có đường thực. Chỉ nhận mã candidate đã lưu, không tin số kilomet/hình học client gửi lên.
6. Tạo RouteVersion, cập nhật trip.activeRouteVersionId. Mã proposal trong reason giúp retry cùng đề xuất không tạo thêm phiên bản. Nếu Routing thất bại thì giao dịch Tracking không ghi nhận ACCEPTED.

Không dùng hệ số cố định 0.82 để tuyên bố đã tìm thấy đường mới. Đề xuất cũ chỉ có ước tính không được duyệt. GPS mất hoặc cũ thì cần lấy vị trí thực, không thay bằng tọa độ demo.

API mới: `POST /tracking/trips/{id}/proposals/calculate` (dispatcher/admin); nội bộ gọi `POST /routing/reroute/calculate/{shipmentId}?latitude=...&longitude=...`. Migration bổ sung `V047__reroute_road_evidence.sql`.

## Giới hạn cần kiểm chứng tiếp với vận hành thật

- Không có bằng chứng đảm bảo nghiệm ngắn nhất/ít CO₂ nhất toàn mạng. Có đánh đổi nhanh–ngắn–carbon và chất lượng/độ mới dữ liệu.
- Giao thông TomTom phải chạy thử bằng tài khoản thật, đúng profile xe và các chặng có vùng phủ. Chưa có credentials thì UI hiện “chưa có nguồn giao thông thực tế”.
- API/giao dịch giữa hai dịch vụ không phải distributed transaction: nếu Routing đã commit nhưng Tracking gặp lỗi sau đó, có thể cần retry cùng proposal để đồng bộ; idempotency hỗ trợ retry, chưa có outbox/reconciler tự động.
- Chưa có khóa cạnh tranh cho mọi thao tác dispatcher đồng thời và chưa kiểm chứng đường tự cắt/vòng lặp phức tạp khi chiếu GPS lên tuyến. Không coi projection baseline là ETA tuyến cũ có traffic.
- Chỉ dẫn OSRM được diễn đạt từ maneuver/road name; đây chưa là ứng dụng turn-by-turn có map-matching, voice guidance và kiểm chứng ngã rẽ ngoài hiện trường.
- Các RouteVersion seed cũ được giữ để bảo toàn lịch sử; không tự sửa tuyến đang chạy. Muốn thay phải tính và duyệt lại.
