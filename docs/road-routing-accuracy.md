# Tính tuyến đường, giao thông và CO₂

Các API lập tuyến và tính lại phần đường còn lại dùng chung `RoutePlanningService`. Điểm tổng hợp giữ thuật toán hiện có: chuẩn hóa Min–Max CO₂, thời gian, khoảng cách trên cùng tập phương án, sau đó cộng theo trọng số đã chuẩn hóa. Kiểm tra Pareto đánh dấu tuyến không bị tuyến khác vượt đồng thời cả ba tiêu chí. Khi bằng điểm, ưu tiên CO₂, thời gian rồi khoảng cách để kết quả ổn định.

## Dữ liệu đường và giao thông

- OSRM: hình học đường ô tô và chỉ dẫn rẽ; không có giao thông trực tiếp, không xác nhận hạn chế xe tải. Các phương án là tuyến nhanh và các tuyến thay thế, không bảo đảm chứa đường ngắn nhất toàn mạng.
- TomTom: lấy `fastest` cùng các tuyến thay thế, `shortest` và `eco`, dùng cùng giờ khởi hành, kích thước và tổng trọng lượng xe. Yêu cầu `traffic=true`, `computeTravelTimeFor=all`, chỉ dẫn tiếng Việt và các đoạn giao thông. Phương án trùng hình học được gộp. Đoạn trả về không cho phép xe tải bị từ chối.
- Điểm đầu/cuối hình học phải cách tọa độ yêu cầu không quá 100 m. Tọa độ tại cảng/kho nên là cổng xe tải có thể tiếp cận; dữ liệu sai không được thay bằng tuyến demo.
- Bản đồ giữ toàn bộ đỉnh của tuyến; cache xem trước OSRM dùng sáu chữ số thập phân, hết hạn sau 60 giây, tối đa 100 mục. Tuyến đã chốt vẫn được truyền bằng phiên bản tuyến hiện có.

Bản đồ lập tuyến và xem trước đổi tuyến tô màu các đoạn chậm theo đúng `startPointIndex`/`endPointIndex` của hình học nhà cung cấp. Nhãn ghi độ trễ dự báo và thời điểm dữ liệu; không tự suy diễn ùn tắc khi thiếu thông tin.

Giờ khởi hành lấy từ giờ lấy hàng dự kiến nếu còn trong tương lai, hoặc thời điểm tính tuyến. Đổi tuyến lấy giờ hiện tại và GPS mới. Giao diện hiển thị giờ tính, thời gian thông thoáng/lịch sử nếu nhà cung cấp trả về, độ trễ giao thông và ETA. Đây là dự báo theo vùng phủ tại lúc yêu cầu; không phải lời khẳng định một đoạn chắc chắn tắc vào một giờ cụ thể.

## Cấu hình tiêu hao xe

Đặt `ROUTING_PROVIDER=tomtom`, `TOMTOM_API_KEY` và bốn biến `CCADRO_TRUCK_*` kích thước/tổng trọng lượng trong `.env.example`. Hồ sơ hiện áp dụng chung toàn bộ dịch vụ: chỉ dùng khi đúng tổ hợp xe đang lập tuyến. API chưa hỗ trợ chọn hồ sơ riêng theo `vehicleId`.

Để so sánh phát thải dựa trên tiêu hao thay vì chỉ khoảng cách:

1. Cấu hình `CCADRO_TRUCK_CONSUMPTION_CURVE`: các cặp `tốc_độ_km/h,lít/100km` nối bằng dấu `:` từ hồ sơ đã hiệu chỉnh cho xe có tải. Không lấy đường cong xe con làm mặc định.
2. Cấu hình `CCADRO_TRUCK_AUXILIARY_LITERS_PER_HOUR` nếu có dữ liệu thiết bị phụ trợ.
3. Đặt `CCADRO_CARBON_FUEL_KG_CO2_PER_LITER` theo nhiên liệu và phạm vi hạch toán đã thống nhất. Không có hệ số mặc định suy đoán.

TomTom nhận cùng mô hình cho mọi mục tiêu và trả `fuelConsumptionInLiters`. Hệ thống tính CO₂ = nhiên liệu dự báo × hệ số kg CO₂/lít. Thiếu dự báo của một phương án hoặc hệ số không hợp lệ thì báo lỗi, tránh so sánh lẫn mô hình. Đây là ước tính theo mô hình, không phải nhiên liệu hay CO₂ đo trực tiếp. Không cộng thêm hệ số ùn tắc tùy ý lên kết quả của nhà cung cấp.

Nếu chưa cấu hình đường cong, giữ mô hình khoảng cách × tải hàng × hệ số tấn-km và ghi rõ giới hạn trên giao diện. Khi ấy tuyến ít CO₂ thường trùng tuyến ngắn; chưa thể kết luận tuyến nào ít tiêu hao do ùn tắc hơn.

## Phạm vi và kiểm chứng

Chỉ xếp hạng các phương án nhà cung cấp trả về; ba cực tiểu có thể thuộc ba tuyến khác nhau. Không có bảo đảm cực tiểu toàn cục. Cần đối chiếu kết quả trên các hành trình thực, các giờ lấy hàng khác nhau, hồ sơ đúng xe, GPS và nhiên liệu đo được trước khi dùng để cam kết vận hành. Chưa triển khai tìm giờ khởi hành tốt nhất bằng cách quét nhiều khung giờ.

Kiểm thử tự động kiểm tra yêu cầu gửi nhà cung cấp, hình học lệch tọa độ, cấu hình tiêu hao, bảo toàn đỉnh đường, cache và trường hợp tuyến dài hơn nhưng dự báo nhiên liệu thấp hơn. Chưa kiểm chứng giao thông ngoài thực địa bằng khóa TomTom trong lần thay đổi này.

Nguồn chính thức: [TomTom Calculate Route v1](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route) — tham số tuyến, giao thông, mô hình tiêu hao và các trường summary. `eco` cân bằng thời gian và tiêu hao; nhãn này không đồng nghĩa CO₂ nhỏ nhất toàn cục. Tài liệu cũng lưu ý `shortest` có thể hết thời gian tính trên tuyến dài; hệ thống hiện báo lỗi nếu không lấy đủ các nhóm phương án, không âm thầm bỏ nhóm.
