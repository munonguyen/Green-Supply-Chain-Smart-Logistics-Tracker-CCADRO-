package com.ccadro.asset.service;

import com.ccadro.asset.dto.response.ContainerSafetyInspectionResponse.CriterionSpec;
import com.ccadro.asset.dto.response.ContainerSafetyInspectionResponse.TemplateItem;
import com.ccadro.asset.entity.enums.ContainerType;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class ContainerSafetyTemplateRegistry {
    public static final String VERSION = "1.0";

    private static CriterionSpec c(String code, String label, String metric, String unit, String threshold, Double min, Double max) {
        return new CriterionSpec(code, label, metric, unit, threshold, min, max);
    }

    private static final List<TemplateItem> STRUCTURE = List.of(
        new TemplateItem(
            "frame_corner_castings",
            "Khung, trụ góc và góc đúc",
            "Kết cấu chung",
            "Không nứt, cong, biến dạng hoặc mối nối có dấu hiệu tách rời.",
            true,
            "IICL-6 · ISO 1496 Kết cấu khung",
            "Đảm bảo khả năng chịu tải xếp chồng 1.8g và khóa chốt twistlock an toàn trên xe đầu kéo.",
            List.of(
                c("top_rail_bow", "Độ thẳng xà dọc trên (Top side rail)", "Độ võng/lệch tối đa", "mm", "≤ 30 mm (IICL-6)", 0d, 30d),
                c("corner_post_deflect", "Biến dạng trụ góc & góc đúc (Corner casting)", "Độ lệch hình học", "mm", "≤ 20 mm; không nứt lỗ khóa", 0d, 20d),
                c("weld_corrosion", "Mối hàn liên kết & ăn mòn chịu lực", "Vết nứt / rỉ xuyên", "điểm", "0 vết nứt tách mối hàn", 0d, 0d)
            ),
            List.of(
                "Xà dọc trên cong/võng vượt ngưỡng 30 mm (IICL-6)",
                "Lỗ khóa góc đúc bị toét hoặc biến dạng không ăn khớp twistlock",
                "Nứt mối hàn trụ góc hoặc ăn mòn xuyên kết cấu chịu lực"
            )
        ),
        new TemplateItem(
            "floor_deck",
            "Sàn chịu tải",
            "Kết cấu chung",
            "Không thủng, mục, lún, trơn bất thường hoặc có đinh/vật nhọn lộ ra.",
            true,
            "IICL-6 · Sàn & Xà ngang",
            "Chịu tải xe nâng trục 5.460 kg, không gây vấp pallet và ngăn thấm nước/lọt sáng từ gầm.",
            List.of(
                c("plank_step", "Chênh lệch cao độ giữa các tấm ván sàn", "Độ chênh cao độ", "mm", "≤ 5 mm (IICL-6)", 0d, 5d),
                c("floor_light_leak", "Độ kín mặt sàn (kiểm tra lọt sáng gầm)", "Điểm lọt sáng/thủng", "điểm", "0 điểm hở sáng hoặc mục rỗng", 0d, 0d),
                c("protruding_nails", "Đầu đinh/vít trồi hoặc dầu loang bề mặt", "Điểm mất an toàn", "điểm", "0 vật nhọn/vết dầu thấm sàn", 0d, 0d)
            ),
            List.of(
                "Chênh lệch cao độ ván sàn vượt quá 5 mm gây cấn xe nâng",
                "Ván sàn mục, thủng hoặc lọt sáng từ gầm container",
                "Nhiễm dầu/hóa chất thấm vào gỗ sàn hoặc có đinh vít trồi"
            )
        ),
        new TemplateItem(
            "walls_roof",
            "Vách, mái và độ kín nước",
            "Kết cấu chung",
            "Không thủng, nứt, hở mối nối hoặc dấu nước xâm nhập.",
            true,
            "IICL-6 · Thân vỏ & Kín nước (WWT)",
            "Bảo vệ hàng hóa khỏi mưa, ẩm và xâm nhập trong suốt hành trình vận tải.",
            List.of(
                c("wall_dent", "Độ lõm/phồng vách hông & vách đầu", "Chiều sâu biến dạng", "mm", "≤ 35 mm (IICL-6)", 0d, 35d),
                c("roof_dent", "Độ võng tấm mái container", "Chiều sâu võng mái", "mm", "≤ 40 mm; không đọng nước", 0d, 40d),
                c("water_light_tight", "Kiểm tra kín sáng & kín nước (WWT)", "Lỗ thủng/khe hở", "điểm", "0 khe hở lọt sáng", 0d, 0d)
            ),
            List.of(
                "Vách hông móp/phồng vào trong vượt quá 35 mm",
                "Mái võng sâu > 40 mm hoặc phát hiện lỗ thủng nhỏ lọt sáng",
                "Hở keo/mối hàn đường viền nóc gây rò rỉ nước mưa"
            )
        ),
        new TemplateItem(
            "doors_locking",
            "Cửa, bản lề và thanh khóa",
            "Kết cấu chung",
            "Cửa đóng kín; bản lề, gioăng, thanh khóa và chốt hoạt động an toàn.",
            true,
            "ISO 1496-1 · Hệ thống khóa cửa & Niêm phong",
            "Đảm bảo đóng mở nhẹ nhàng, kín nước qua gioăng cao su và gắn seal an ninh chắc chắn.",
            List.of(
                c("cam_keeper_fit", "Độ ăn khớp vấu cam & tai giữ (Cam/Keeper)", "Thanh khóa hoạt động", "%", "100% thanh khóa đóng hết hành trình", 100d, 100d),
                c("door_gasket_seal", "Độ kín gioăng cửa (Thử lọt sáng bên trong)", "Khe hở gioăng", "mm", "0 khe sáng quanh 4 cạnh cửa", 0d, 0d),
                c("hinge_latch", "Bản lề, tay đòn & tai kẹp niêm phong seal", "Tình trạng kẹt/lỏng", "điểm lỗi", "0 bản lề gãy hoặc tai seal rơ hỏng", 0d, 0d)
            ),
            List.of(
                "Gioăng cửa rách, chai cứng hoặc lọt sáng khi đóng kín cửa",
                "Thanh khóa cong vênh không gài hết vấu cam giữ",
                "Kẹt bản lề hoặc gãy tai giữ chốt niêm phong an ninh (e-Seal)"
            )
        ),
        new TemplateItem(
            "cleanliness_cargo",
            "Vệ sinh và tình trạng bên trong",
            "Kết cấu chung",
            "Không còn hàng cũ, mùi lạ, hóa chất, côn trùng hoặc vật liệu gây nhiễm bẩn.",
            true,
            "IICL RTB 009 · Vệ sinh khoang hàng",
            "Khoang chứa khô sạch, không mùi, đủ tiêu chuẩn thực phẩm/hàng sạch ngay khi cấp cont.",
            List.of(
                c("residue_debris", "Dư lượng hàng cũ, bụi bẩn hoặc mảnh vỡ", "Diện tích nhiễm bẩn", "%", "0% bề mặt sàn/vách còn rác", 0d, 0d),
                c("odor_moisture", "Độ ẩm bề mặt & kiểm tra mùi lạ", "Tình trạng khoang", "điểm lỗi", "Khô ráo, không mùi hóa chất/ẩm mốc", 0d, 0d)
            ),
            List.of(
                "Còn sót bao bì, dăm gỗ hoặc hàng hóa chuyến trước",
                "Khoang có mùi hóa chất, dầu mỡ hoặc ẩm mốc nặng",
                "Phát hiện côn trùng/mầm bệnh cần hun trùng trước khi đóng hàng"
            )
        ),
        new TemplateItem(
            "csc_plate",
            "Biển nhận dạng và hồ sơ CSC",
            "Nhận dạng",
            "Mã container đọc được; thông tin trên biển khớp hồ sơ đang lưu.",
            true,
            "Công ước CSC 1972 · Chứng nhận an toàn",
            "Xác thực hợp lệ pháp lý lưu hành quốc tế và khớp hoàn toàn số container với tải trọng MGW.",
            List.of(
                c("csc_interval", "Thời hạn kiểm định CSC định kỳ hoặc mã ACEP", "Tháng từ lần kiểm gần nhất", "tháng", "≤ 30 tháng hoặc có ACEP hiệu lực", 0d, 30d),
                c("plate_legibility", "Đối chiếu số serial, tải MGW & Tare trên biển", "Độ khớp hồ sơ", "%", "Khớp 100% mã ISO 6346 & MGW", 100d, 100d)
            ),
            List.of(
                "Quá hạn kiểm định CSC (> 30 tháng) và không có số ACEP hợp lệ",
                "Biển CSC mất, mờ không đọc được thông số MGW/Tare",
                "Mã ISO hoặc trọng lượng trên vỏ không khớp hồ sơ hệ thống"
            )
        ),
        new TemplateItem(
            "tires_brakes_axle",
            "Lốp xe, trục & phanh moóc",
            "An toàn vận hành",
            "Kiểm tra độ sâu gai lốp, áp suất hơi lốp và độ dày má phanh rơ-moóc.",
            true,
            "QCVN 34:2011 · TCVN An toàn lốp & phanh",
            "Đảm bảo bám đường, ngăn nổ lốp khi chở container nặng (≥ 1,6 mm luật / ≥ 3,2 mm khuyến nghị).",
            List.of(
                c("tread_depth_mm", "Độ sâu gai lốp (mới 14 mm · gờ TWI 1,6 mm)", "Độ sâu gai đo", "mm", "≥ 3,2 mm khuyến nghị (tối thiểu 1,6 mm)", 1.6d, 16d),
                c("tire_pressure_psi", "Áp suất hơi lốp chịu tải moóc", "Áp suất đo", "PSI", "100 – 120 PSI đều các trục", 95d, 125d),
                c("brake_lining_mm", "Độ dày má phanh khí nén trục sau", "Độ dày còn lại", "mm", "≥ 4,0 mm (mới 18 mm)", 4d, 20d)
            ),
            List.of(
                "Độ sâu gai lốp mòn dưới 1,6 mm (chạm gờ TWI, không thể sửa - phải thay mới)",
                "Lốp mòn từ 1,6–3,2 mm (cần đảo trục hoặc đắp lốp retread nếu tanh hông còn tốt)",
                "Áp suất lốp non (< 95 PSI) hoặc rách phồng hông lốp có nguy cơ nổ",
                "Má phanh mòn < 4 mm hoặc rò rỉ đường hơi phanh rơ-moóc"
            )
        )
    );

    private static final Map<ContainerType, List<TemplateItem>> TYPE_ITEMS = Map.of(
        ContainerType.DRY_20FT, List.of(
            new TemplateItem(
                "dry_floor_support",
                "Sàn và điểm tỳ hàng",
                "Kết cấu hàng hóa",
                "Kiểm tra vùng sàn chịu tải và điểm kê hàng theo chuyến.",
                true,
                "IICL-6 · Tải trọng khoang Dry 20ft",
                "Bảo đảm dầm ngang chịu đủ tải trọng tập trung và có điểm chèn lót ổn định.",
                List.of(
                    c("crossmember_sag", "Độ võng dầm ngang (Crossmember) dưới tải", "Độ võng tối đa", "mm", "≤ 10 mm so với mặt chuẩn", 0d, 10d),
                    c("dunnage_anchors", "Khuyên chằng lashing trong lòng container", "Tình trạng điểm neo", "%", "Đủ 100% khuyên neo nguyên vẹn", 100d, 100d)
                ),
                List.of(
                    "Dầm ngang đáy gãy hoặc võng sâu hơn 10 mm",
                    "Thiếu hoặc gãy khuyên chằng lashing trong vách"
                )
            )
        ),
        ContainerType.DRY_40FT, List.of(
            new TemplateItem(
                "dry_floor_support",
                "Sàn và điểm tỳ hàng",
                "Kết cấu hàng hóa",
                "Kiểm tra vùng sàn chịu tải và điểm kê hàng theo chuyến.",
                true,
                "IICL-6 · Tải trọng khoang Dry 40ft & Gooseneck",
                "Kiểm soát vùng hốc cổ ngỗng (Gooseneck) và khả năng chịu lực dọc sàn 40ft.",
                List.of(
                    c("gooseneck_tunnel", "Hốc cổ ngỗng (Gooseneck tunnel) & xà dọc đáy", "Biến dạng/nứt", "mm", "≤ 10 mm; không nứt J-bar", 0d, 10d),
                    c("crossmember_sag", "Độ võng dầm ngang dọc chiều dài 40ft", "Độ võng tối đa", "mm", "≤ 10 mm; không gỉ tách lớp", 0d, 10d)
                ),
                List.of(
                    "Móp hoặc nứt vùng cổ ngỗng (Gooseneck tunnel) ảnh hưởng gài moóc",
                    "Dầm ngang đáy võng > 10 mm hoặc tách lớp ăn mòn nặng"
                )
            )
        ),
        ContainerType.REEFER_20FT, reeferItems(),
        ContainerType.REEFER_40FT, reeferItems(),
        ContainerType.FLAT_RACK, List.of(
            new TemplateItem(
                "flat_deck",
                "Mặt sàn và khung đầu",
                "Mặt sàn",
                "Sàn và khung đầu không hư hại làm giảm khả năng đỡ hàng.",
                true,
                "ISO 1496-5 · Kết cấu Flat Rack",
                "Bảo đảm dầm chính chữ I và thành đầu chịu tải hàng siêu trường, siêu trọng.",
                List.of(
                    c("main_rail_deflect", "Độ võng dầm chính mặt sàn", "Độ lệch dọc", "mm", "≤ 15 mm", 0d, 15d),
                    c("header_integrity", "Khung thành đầu (End frame)", "Góc vuông & vết nứt", "điểm lỗi", "0 vết nứt mối hàn", 0d, 0d)
                ),
                List.of(
                    "Dầm chính Flat Rack võng > 15 mm",
                    "Nứt hoặc cong thành đầu chịu lực"
                )
            ),
            new TemplateItem(
                "flat_lashing_points",
                "Tai chằng buộc và điểm khóa",
                "Chằng buộc",
                "Điểm chằng buộc, chốt và corner casting còn nguyên, sử dụng được.",
                true,
                "CSS Code / EN 12195 · Điểm neo chằng hàng",
                "Bảo đảm toàn bộ tai chằng & Twistlock giữ hàng không bị xê dịch khi phanh gấp/vào cua.",
                List.of(
                    c("lashing_rings_ready", "Tỷ lệ tai chằng (Lashing D-rings) sẵn sàng", "Tỷ lệ sử dụng được", "%", "100% vòng D nguyên vẹn", 100d, 100d),
                    c("twistlock_wear", "Chốt Twistlock khóa sàn", "Số chốt lỗi", "chiếc", "0 chốt gãy hoặc kẹt", 0d, 0d)
                ),
                List.of(
                    "Gãy hoặc biến dạng tai chằng D-ring",
                    "Kẹt hoặc nứt chốt khóa Twistlock"
                )
            ),
            new TemplateItem(
                "flat_fold_locks",
                "Cơ cấu gập và khóa thành đầu",
                "Khóa kết cấu",
                "Thành đầu, chốt khóa và cơ cấu gập đã khóa đúng vị trí.",
                true,
                "IICL Flat Rack · Cơ cấu gập thành đầu",
                "Ngăn thành đầu tự mở/gập bất ngờ trong quá trình nâng hạ cẩu và vận hành đường dài.",
                List.of(
                    c("fold_lock_engagement", "Chốt gài hai bên thành đầu (Header lock pins)", "Độ vào khớp", "%", "Vào hết hành trình 100% hai bên", 100d, 100d)
                ),
                List.of(
                    "Chốt khóa thành đầu vào không hết ngàm hoặc mất chốt an toàn"
                )
            )
        ),
        ContainerType.OPEN_TOP, List.of(
            new TemplateItem(
                "open_top_roof",
                "Bạt/mái che và dây khóa",
                "Mái che",
                "Bạt không rách; dây, móc và điểm neo giữ kín hàng chắc chắn.",
                true,
                "TIR Customs & IICL · Mái bạt Open Top",
                "Chống thấm nước hoàn toàn từ phía trên và bảo đảm cáp TIR niêm phong được.",
                List.of(
                    c("tarp_holes", "Lỗ rách/thủng trên tấm bạt che mái", "Số vết rách", "vết", "0 vết rách hoặc bong đường vá", 0d, 0d),
                    c("tir_cable_rings", "Cáp luồn TIR & khoen neo xung quanh viền", "Độ nguyên vẹn", "%", "100% liền sợi, không đứt nối", 100d, 100d)
                ),
                List.of(
                    "Bạt che mái bị rách, thủng gây thấm nước vào hàng",
                    "Đứt hoặc thiếu dây cáp TIR / hỏng khoen luồn bạt"
                )
            ),
            new TemplateItem(
                "open_top_top_rails",
                "Thanh nóc và viền nóc",
                "Kết cấu nóc",
                "Thanh nóc và viền không biến dạng, nứt hoặc có cạnh sắc nguy hiểm.",
                true,
                "IICL · Xà nóc tháo lắp (Roof Bows)",
                "Giữ hình dạng hộp chuẩn và đỡ tấm bạt không bị võng tụ nước mưa.",
                List.of(
                    c("roof_bows_complete", "Đủ số thanh xà nóc & chốt gài hai đầu", "Độ lệch/cong", "mm", "≤ 20 mm; đủ 100% xà", 0d, 20d)
                ),
                List.of(
                    "Thiếu thanh xà nóc hoặc thanh xà cong > 20 mm",
                    "Viền nóc có cạnh sắc làm rách bạt che"
                )
            )
        )
    );

    private static List<TemplateItem> reeferItems() {
        return List.of(
            new TemplateItem(
                "reefer_unit_mount",
                "Cụm máy lạnh và điểm gá",
                "Thiết bị lạnh",
                "Cụm máy không nứt, lỏng gá hoặc có dấu hiệu rò rỉ bất thường.",
                true,
                "IICL Reefer Guide & PTI · Cơ khí & Môi chất",
                "Bảo đảm cụm máy nén/dàn ngưng gá chặt vào khung đầu và hệ thống môi chất lạnh kín hoàn toàn.",
                List.of(
                    c("mount_bolts_clearance", "Bu-lông định vị & giá đỡ cụm máy lạnh", "Số bu-lông lỏng/gãy", "bu-lông", "0 bu-lông lỏng; độ rơ 0 mm", 0d, 0d),
                    c("refrigerant_oil_leak", "Kiểm tra rò rỉ dầu máy nén & môi chất (R134a/R452A)", "Điểm rò rỉ/dầu loang", "điểm", "0 vết dầu loang / xì gas đầu nối", 0d, 0d),
                    c("compressor_pressure", "Áp suất vận hành dàn máy nén (khi thử tải)", "Áp suất hút (Low-side)", "PSI", "15 – 45 PSI tùy tải setpoint", 15d, 45d)
                ),
                List.of(
                    "Lỏng hoặc thiếu bu-lông gá cụm máy vào khung đầu",
                    "Phát hiện rò rỉ dầu máy nén hoặc môi chất lạnh tại khớp nối",
                    "Nứt vỏ bảo vệ dàn ngưng hoặc rung gõ cơ khí bất thường",
                    "Áp suất môi chất ngoài dải làm việc an toàn"
                )
            ),
            new TemplateItem(
                "reefer_power_control",
                "Nguồn điện và bộ điều khiển",
                "Thiết bị lạnh",
                "Cáp, đầu nối và bộ điều khiển nguyên vẹn; màn hình hoạt động.",
                true,
                "ISO 1496-2 · Điện nguồn CEE 3 Pha & Controller",
                "Đảm bảo cấp điện 380–460V an toàn không rò điện và bộ vi xử lý điều khiển hiển thị chuẩn xác.",
                List.of(
                    c("supply_voltage", "Điện áp nguồn 3 pha cấp cho cụm lạnh", "Điện áp đo thực tế", "V", "380 – 460 V AC (50/60 Hz)", 380d, 460d),
                    c("insulation_resistance", "Điện trở cách điện cuộn dây & cáp nguồn", "Chỉ số Megohm", "MΩ", "≥ 2,0 MΩ (An toàn điện)", 2d, 999d),
                    c("plug_controller_screen", "Phích CEE 32A, dây nguồn & màn hình điều khiển", "Tình trạng hư hại", "điểm lỗi", "0 vết cháy xém; LED rõ nét", 0d, 0d)
                ),
                List.of(
                    "Phích cắm CEE 32A bị cháy xém chân tiếp xúc hoặc nứt vỏ",
                    "Dây cáp nguồn bị trầy hở lõi hoặc chập chờn khi rung",
                    "Điện trở cách điện thấp hơn 2 MΩ có nguy cơ rò điện",
                    "Màn hình bộ điều khiển tắt, mất nét hoặc nút bấm không phản hồi"
                )
            ),
            new TemplateItem(
                "reefer_setpoint_test",
                "Cài đặt và thử nhiệt độ",
                "Thiết bị lạnh",
                "Set-point khớp yêu cầu vận đơn; nhiệt độ đo được đang đi đúng dải.",
                true,
                "PTI Reefer Test · Hiệu chuẩn & Pull-down",
                "Xác minh nhiệt độ cài đặt đúng hợp đồng hàng lạnh và độ chênh cảm biến cấp/hồi trong sai số ±0,5 °C.",
                List.of(
                    c("sensor_deviation", "Độ lệch giữa cảm biến cấp (Supply) và hồi (Return)", "Sai số hiệu chuẩn", "°C", "≤ ±0,5 °C ở chế độ ổn định", -0.5d, 0.5d),
                    c("pull_down_temp", "Nhiệt độ buồng lạnh thực tế so với Set-point", "Chênh lệch so với Set-point", "°C", "≤ ±1,0 °C (đạt dải yêu cầu)", -1d, 1d)
                ),
                List.of(
                    "Set-point đang cài đặt không khớp yêu cầu nhiệt độ của vận đơn",
                    "Sai lệch giữa hai đầu dò cấp/hồi vượt quá ±0,5 °C",
                    "Máy không đạt tốc độ kéo hạ nhiệt (Pull-down chậm bất thường)"
                )
            ),
            new TemplateItem(
                "reefer_alarm_airflow",
                "Cảnh báo, quạt và luồng khí",
                "Thiết bị lạnh",
                "Không có cảnh báo chưa xử lý; quạt chạy và luồng hồi/cấp khí không bị chắn.",
                true,
                "PTI Diagnostics · Chẩn đoán lỗi & Lưu thông gió",
                "Đảm bảo 0 mã lỗi cảnh báo chưa xử lý và luồng gió tuần hoàn dọc sàn chữ T thông thoáng.",
                List.of(
                    c("active_alarms", "Số mã cảnh báo đang hoạt động (Active alarms)", "Số mã lỗi ACTIVE", "mã", "0 mã lỗi đang kích hoạt", 0d, 0d),
                    c("vent_airflow", "Cửa lấy gió tươi (Fresh air vent) & rãnh sàn chữ T", "Độ thông thoáng", "%", "100% rãnh cấp/hồi không bị tắc", 100d, 100d)
                ),
                List.of(
                    "Bộ điều khiển đang báo mã lỗi chưa được xử lý (Alarm active)",
                    "Quạt dàn lạnh/dàn ngưng không quay hoặc kêu bạc đạn",
                    "Rãnh sàn chữ T bít tắc làm cản trở luồng khí lạnh tuần hoàn",
                    "Cửa lấy gió tươi cài đặt sai chế độ hàng (đông lạnh/hoa quả)"
                )
            ),
            new TemplateItem(
                "reefer_insulation_drain",
                "Gioăng, cách nhiệt và thoát nước",
                "Thiết bị lạnh",
                "Gioăng kín; lớp cách nhiệt và đường thoát nước không hư hại/tắc nghẽn.",
                true,
                "IICL Reefer · Bảo ôn & Thoát nước rã đông",
                "Ngăn thất thoát nhiệt, đóng băng dàn lạnh và loại trừ nguy cơ ngập nước từ khay rã đông.",
                List.of(
                    c("thermal_seal_leak", "Kiểm tra khe hở gioăng cách nhiệt cửa & vách", "Khe hở thất thoát nhiệt", "mm", "0 mm (Kín sáng hoàn toàn)", 0d, 0d),
                    c("drain_flow", "Thông thoát ống xả nước rã đông (Kazoo drains)", "Số ống tắc", "ống", "0 ống tắc; phễu 1 chiều nguyên vẹn", 0d, 0d)
                ),
                List.of(
                    "Gioăng cửa lạnh chai rách làm thoát hơi lạnh và đóng tuyết",
                    "Vách cách nhiệt nứt thủng khiến nước ngấm vào lớp foam bảo ôn",
                    "Tắc ống thoát nước xả đá gây tràn nước vào khoang hàng"
                )
            )
        );
    }

    public List<TemplateItem> forType(ContainerType type) {
        if (type == null || !TYPE_ITEMS.containsKey(type)) throw new IllegalArgumentException("Unsupported container type");
        var shared = STRUCTURE.stream()
            .filter(item -> type != ContainerType.FLAT_RACK
                || (!item.key().equals("walls_roof") && !item.key().equals("doors_locking")))
            .map(item -> type == ContainerType.OPEN_TOP && item.key().equals("walls_roof")
                ? new TemplateItem(
                    "walls_roof",
                    "Vách và mối nối",
                    "Kết cấu chung",
                    "Vách không thủng, nứt hoặc hở mối nối; mái mở được kiểm tra riêng ở nhóm Mái che.",
                    true,
                    "IICL-6 · Vách Open Top",
                    "Bảo đảm vách kín nước, chịu lực ngang và không lọt sáng ở phần thành bên.",
                    List.of(
                        c("wall_dent", "Độ lõm/phồng vách hông & vách trước", "Chiều sâu biến dạng", "mm", "≤ 35 mm (IICL-6)", 0d, 35d),
                        c("water_light_tight", "Kiểm tra kín sáng thành vách", "Điểm hở sáng", "điểm", "0 điểm hở mối nối vách", 0d, 0d)
                    ),
                    List.of(
                        "Vách bên biến dạng vượt quá 35 mm",
                        "Thủng vách hoặc hở mối nối vách gây rò rỉ nước"
                    )
                ) : item);
        return java.util.stream.Stream.concat(shared, TYPE_ITEMS.get(type).stream()).toList();
    }
}
