# Nhiên liệu xe và dự toán CO₂ — nghiên cứu Việt Nam ngày 21/11/2026

## Kết quả thị trường

Danh mục chức năng `/vehicle-fuels` lấy **5 loại nhiên liệu vận tải đường bộ được nêu trong thông cáo Petrolimex ngày 19/11/2026**, không dùng danh mục seed V013 làm dữ liệu thị trường hiện hành.

| Loại | Vùng 1 (đ/lít) | Trần Vùng 2 (đ/lít) | Phân loại |
|---|---:|---:|---|
| E10 RON95-V | 21.100 | 21.520 | Xăng, mức 5, ethanol danh nghĩa 10% |
| E10 RON95-III | 19.100 | 19.480 | Xăng, mức 3, ethanol danh nghĩa 10% |
| E5 RON92-II | 18.570 | 18.940 | Xăng, mức 2, ethanol danh nghĩa 5% |
| Diesel DO 0,001S-V | 28.140 | 28.700 | Diesel, mức 5, lưu huỳnh tối đa 10 ppm |
| Diesel DO 0,05S-II | 26.340 | 26.860 | Diesel, mức 2, lưu huỳnh tối đa 500 ppm |

Nguồn giá: [Petrolimex, thông cáo 19/11/2026](https://petrolimex.com.vn/ndi/thong-cao-bao-chi/petrolimex-dieu-chinh-gia-xang-dau-tu-15-gio-00-phut-ngay-19-11-2026.html). Đã đối chiếu bảng ảnh đính kèm trong thông cáo: [bảng giá gốc](https://files.petrolimex.com.vn/pngs/6783dc1271ff449e95b74a9520964169/ab82fc2fcff045e4a87ba446f96fd9b7/Screenshot%202026-11-19%20151127.png).

Đây là **ảnh chụp tham chiếu**, hiệu lực từ 15:00 ngày 19/11/2026 tới kỳ điều hành kế tiếp, không phải feed giá thời gian thực. Vùng 2 là mức trần; giá tại một cửa hàng có thể khác. Giá báo riêng trong kịch bản được gắn nhãn rõ và không sửa giá tham chiếu toàn hệ thống. Người dùng xác nhận riêng loại có bán tại điểm tiếp nhiên liệu trên tuyến, không suy ra tồn kho từ danh mục.

[Bộ Công Thương ngày 04/07/2026](https://moit.gov.vn/tin-tuc/tin-hieu-tich-cuc-sau-1-thang-xang-e10-duoc-ban-tren-toan-quoc.html) ghi nhận E10 bán trên toàn quốc từ tháng 6/2026, E5 vẫn tồn tại với độ phủ hạn chế hơn. Không mô tả RON95 khoáng/E0 là lựa chọn mặc định hiện hành. Không đưa dầu hỏa hoặc mazut vào nhiên liệu xe. Chưa xác minh nguồn cung bán lẻ phổ biến và tương thích OEM cho B20/HVO nên không đề xuất các loại này như nhiên liệu đổ thay cho xe diesel. CNG/EV/hybrid chưa rõ cấu hình cần bài toán hệ động lực riêng.

## Tương thích theo xe

- Giữ `vehicle.fuel_type` làm hệ động lực gốc. Hồ sơ `vehicle_fuel_profile` lưu nhiên liệu bán lẻ thực dùng, tiêu hao L/100km, km kế hoạch năm (tùy chọn), giới hạn của hãng và nguồn đối chiếu.
- Diesel chỉ so với diesel; GASOLINE/PETROL chỉ so với xăng. Không suy ra động cơ của HYBRID. Không sửa hệ động lực bằng lựa chọn nhiên liệu.
- Yêu cầu người khai báo ghi nguồn sổ tay/OEM và nguồn định mức theo tải, cung đường, thời gian đo. Lưu hồ sơ không có nghĩa nhà sản xuất đã cấp chứng nhận trong ứng dụng.
- Kiểm tra mức chất lượng tối thiểu và điều kiện Euro của xe; xe mức IV/V không được chấp nhận diesel mức II. Xe có chuẩn động cơ Euro 6 vẫn cần nhiên liệu mức V và giới hạn OEM tương ứng, không tạo một sản phẩm mức VI chưa có trong danh mục.
- Diesel phải có giới hạn lưu huỳnh; xăng phải có RON tối thiểu và ethanol tối đa. Không coi RON cao hơn hay lưu huỳnh thấp hơn là chứng cứ giảm CO₂.

Nguồn: [Petrolimex về diesel 0,001S-V](https://petrolimex.com.vn/ndi/thong-cao-bao-chi/petrolimex-la-tap-doan-nang-luong-dau-tien-phan-phoi-nhien-lieu-diezen-0001s-v-euro5-tai-viet-nam.html). Nguồn này phân biệt diesel mức II/III/IV/V lần lượt 500/350/50/10 mg/kg lưu huỳnh và yêu cầu dùng nhiên liệu phù hợp động cơ.

## Phạm vi CO₂ và công thức

Chức năng mới trả `ESTIMATED_TTW_CO2_ONLY`: dự toán CO₂ từ đốt nhiên liệu. **Không phải CO₂e, không phải GLEC WTW**, chưa gồm WTT, CH₄, N₂O, sử dụng đất hoặc chuỗi cung ứng. Không cập nhật lại biên bản carbon chuyến trong carbon-service.

Tham chiếu [EPA 2025, bảng 2 Mobile Combustion CO₂](https://www.epa.gov/system/files/documents/2025-01/ghg-emission-factors-hub-2025.pdf): diesel 10,21; motor gasoline 8,78; ethanol 5,75 kg CO₂/US gallon. Chia 3,785411784 để ra kg CO₂/lít. Đây là hệ số mặc định tham khảo của Hoa Kỳ, chưa có chứng thư carbon riêng theo lô nhiên liệu Việt Nam; kết quả phải hiển thị là dự toán.

Với ethanol thể tích danh nghĩa `e`:

- `EF_hóa_thạch = (1-e) × EF_xăng`.
- `EF_sinh_học = e × EF_ethanol`.
- `EF_CO₂_ống_xả = EF_hóa_thạch + EF_sinh_học`.

CO₂ sinh học vẫn có ở ống xả; không cộng bằng 0 để tuyên bố không phát thải. Các hệ số sinh học được hiển thị riêng khi người dùng tối ưu CO₂ hóa thạch. Mức E5/E10 thực của lô nhiên liệu có thể khác tỷ lệ danh nghĩa, cần số liệu thực khi có.

Định mức gốc do người dùng nhập cho nhiên liệu thực của xe và điều kiện tải đã mô tả. Nếu chưa có định mức đo riêng của phương án khác, quy đổi xăng theo năng lượng: `I(e)=1-0,33×e`; `q_i=q_gốc×I_gốc/I_i`. Tham chiếu [EIA về ethanol](https://www.eia.gov/energyexplained/biofuels/ethanol-use.php): ethanol có khoảng 67% năng lượng theo thể tích so với xăng. Đây là mô hình quy đổi đơn giản, không cam kết hiệu suất động cơ. Hai loại diesel có cùng định mức và cùng hệ số CO₂ trong mô hình; không tự giảm tiêu hao khi đổi chất lượng nhiên liệu.

Kịch bản:

- `V_i = km × q_i/100 + giờ_chờ_tăng_thêm × L/giờ_gốc × I_gốc/I_i`.
- `chi_phí_i = V_i × giá_i`.
- `CO₂_i = V_i × EF_i`.

Nếu có q đo riêng, q_i dùng giá trị nhập. Giờ chờ là phần tăng thêm ngoài định mức gốc để tránh tính lặp. Đây không phải dự báo ùn tắc thực tế. Kết quả không gồm máy lạnh container chạy bằng nguồn nhiên liệu riêng hoặc nguồn năng lượng chưa khai báo.

Tổng quan đội xe năm: chỉ cộng xe có hồ sơ tương thích, có tiêu hao và km kế hoạch; hiển thị tỷ lệ bao phủ. Xe chưa có dữ liệu không được tính bằng 0, giao diện hiển thị “Chưa đủ dữ liệu” khi không có xe đủ điều kiện. Dự toán năm chỉ từ định mức × km, chưa cộng kịch bản chờ của một hành trình.

## Bài toán đề xuất

1. Loại nhiên liệu sai hệ động lực, không đủ chất lượng/RON/ethanol/lưu huỳnh của xe.
2. Loại phương án chưa được người dùng xác nhận có bán trên tuyến.
3. Loại phương án vượt mức tăng chi phí tối đa so với nhiên liệu đang dùng (nếu có giới hạn).
4. Trên tập khả thi, tính điểm `w×norm(CO₂)+(1-w)×norm(chi_phí)`, chuẩn hóa min-max từng chỉ tiêu, tối thiểu hóa điểm. Nếu chỉ tiêu không biến thiên, phần chuẩn hóa bằng 0.
5. Đồng điểm: ưu tiên CO₂ thấp, rồi chi phí thấp, rồi mã nhiên liệu để kết quả ổn định. Đánh dấu Pareto nếu không bị phương án khác tốt hơn hoặc bằng cả hai chỉ tiêu và tốt hơn ít nhất một chỉ tiêu.

Người dùng chọn chỉ tiêu carbon **CO₂ ống xả** hoặc **CO₂ hóa thạch**, trọng số 0–100%, và báo giá/tiêu hao đo riêng. Không có phương án khả thi thì trả lời rõ không đủ điều kiện; không fallback âm thầm sang diesel. Kết quả chỉ là đề xuất cho kịch bản, không tự ghi đè nhiên liệu thực của xe. Đổi nhiên liệu trong hồ sơ yêu cầu nhập lại định mức và nguồn đo tương ứng.

## Triển khai

- Migration `V051__vehicle_fuel_profiles.sql`, không tự gán nhiên liệu, chứng cứ hay định mức cho xe thật.
- Trang riêng `/vehicle-fuels`, menu “Nhiên liệu & CO₂ đội xe”; liên kết từ xe đã chọn trên màn hình điều phối.
- API GET `/api/v1/assets/vehicle-fuels`; GET/PUT `/api/v1/assets/vehicles/{id}/fuel-profile`; POST `/api/v1/assets/vehicles/{id}/fuel-assessment`.
- ADMIN/DISPATCHER/SAFETY_MANAGER được cập nhật. ESG_AUDITOR được xem và tính kịch bản. DRIVER/CUSTOMER/HUB không có quyền truy cập chức năng này.
- Kiểm soát phiên bản `expectedRevision`, khóa hàng xe khi lưu. Giá trị cũ bị từ chối để tránh ghi đè.

Danh mục V013 cũ của carbon-service chưa được coi là danh mục đã xác minh này. Đường `/carbon/calculate/fuel-cost` và báo cáo GLEC hiện hữu vẫn là luồng riêng, không dùng kết quả TTW mới để thay bằng chứng WTW cũ.

## Kết quả xác minh

Localhost đã được sao lưu, nâng migration V051, build và chạy lại asset-service/api-gateway. 66 kiểm thử backend (45 asset, 21 gateway) đạt, gồm 10 test cho mô hình nhiên liệu; 7 kiểm thử frontend liên quan đạt, ESLint các file thay đổi và build frontend đạt.

HTTP qua gateway đã xác minh trên xe kiểm thử diesel/xăng: lưu hồ sơ, từ chối phiên bản cũ, loại nhiên liệu không tương thích, không đề xuất khi chưa xác nhận nguồn cung, tách CO₂ sinh học và phân quyền auditor/driver. Trình duyệt thật xác minh khai báo xe, lưu lại, tính đề xuất DO 0,001S-V cho Euro 5, tải lại vẫn giữ định mức và không tràn ngang ở chiều rộng 390 px. Dữ liệu xe/hồ sơ kiểm thử tạm đã xóa; không tự điền chứng cứ/định mức cho xe vận hành.
