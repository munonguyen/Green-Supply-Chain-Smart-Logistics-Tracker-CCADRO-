/**
 * Client-side mirror/fallback of IICL-6 / ISO 1496 / CSC / Reefer PTI inspection
 * specs so UI renders detailed objectives, sub-criteria, numeric thresholds, and
 * standardized reasons even when templates come from legacy/partial caches.
 */

export const CONTAINER_INSPECTION_SPECS = {
  frame_corner_castings: {
    standardRef: 'IICL-6 · ISO 1496 Kết cấu khung',
    objective: 'Đảm bảo khả năng chịu tải xếp chồng 1.8g và khóa chốt twistlock an toàn trên xe đầu kéo.',
    criteria: [
      { code: 'top_rail_bow', label: 'Độ thẳng xà dọc trên (Top side rail)', metricName: 'Độ võng/lệch tối đa', unit: 'mm', thresholdLabel: '≤ 30 mm (IICL-6)', minValue: 0, maxValue: 30 },
      { code: 'corner_post_deflect', label: 'Biến dạng trụ góc & góc đúc (Corner casting)', metricName: 'Độ lệch hình học', unit: 'mm', thresholdLabel: '≤ 20 mm; không nứt lỗ khóa', minValue: 0, maxValue: 20 },
      { code: 'weld_corrosion', label: 'Mối hàn liên kết & ăn mòn chịu lực', metricName: 'Vết nứt / rỉ xuyên', unit: 'điểm', thresholdLabel: '0 vết nứt tách mối hàn', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Xà dọc trên cong/võng vượt ngưỡng 30 mm (IICL-6)',
      'Lỗ khóa góc đúc bị toét hoặc biến dạng không ăn khớp twistlock',
      'Nứt mối hàn trụ góc hoặc ăn mòn xuyên kết cấu chịu lực'
    ]
  },
  floor_deck: {
    standardRef: 'IICL-6 · Sàn & Xà ngang',
    objective: 'Chịu tải xe nâng trục 5.460 kg, không gây vấp pallet và ngăn thấm nước/lọt sáng từ gầm.',
    criteria: [
      { code: 'plank_step', label: 'Chênh lệch cao độ giữa các tấm ván sàn', metricName: 'Độ chênh cao độ', unit: 'mm', thresholdLabel: '≤ 5 mm (IICL-6)', minValue: 0, maxValue: 5 },
      { code: 'floor_light_leak', label: 'Độ kín mặt sàn (kiểm tra lọt sáng gầm)', metricName: 'Điểm lọt sáng/thủng', unit: 'điểm', thresholdLabel: '0 điểm hở sáng hoặc mục rỗng', minValue: 0, maxValue: 0 },
      { code: 'protruding_nails', label: 'Đầu đinh/vít trồi hoặc dầu loang bề mặt', metricName: 'Điểm mất an toàn', unit: 'điểm', thresholdLabel: '0 vật nhọn/vết dầu thấm sàn', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Chênh lệch cao độ ván sàn vượt quá 5 mm gây cấn xe nâng',
      'Ván sàn mục, thủng hoặc lọt sáng từ gầm container',
      'Nhiễm dầu/hóa chất thấm vào gỗ sàn hoặc có đinh vít trồi'
    ]
  },
  walls_roof: {
    standardRef: 'IICL-6 · Thân vỏ & Kín nước (WWT)',
    objective: 'Bảo vệ hàng hóa khỏi mưa, ẩm và xâm nhập trong suốt hành trình vận tải.',
    criteria: [
      { code: 'wall_dent', label: 'Độ lõm/phồng vách hông & vách đầu', metricName: 'Chiều sâu biến dạng', unit: 'mm', thresholdLabel: '≤ 35 mm (IICL-6)', minValue: 0, maxValue: 35 },
      { code: 'roof_dent', label: 'Độ võng tấm mái container', metricName: 'Chiều sâu võng mái', unit: 'mm', thresholdLabel: '≤ 40 mm; không đọng nước', minValue: 0, maxValue: 40 },
      { code: 'water_light_tight', label: 'Kiểm tra kín sáng & kín nước (WWT)', metricName: 'Lỗ thủng/khe hở', unit: 'điểm', thresholdLabel: '0 khe hở lọt sáng', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Vách hông móp/phồng vào trong vượt quá 35 mm',
      'Mái võng sâu > 40 mm hoặc phát hiện lỗ thủng nhỏ lọt sáng',
      'Hở keo/mối hàn đường viền nóc gây rò rỉ nước mưa'
    ]
  },
  doors_locking: {
    standardRef: 'ISO 1496-1 · Hệ thống khóa cửa & Niêm phong',
    objective: 'Đảm bảo đóng mở nhẹ nhàng, kín nước qua gioăng cao su và gắn seal an ninh chắc chắn.',
    criteria: [
      { code: 'cam_keeper_fit', label: 'Độ ăn khớp vấu cam & tai giữ (Cam/Keeper)', metricName: 'Thanh khóa hoạt động', unit: '%', thresholdLabel: '100% thanh khóa đóng hết hành trình', minValue: 100, maxValue: 100 },
      { code: 'door_gasket_seal', label: 'Độ kín gioăng cửa (Thử lọt sáng bên trong)', metricName: 'Khe hở gioăng', unit: 'mm', thresholdLabel: '0 khe sáng quanh 4 cạnh cửa', minValue: 0, maxValue: 0 },
      { code: 'hinge_latch', label: 'Bản lề, tay đòn & tai kẹp niêm phong seal', metricName: 'Tình trạng kẹt/lỏng', unit: 'điểm lỗi', thresholdLabel: '0 bản lề gãy hoặc tai seal rơ hỏng', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Gioăng cửa rách, chai cứng hoặc lọt sáng khi đóng kín cửa',
      'Thanh khóa cong vênh không gài hết vấu cam giữ',
      'Kẹt bản lề hoặc gãy tai giữ chốt niêm phong an ninh (e-Seal)'
    ]
  },
  cleanliness_cargo: {
    standardRef: 'IICL RTB 009 · Vệ sinh khoang hàng',
    objective: 'Khoang chứa khô sạch, không mùi, đủ tiêu chuẩn thực phẩm/hàng sạch ngay khi cấp cont.',
    criteria: [
      { code: 'residue_debris', label: 'Dư lượng hàng cũ, bụi bẩn hoặc mảnh vỡ', metricName: 'Diện tích nhiễm bẩn', unit: '%', thresholdLabel: '0% bề mặt sàn/vách còn rác', minValue: 0, maxValue: 0 },
      { code: 'odor_moisture', label: 'Độ ẩm bề mặt & kiểm tra mùi lạ', metricName: 'Tình trạng khoang', unit: 'điểm lỗi', thresholdLabel: 'Khô ráo, không mùi hóa chất/ẩm mốc', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Còn sót bao bì, dăm gỗ hoặc hàng hóa chuyến trước',
      'Khoang có mùi hóa chất, dầu mỡ hoặc ẩm mốc nặng',
      'Phát hiện côn trùng/mầm bệnh cần hun trùng trước khi đóng hàng'
    ]
  },
  csc_plate: {
    standardRef: 'Công ước CSC 1972 · Chứng nhận an toàn',
    objective: 'Xác thực hợp lệ pháp lý lưu hành quốc tế và khớp hoàn toàn số container với tải trọng MGW.',
    criteria: [
      { code: 'csc_interval', label: 'Thời hạn kiểm định CSC định kỳ hoặc mã ACEP', metricName: 'Tháng từ lần kiểm gần nhất', unit: 'tháng', thresholdLabel: '≤ 30 tháng hoặc có ACEP hiệu lực', minValue: 0, maxValue: 30 },
      { code: 'plate_legibility', label: 'Đối chiếu số serial, tải MGW & Tare trên biển', metricName: 'Độ khớp hồ sơ', unit: '%', thresholdLabel: 'Khớp 100% mã ISO 6346 & MGW', minValue: 100, maxValue: 100 }
    ],
    failureReasons: [
      'Quá hạn kiểm định CSC (> 30 tháng) và không có số ACEP hợp lệ',
      'Biển CSC mất, mờ không đọc được thông số MGW/Tare',
      'Mã ISO hoặc trọng lượng trên vỏ không khớp hồ sơ hệ thống'
    ]
  },
  dry_floor_support: {
    standardRef: 'IICL-6 · Tải trọng khoang Dry & Gooseneck',
    objective: 'Kiểm soát vùng hốc cổ ngỗng (Gooseneck), dầm ngang đáy và khả năng chịu lực tập trung của sàn.',
    criteria: [
      { code: 'crossmember_sag', label: 'Độ võng dầm ngang (Crossmember) dưới tải', metricName: 'Độ võng tối đa', unit: 'mm', thresholdLabel: '≤ 10 mm so với mặt chuẩn', minValue: 0, maxValue: 10 },
      { code: 'dunnage_anchors', label: 'Khuyên chằng lashing & điểm tỳ hàng trong khoang', metricName: 'Tỷ lệ điểm neo đạt', unit: '%', thresholdLabel: '100% khuyên neo nguyên vẹn', minValue: 95, maxValue: 100 }
    ],
    failureReasons: [
      'Dầm ngang đáy gãy hoặc võng sâu hơn 10 mm',
      'Móp hoặc nứt vùng cổ ngỗng (Gooseneck tunnel) ảnh hưởng gài moóc',
      'Thiếu hoặc gãy khuyên chằng lashing giữ hàng trong khoang'
    ]
  },
  flat_deck: {
    standardRef: 'ISO 1496-5 · Kết cấu Flat Rack',
    objective: 'Bảo đảm dầm chính chữ I và thành đầu chịu tải hàng siêu trường, siêu trọng.',
    criteria: [
      { code: 'main_rail_deflect', label: 'Độ võng dầm chính mặt sàn', metricName: 'Độ lệch dọc', unit: 'mm', thresholdLabel: '≤ 15 mm', minValue: 0, maxValue: 15 },
      { code: 'header_integrity', label: 'Khung thành đầu (End frame)', metricName: 'Điểm nứt mối hàn', unit: 'điểm', thresholdLabel: '0 vết nứt mối hàn', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Dầm chính Flat Rack võng > 15 mm',
      'Nứt hoặc cong thành đầu chịu lực'
    ]
  },
  flat_lashing_points: {
    standardRef: 'CSS Code / EN 12195 · Điểm neo chằng hàng',
    objective: 'Bảo đảm toàn bộ tai chằng & Twistlock giữ hàng không bị xê dịch khi phanh gấp.',
    criteria: [
      { code: 'lashing_rings_ready', label: 'Tỷ lệ tai chằng (Lashing D-rings) sẵn sàng', metricName: 'Tỷ lệ sử dụng được', unit: '%', thresholdLabel: '100% vòng D nguyên vẹn', minValue: 100, maxValue: 100 },
      { code: 'twistlock_wear', label: 'Chốt Twistlock khóa sàn', metricName: 'Số chốt lỗi', unit: 'chiếc', thresholdLabel: '0 chốt gãy hoặc kẹt', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Gãy hoặc biến dạng tai chằng D-ring',
      'Kẹt hoặc nứt chốt khóa Twistlock'
    ]
  },
  flat_fold_locks: {
    standardRef: 'IICL Flat Rack · Cơ cấu gập thành đầu',
    objective: 'Ngăn thành đầu tự mở/gập bất ngờ trong quá trình nâng hạ cẩu.',
    criteria: [
      { code: 'fold_lock_engagement', label: 'Chốt gài hai bên thành đầu (Header lock pins)', metricName: 'Độ vào khớp', unit: '%', thresholdLabel: 'Vào hết hành trình 100%', minValue: 100, maxValue: 100 }
    ],
    failureReasons: ['Chốt khóa thành đầu vào không hết ngàm hoặc mất chốt an toàn']
  },
  open_top_roof: {
    standardRef: 'TIR Customs & IICL · Mái bạt Open Top',
    objective: 'Chống thấm nước hoàn toàn từ phía trên và bảo đảm cáp TIR niêm phong được.',
    criteria: [
      { code: 'tarp_holes', label: 'Lỗ rách/thủng trên tấm bạt che mái', metricName: 'Số vết rách', unit: 'vết', thresholdLabel: '0 vết rách hoặc bong đường vá', minValue: 0, maxValue: 0 },
      { code: 'tir_cable_rings', label: 'Cáp luồn TIR & khoen neo xung quanh viền', metricName: 'Độ nguyên vẹn', unit: '%', thresholdLabel: '100% liền sợi', minValue: 100, maxValue: 100 }
    ],
    failureReasons: [
      'Bạt che mái bị rách, thủng gây thấm nước vào hàng',
      'Đứt hoặc thiếu dây cáp TIR / hỏng khoen luồn bạt'
    ]
  },
  open_top_top_rails: {
    standardRef: 'IICL · Xà nóc tháo lắp (Roof Bows)',
    objective: 'Giữ hình dạng hộp chuẩn và đỡ tấm bạt không bị võng tụ nước mưa.',
    criteria: [
      { code: 'roof_bows_complete', label: 'Đủ số thanh xà nóc & chốt gài hai đầu', metricName: 'Độ lệch/cong', unit: 'mm', thresholdLabel: '≤ 20 mm; đủ 100% xà', minValue: 0, maxValue: 20 }
    ],
    failureReasons: [
      'Thiếu thanh xà nóc hoặc thanh xà cong > 20 mm',
      'Viền nóc có cạnh sắc làm rách bạt che'
    ]
  },
  tires_brakes_axle: {
    standardRef: 'QCVN 34:2011 · TCVN An toàn lốp & phanh',
    objective: 'Đảm bảo bám đường, ngăn nổ lốp khi chở container nặng (≥ 1,6 mm luật / ≥ 3,2 mm khuyến nghị).',
    criteria: [
      { code: 'tread_depth_mm', label: 'Độ sâu gai lốp (mới 14 mm · gờ TWI 1,6 mm)', metricName: 'Độ sâu gai đo', unit: 'mm', thresholdLabel: '≥ 3,2 mm khuyến nghị (tối thiểu 1,6 mm)', minValue: 1.6, maxValue: 16 },
      { code: 'tire_pressure_psi', label: 'Áp suất hơi lốp chịu tải moóc', metricName: 'Áp suất đo', unit: 'PSI', thresholdLabel: '100 – 120 PSI đều các trục', minValue: 95, maxValue: 125 },
      { code: 'brake_lining_mm', label: 'Độ dày má phanh khí nén trục sau', metricName: 'Độ dày còn lại', unit: 'mm', thresholdLabel: '≥ 4,0 mm (mới 18 mm)', minValue: 4, maxValue: 20 }
    ],
    failureReasons: [
      'Độ sâu gai lốp mòn dưới 1,6 mm (chạm gờ TWI, không thể sửa - phải thay mới)',
      'Lốp mòn từ 1,6–3,2 mm (cần đảo trục hoặc đắp lốp retread nếu tanh hông còn tốt)',
      'Áp suất lốp non (< 95 PSI) hoặc rách phồng hông lốp có nguy cơ nổ',
      'Má phanh mòn < 4 mm hoặc rò rỉ đường hơi phanh rơ-moóc'
    ]
  },
  reefer_unit_mount: {
    standardRef: 'IICL Reefer Guide & PTI · Cơ khí & Môi chất',
    objective: 'Bảo đảm cụm máy nén/dàn ngưng gá chặt vào khung đầu và hệ thống môi chất lạnh kín hoàn toàn.',
    criteria: [
      { code: 'mount_bolts_clearance', label: 'Bu-lông định vị & giá đỡ cụm máy lạnh', metricName: 'Số bu-lông lỏng/gãy', unit: 'bu-lông', thresholdLabel: '0 bu-lông lỏng; độ rơ 0 mm', minValue: 0, maxValue: 0 },
      { code: 'refrigerant_oil_leak', label: 'Kiểm tra rò rỉ dầu máy nén & môi chất (R134a/R452A)', metricName: 'Điểm rò rỉ/dầu loang', unit: 'điểm', thresholdLabel: '0 vết dầu loang / xì gas đầu nối', minValue: 0, maxValue: 0 },
      { code: 'compressor_pressure', label: 'Áp suất vận hành dàn máy nén (khi thử tải)', metricName: 'Áp suất hút (Low-side)', unit: 'PSI', thresholdLabel: '15 – 45 PSI tùy tải setpoint', minValue: 15, maxValue: 45 }
    ],
    failureReasons: [
      'Lỏng hoặc thiếu bu-lông gá cụm máy vào khung đầu',
      'Phát hiện rò rỉ dầu máy nén hoặc môi chất lạnh tại khớp nối',
      'Nứt vỏ bảo vệ dàn ngưng hoặc rung gõ cơ khí bất thường',
      'Áp suất môi chất ngoài dải làm việc an toàn'
    ]
  },
  reefer_power_control: {
    standardRef: 'ISO 1496-2 · Điện nguồn CEE 3 Pha & Controller',
    objective: 'Đảm bảo cấp điện 380–460V an toàn không rò điện và bộ vi xử lý điều khiển hiển thị chuẩn xác.',
    criteria: [
      { code: 'supply_voltage', label: 'Điện áp nguồn 3 pha cấp cho cụm lạnh', metricName: 'Điện áp đo thực tế', unit: 'V', thresholdLabel: '380 – 460 V AC (50/60 Hz)', minValue: 380, maxValue: 460 },
      { code: 'insulation_resistance', label: 'Điện trở cách điện cuộn dây & cáp nguồn', metricName: 'Chỉ số Megohm', unit: 'MΩ', thresholdLabel: '≥ 2,0 MΩ (An toàn điện)', minValue: 2, maxValue: 999 },
      { code: 'plug_controller_screen', label: 'Phích CEE 32A, dây nguồn & màn hình điều khiển', metricName: 'Tình trạng hư hại', unit: 'điểm lỗi', thresholdLabel: '0 vết cháy xém; LED rõ nét', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Phích cắm CEE 32A bị cháy xém chân tiếp xúc hoặc nứt vỏ',
      'Dây cáp nguồn bị trầy hở lõi hoặc chập chờn khi rung',
      'Điện trở cách điện thấp hơn 2 MΩ có nguy cơ rò điện',
      'Màn hình bộ điều khiển tắt, mất nét hoặc nút bấm không phản hồi'
    ]
  },
  reefer_setpoint_test: {
    standardRef: 'PTI Reefer Test · Hiệu chuẩn & Pull-down',
    objective: 'Xác minh nhiệt độ cài đặt đúng hợp đồng hàng lạnh và độ chênh cảm biến cấp/hồi trong sai số ±0,5 °C.',
    criteria: [
      { code: 'sensor_deviation', label: 'Độ lệch giữa cảm biến cấp (Supply) và hồi (Return)', metricName: 'Sai số hiệu chuẩn', unit: '°C', thresholdLabel: '≤ ±0,5 °C ở chế độ ổn định', minValue: -0.5, maxValue: 0.5 },
      { code: 'pull_down_temp', label: 'Nhiệt độ buồng lạnh thực tế so với Set-point', metricName: 'Chênh lệch so với Set-point', unit: '°C', thresholdLabel: '≤ ±1,0 °C (đạt dải yêu cầu)', minValue: -1, maxValue: 1 }
    ],
    failureReasons: [
      'Set-point đang cài đặt không khớp yêu cầu nhiệt độ của vận đơn',
      'Sai lệch giữa hai đầu dò cấp/hồi vượt quá ±0,5 °C',
      'Máy không đạt tốc độ kéo hạ nhiệt (Pull-down chậm bất thường)'
    ]
  },
  reefer_alarm_airflow: {
    standardRef: 'PTI Diagnostics · Chẩn đoán lỗi & Lưu thông gió',
    objective: 'Đảm bảo 0 mã lỗi cảnh báo chưa xử lý và luồng gió tuần hoàn dọc sàn chữ T thông thoáng.',
    criteria: [
      { code: 'active_alarms', label: 'Số mã cảnh báo đang hoạt động (Active alarms)', metricName: 'Số mã lỗi ACTIVE', unit: 'mã', thresholdLabel: '0 mã lỗi đang kích hoạt', minValue: 0, maxValue: 0 },
      { code: 'vent_airflow', label: 'Cửa lấy gió tươi (Fresh air vent) & rãnh sàn chữ T', metricName: 'Độ thông thoáng', unit: '%', thresholdLabel: '100% rãnh cấp/hồi không bị tắc', minValue: 100, maxValue: 100 }
    ],
    failureReasons: [
      'Bộ điều khiển đang báo mã lỗi chưa được xử lý (Alarm active)',
      'Quạt dàn lạnh/dàn ngưng không quay hoặc kêu bạc đạn',
      'Rãnh sàn chữ T bít tắc làm cản trở luồng khí lạnh tuần hoàn',
      'Cửa lấy gió tươi cài đặt sai chế độ hàng (đông lạnh/hoa quả)'
    ]
  },
  reefer_insulation_drain: {
    standardRef: 'IICL Reefer · Bảo ôn & Thoát nước rã đông',
    objective: 'Ngăn thất thoát nhiệt, đóng băng dàn lạnh và loại trừ nguy cơ ngập nước từ khay rã đông.',
    criteria: [
      { code: 'thermal_seal_leak', label: 'Kiểm tra khe hở gioăng cách nhiệt cửa & vách', metricName: 'Khe hở thất thoát nhiệt', unit: 'mm', thresholdLabel: '0 mm (Kín sáng hoàn toàn)', minValue: 0, maxValue: 0 },
      { code: 'drain_flow', label: 'Thông thoát ống xả nước rã đông (Kazoo drains)', metricName: 'Số ống tắc', unit: 'ống', thresholdLabel: '0 ống tắc; phễu 1 chiều nguyên vẹn', minValue: 0, maxValue: 0 }
    ],
    failureReasons: [
      'Gioăng cửa lạnh chai rách làm thoát hơi lạnh và đóng tuyết',
      'Vách cách nhiệt nứt thủng khiến nước ngấm vào lớp foam bảo ôn',
      'Tắc ống thoát nước xả đá gây tràn nước vào khoang hàng'
    ]
  }
};

export function resolveInspectionItemSpec(item) {
  if (!item) return { standardRef: '', objective: '', criteria: [], failureReasons: [] };
  const fallback = CONTAINER_INSPECTION_SPECS[item.key] || {};
  return {
    standardRef: item.standardRef || fallback.standardRef || '',
    objective: item.objective || fallback.objective || '',
    criteria: Array.isArray(item.criteria) && item.criteria.length ? item.criteria : fallback.criteria || [],
    failureReasons:
      Array.isArray(item.failureReasons) && item.failureReasons.length
        ? item.failureReasons
        : fallback.failureReasons || []
  };
}

export function evaluateMetricBound(criterion, rawValue) {
  if (rawValue === '' || rawValue == null) return null;
  const num = Number(rawValue);
  if (!Number.isFinite(num)) return null;
  if (criterion.minValue != null && num < Number(criterion.minValue)) return 'OUT_OF_RANGE';
  if (criterion.maxValue != null && num > Number(criterion.maxValue)) return 'OUT_OF_RANGE';
  return 'IN_RANGE';
}

