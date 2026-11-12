import { getRealRoadRoute } from './roadRoutingService';

/**
 * 1. DANH MỤC 7 TRUNG TÂM LOGISTICS, CẢNG BIỂN & KCN TRỌNG ĐIỂM PHÍA NAM
 * Dữ liệu tọa độ GPS thực tế, trục giao thông kết nối và hạ tầng trạm sạc xanh.
 */
export const HUB_CORRIDOR_DIRECTORY = [
  {
    id: 'catlai',
    code: 'HUB-SGN-01',
    label: 'Cảng Cát Lái',
    area: 'TP. Thủ Đức, TP. HCM',
    address: '1295B Nguyễn Thị Định, Phường Cát Lái, TP. Thủ Đức, TP. HCM',
    coords: [10.7623, 106.7824],
    primaryHighways: 'Nguyễn Thị Định – Nút giao Mỹ Thủy – Võ Chí Công (Vành Đai 2)',
    customsGate: 'Chi cục Hải quan Cửa khẩu Cảng Sài Gòn KV1',
    evChargers: '12 trụ sạc nhanh DC 250kW (Solar Depot)',
    maxWeightTons: 44,
    coldChainSupport: '48 ổ cắm Reefer 400V'
  },
  {
    id: 'vsip',
    code: 'HUB-BDG-02',
    label: 'KCN VSIP 1',
    area: 'Thuận An, Bình Dương',
    address: 'Số 8 Đại lộ Hữu Nghị, KCN Việt Nam – Singapore, Thuận An, Bình Dương',
    coords: [10.9242, 106.7145],
    primaryHighways: 'Quốc lộ 13 (Đại lộ Bình Dương) – Đại lộ Hữu Nghị',
    customsGate: 'Chi cục Hải quan KCN VSIP Bình Dương',
    evChargers: '8 trụ sạc nhanh DC 180kW',
    maxWeightTons: 40,
    coldChainSupport: 'Kho lạnh -22°C đạt chuẩn GSP'
  },
  {
    id: 'songthan',
    code: 'HUB-BDG-03',
    label: 'ICD Sóng Thần',
    area: 'Dĩ An, Bình Dương',
    address: 'Khu phố Bình Đường 3, Phường An Bình, TP. Dĩ An, Bình Dương',
    coords: [10.8925, 106.7428],
    primaryHighways: 'Xa lộ Hà Nội – Quốc lộ 1A – Đại lộ Độc Lập',
    customsGate: 'Chi cục Hải quan ICD Sóng Thần',
    evChargers: '10 trụ sạc nhanh DC 250kW',
    maxWeightTons: 44,
    coldChainSupport: 'Trung tâm phân phối lạnh 15.000 Pallet'
  },
  {
    id: 'tanbinh',
    code: 'HUB-SGN-04',
    label: 'KCN Tân Bình',
    area: 'Tân Phú, TP. HCM',
    address: 'Đường Tây Thạnh, KCN Tân Bình, Quận Tân Phú, TP. HCM',
    coords: [10.8184, 106.6286],
    primaryHighways: 'Trường Chinh – Quốc lộ 1A – Cộng Hòa',
    customsGate: 'Trạm kiểm soát hàng nội địa & Hàng không Tân Sơn Nhất',
    evChargers: '6 trụ sạc DC 150kW',
    maxWeightTons: 32,
    coldChainSupport: 'Kho mát FMCG & Dược phẩm (+2°C đến +8°C)'
  },
  {
    id: 'nhontrach',
    code: 'HUB-DNA-05',
    label: 'KCN Nhơn Trạch',
    area: 'Nhơn Trạch, Đồng Nai',
    address: 'Đường Tôn Đức Thắng (ĐT 25B), KCN Nhơn Trạch 1-3, Đồng Nai',
    coords: [10.7352, 106.8954],
    primaryHighways: 'Cao tốc TP.HCM – Long Thành – Dầu Giây – Quốc lộ 51 – ĐT 25B',
    customsGate: 'Chi cục Hải quan Nhơn Trạch – Đồng Nai',
    evChargers: '8 trụ sạc DC 250kW',
    maxWeightTons: 44,
    coldChainSupport: 'Bãi container lạnh công nghiệp'
  },
  {
    id: 'hiepphuoc',
    code: 'HUB-SGN-06',
    label: 'Cảng Hiệp Phước',
    area: 'Nhà Bè, TP. HCM',
    address: 'Khu B, Đường số 1, KCN Hiệp Phước, Huyện Nhà Bè, TP. HCM',
    coords: [10.6354, 106.7522],
    primaryHighways: 'Cầu Phú Mỹ – Nguyễn Văn Linh – Nguyễn Hữu Thọ – Nguyễn Văn Tạo',
    customsGate: 'Chi cục Hải quan Cửa khẩu Cảng Hiệp Phước',
    evChargers: '8 trụ sạc DC 180kW',
    maxWeightTons: 44,
    coldChainSupport: '32 ổ cắm Reefer ven sông Soài Rạp'
  },
  {
    id: 'caimep',
    code: 'HUB-VUT-07',
    label: 'Cảng Cái Mép',
    area: 'Phú Mỹ, Bà Rịa – Vũng Tàu',
    address: 'Khu phố Tân Lộc, Phường Phước Hòa, Thị xã Phú Mỹ, Bà Rịa – Vũng Tàu',
    coords: [10.5256, 107.0225],
    primaryHighways: 'Cao tốc Long Thành – Quốc lộ 51 – Đường Liên Cảng Cái Mép – Thị Vải',
    customsGate: 'Chi cục Hải quan Cửa khẩu Cảng Cái Mép',
    evChargers: '14 trụ siêu sạc DC 350kW',
    maxWeightTons: 44,
    coldChainSupport: 'Cảng nước sâu quốc tế • 64 ổ cắm Reefer'
  },
  {
    id: 'vsip2',
    code: 'HUB-BDG-08',
    label: 'KCN VSIP 2',
    area: 'TP. Mới, Bình Dương',
    address: 'Đường Dân Chủ, KCN VSIP 2, Phường Hòa Phú, TP. Thủ Dầu Một, Bình Dương',
    coords: [11.0542, 106.6987],
    primaryHighways: 'Đại lộ Bình Dương (QL13) – Tuyến ĐT 741 – Đường Dân Chủ',
    customsGate: 'Chi cục Hải quan KCN VSIP 2 Bình Dương',
    evChargers: '8 trụ sạc nhanh DC 180kW',
    maxWeightTons: 40,
    coldChainSupport: 'Hệ thống kho lạnh GSP dược phẩm & điện tử'
  },
  {
    id: 'amata',
    code: 'HUB-DNA-09',
    label: 'KCN Amata Biên Hòa',
    area: 'Biên Hòa, Đồng Nai',
    address: 'Quốc lộ 1A, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
    coords: [10.9412, 106.8821],
    primaryHighways: 'Quốc lộ 1A – Xa lộ Hà Nội – Đường Amata',
    customsGate: 'Chi cục Hải quan KCN Biên Hòa – Đồng Nai',
    evChargers: '6 trụ sạc nhanh DC 180kW',
    maxWeightTons: 42,
    coldChainSupport: 'Kho bãi trung chuyển công nghiệp'
  },
  {
    id: 'longhau',
    code: 'HUB-LAN-10',
    label: 'KCN Long Hậu',
    area: 'Cần Giuộc, Long An',
    address: 'Ấp 3, Xã Long Hậu, Huyện Cần Giuộc, Long An',
    coords: [10.6285, 106.7124],
    primaryHighways:
      'Đường Nguyễn Văn Tạo – Đường số 1 KCN Long Hậu – Cao tốc Bến Lức – Long Thành',
    customsGate: 'Chi cục Hải quan Long An Cửa khẩu KV Long Hậu',
    evChargers: '6 trụ sạc nhanh DC 180kW',
    maxWeightTons: 38,
    coldChainSupport: 'Trung tâm logistics thực phẩm sạch'
  },
  {
    id: 'phuoclong',
    code: 'HUB-SGN-11',
    label: 'Cảng ICD Phước Long',
    area: 'TP. Thủ Đức, TP. HCM',
    address: 'Km 9 Xa lộ Hà Nội, Phường Phước Long A, TP. Thủ Đức, TP. HCM',
    coords: [10.8245, 106.7689],
    primaryHighways: 'Xa lộ Hà Nội – Đường Đỗ Xuân Hợp – Cầu Rạch Chiếc',
    customsGate: 'Chi cục Hải quan ICD Phước Long 1-3',
    evChargers: '8 trụ sạc nhanh DC 200kW',
    maxWeightTons: 44,
    coldChainSupport: 'Bãi cắm điện container lạnh 40ft'
  },
  {
    id: 'tantao',
    code: 'HUB-SGN-12',
    label: 'KCN Tân Tạo',
    area: 'Bình Tân, TP. HCM',
    address: 'Quốc lộ 1A, Phường Tân Tạo A, Quận Bình Tân, TP. HCM',
    coords: [10.7512, 106.5824],
    primaryHighways: 'Quốc lộ 1A – Đường số 2 KCN Tân Tạo – Võ Văn Kiệt',
    customsGate: 'Trạm giám sát hàng container Tây Nam TP.HCM',
    evChargers: '6 trụ sạc DC 180kW',
    maxWeightTons: 40,
    coldChainSupport: 'Kho bảo quản thủy hải sản & nông sản'
  }
];

/**
 * 1.1. DANH MỤC TRANG BỊ IOT CONTAINER & KHÓA SEAL ĐIỆN TỬ (SMART CONTAINER HARDWARE)
 */
export const SMART_CONTAINER_CATALOG = [
  {
    typeId: '40_REEFER',
    label: 'Container Lạnh Thông Minh 40ft High Cube (Smart Reefer)',
    isoType: '45R1',
    description:
      'Thùng lạnh cách nhiệt Polyurethane cao cấp, tích hợp cổng viễn thông máy lạnh Carrier/Thermo King và khóa E-Seal hải quan.',
    telematicsUnit: 'Carrier DataCOLD 600 / Nexxiot Globehopper Edge 3',
    sensors: [
      'Cảm biến nhiệt độ gió cấp (Supply Air Temp: -18.4°C)',
      'Cảm biến nhiệt độ gió hồi (Return Air Temp: -17.9°C)',
      'Cảm biến độ ẩm chuỗi lạnh (Humidity %RH: 88%)',
      'Gia tốc kế 3 trục đo chấn động va đập (3-Axis Shock G-Force)',
      'Cảm biến tế bào quang học phát hiện mở cửa (Optical Door Breach)'
    ],
    eSealModel: 'Khóa Seal Chốt Điện Tử GPS Hải Quan ISO 17712 (Chống phá khóa & Geofence)',
    powerSpec: 'Pin Li-SOCl2 19Ah (tuổi thọ 7 năm) + Tấm sạc Solar Harvester 45W nóc thùng',
    connectivity: '4G LTE-M / NB-IoT đa mạng toàn cầu + Vệ tinh LEO Direct + BLE 5.2 Mesh',
    tareWeightKg: 4480,
    maxPayloadKg: 29520,
    cubicCapacityM3: 67.9
  },
  {
    typeId: '40_DRY_HC',
    label: 'Container Khô 40ft High Cube IoT (Smart General Dry Box)',
    isoType: '45G1',
    description:
      'Vỏ thép Corten chống rỉ sét, gắn hộp đen năng lượng mặt trời Orbcomm CT 3500 và cảm biến thể tích hàng hóa siêu âm.',
    telematicsUnit: 'Orbcomm CT 3500 Solar Asset Tracker',
    sensors: [
      'Cảm biến thể tích hàng hóa siêu âm (Ultrasonic Cargo Load Sensor)',
      'Gia tốc kế 3 trục đo dằn xóc và lật xe (3-Axis Accelerometer)',
      'Công tắc từ cánh cửa (Magnetic Door Contact Sensor)'
    ],
    eSealModel: 'Khóa Seal Cáp Thép RFID / Cellular E-Seal',
    powerSpec: 'Tấm năng lượng mặt trời vĩnh cửu + Pin dự phòng 10 năm',
    connectivity: '4G LTE-M / NB-IoT + Ăng-ten GNSS đa hệ thống (GPS/Galileo/BeiDou)',
    tareWeightKg: 3900,
    maxPayloadKg: 28600,
    cubicCapacityM3: 76.4
  },
  {
    typeId: '20_STANDARD',
    label: 'Container 20ft Tiêu Chuẩn IoT (Smart Standard 20ft)',
    isoType: '22G1',
    description:
      'Kích thước tiêu chuẩn 20ft phù hợp hàng tải trọng nặng, gắn chip định vị viễn thông Sensitech TempTale GEO.',
    telematicsUnit: 'Sensitech TempTale GEO / CalAmp TTU-2830',
    sensors: [
      'Ăng-ten định vị GPS/GLONASS độ nhạy cao',
      'Cảm biến chuyển động và nhiệt độ môi trường',
      'Khóa E-Seal điện tử kiểm soát hải quan'
    ],
    eSealModel: 'Chốt Khóa Điện Tử RFID/GPS E-Seal Hải Quan',
    powerSpec: 'Pin Lithium Thionyl Chloride 12Ah',
    connectivity: '4G LTE-M + Roaming Viettel/Vinaphone/Mobifone',
    tareWeightKg: 2200,
    maxPayloadKg: 28280,
    cubicCapacityM3: 33.2
  }
];

export function generateContainerIsoCode(prefix = 'TCKU') {
  const serial = Math.floor(100000 + Math.random() * 899999);
  const checkDigit = Math.floor(Math.random() * 10);
  return `${prefix}-${serial}-${checkDigit}`;
}

export function generateESealNumber() {
  const code = Math.floor(100000 + Math.random() * 899999);
  return `VN-CUST-${code}`;
}

/**
 * 2. DANH MỤC ĐỘI XE CHUẨN QUỐC TẾ & ĐỊNH MỨC PHÁT THẢI GLEC v3.0
 */
export const STANDARD_FLEET_CATALOG = [
  {
    modelCode: 'EV-TRACTOR-40T',
    modelName: 'Hyundai Xcient / Volvo FH Electric 40T',
    powertrainId: 'ev',
    vehicleTypeLabel: 'Xe đầu kéo điện (EV)',
    category: 'Đầu kéo Container điện hạng nặng (Heavy-Duty BEV)',
    maxPayloadTons: 36,
    batteryOrTank: 'Pin LFP 350 kWh • Sạc nhanh DC 250kW',
    consumptionSpec: '122 kWh / 100 km',
    wttIntensityG: 64.8,
    ttwIntensityG: 0.0,
    wtwIntensityG: 64.8,
    baselineIntensityG: 108.0,
    reductionPct: 40.0,
    baseRatePerKmVnd: 26500,
    samplePlate: '51C-888.99',
    driverName: 'Nguyễn Văn Tài',
    driverLicense: 'Hạng FC • 9 năm kinh nghiệm',
    driverPhone: '0903 812 456',
    certStandard: 'GLEC v3.0 Zero-Tailpipe BEV'
  },
  {
    modelCode: 'EV-REEFER-18T',
    modelName: 'VinFast / BYD ETM6 e-Reefer Chuỗi Lạnh',
    powertrainId: 'ev',
    vehicleTypeLabel: 'Xe đầu kéo điện (EV)',
    category: 'Xe tải lạnh điện chuyên dụng (-22°C đến +2°C)',
    maxPayloadTons: 18,
    batteryOrTank: 'Pin LFP 255 kWh + Hệ thống lạnh e-PTO độc lập',
    consumptionSpec: '98 kWh / 100 km',
    wttIntensityG: 66.5,
    ttwIntensityG: 0.0,
    wtwIntensityG: 66.5,
    baselineIntensityG: 108.0,
    reductionPct: 38.4,
    baseRatePerKmVnd: 25500,
    samplePlate: '51C-704.33',
    driverName: 'Lê Minh Khôi',
    driverLicense: 'Hạng FC • 7 năm kinh nghiệm',
    driverPhone: '0908 551 209',
    certStandard: 'GLEC v3.0 Cold-Chain BEV'
  },
  {
    modelCode: 'EURO5-SCR-32T',
    modelName: 'Isuzu Giga / Hino 700 Series Euro 5 SCR',
    powertrainId: 'euro5',
    vehicleTypeLabel: 'Xe tải chuẩn Euro 5',
    category: 'Đầu kéo Container chuẩn Euro 5 (Xúc tác chọn lọc SCR + AdBlue)',
    maxPayloadTons: 34,
    batteryOrTank: 'Bình Diesel 400L + Bình dung dịch AdBlue 45L',
    consumptionSpec: '27.5 Lít Diesel / 100 km',
    wttIntensityG: 14.2,
    ttwIntensityG: 65.7,
    wtwIntensityG: 79.9,
    baselineIntensityG: 108.0,
    reductionPct: 26.0,
    baseRatePerKmVnd: 27500,
    samplePlate: '51D-662.18',
    driverName: 'Trần Hoàng Nam',
    driverLicense: 'Hạng FC • 11 năm kinh nghiệm',
    driverPhone: '0914 720 881',
    certStandard: 'ISO 14083 Euro-V Low-NOx'
  },
  {
    modelCode: 'EURO5-BOX-20T',
    modelName: 'Hino 500 Series FG Euro 5 Thùng Kín',
    powertrainId: 'euro5',
    vehicleTypeLabel: 'Xe tải chuẩn Euro 5',
    category: 'Xe tải nặng thùng bảo ôn chuẩn Euro 5',
    maxPayloadTons: 20,
    batteryOrTank: 'Bình Diesel 260L + Phun nhiên liệu điện tử Common Rail',
    consumptionSpec: '22.4 Lít Diesel / 100 km',
    wttIntensityG: 14.8,
    ttwIntensityG: 66.8,
    wtwIntensityG: 81.6,
    baselineIntensityG: 108.0,
    reductionPct: 24.4,
    baseRatePerKmVnd: 25000,
    samplePlate: '61C-419.52',
    driverName: 'Phạm Quốc Tuấn',
    driverLicense: 'Hạng C/FC • 8 năm kinh nghiệm',
    driverPhone: '0989 341 612',
    certStandard: 'ISO 14083 Euro-V Verified'
  },
  {
    modelCode: 'DIESEL-BASE-28T',
    modelName: 'Hyundai HD320 / Daewoo Maximus Diesel',
    powertrainId: 'diesel',
    vehicleTypeLabel: 'Xe diesel thông thường',
    category: 'Đầu kéo Diesel truyền thống (Áp dụng tối ưu lộ trình xanh UC05)',
    maxPayloadTons: 30,
    batteryOrTank: 'Bình Diesel 380L (Mốc đối chứng Baseline)',
    consumptionSpec: '33.8 Lít Diesel / 100 km',
    wttIntensityG: 16.4,
    ttwIntensityG: 83.0,
    wtwIntensityG: 99.4,
    baselineIntensityG: 108.0,
    reductionPct: 8.0,
    baseRatePerKmVnd: 28500,
    samplePlate: '51D-402.11',
    driverName: 'Võ Thành Đạt',
    driverLicense: 'Hạng FC • 6 năm kinh nghiệm',
    driverPhone: '0937 618 904',
    certStandard: 'GLEC v3.0 Route-Optimized'
  }
];

/**
 * 3. PHƯƠNG ÁN TỐI ƯU HÓA LỘ TRÌNH ĐA TIÊU CHÍ PARETO (UC05)
 */
export const PARETO_ROUTING_MODES = [
  {
    id: 'ECO_GREEN',
    label: 'Ưu tiên Xanh nhất (Min CO2e)',
    weightsLabel: 'w_CO2 = 0.60 • w_Time = 0.20 • w_Cost = 0.20',
    desc: 'Tối thiểu hóa phát thải khí nhà kính bằng cách chọn tốc độ ổn định 50-55 km/h và tránh điểm ùn tắc cầu Phú Mỹ / nút giao An Phú.',
    extraCo2Bonus: 0.02,
    etaMultiplier: 1.03,
    costMultiplier: 0.98
  },
  {
    id: 'PARETO_BALANCED',
    label: 'Cân bằng Tối ưu Pareto (Khuyến nghị)',
    weightsLabel: 'w_CO2 = 0.40 • w_Time = 0.35 • w_Cost = 0.25',
    desc: 'Điểm cân bằng Pareto tối ưu đồng thời cả 3 mục tiêu: Giảm phát thải WTW, đảm bảo SLA giao nhận và tối ưu phí cầu đường BOT.',
    extraCo2Bonus: 0.0,
    etaMultiplier: 1.0,
    costMultiplier: 1.0
  },
  {
    id: 'FAST_EXPRESS',
    label: 'Ưu tiên Nhanh nhất (Min ETA / SLA Gấp)',
    weightsLabel: 'w_CO2 = 0.20 • w_Time = 0.60 • w_Cost = 0.20',
    desc: 'Ưu tiên trục cao tốc và làn xanh giờ thấp điểm để rút ngắn tối đa thời gian vận chuyển cho lô hàng xuất tàu gấp.',
    extraCo2Bonus: -0.015,
    etaMultiplier: 0.9,
    costMultiplier: 1.04
  }
];

/**
 * 4. TÍNH TOÁN KHOA HỌC PHÁT THẢI CARBON GLEC v3.0 & CƯỚC PHÍ CHI TIẾT
 */
export function calculateDetailedGlecQuote({
  originId,
  destinationId,
  cargoWeightTons = 16,
  powertrainId = 'ev',
  paretoModeId = 'PARETO_BALANCED'
}) {
  const realRoute = getRealRoadRoute(originId, destinationId);
  const distanceKm = Number(realRoute.distanceKm) || 28.9;
  const weight = Math.max(1, Number(cargoWeightTons) || 16);
  const tonneKm = Math.round(distanceKm * weight * 10) / 10;

  const pareto = PARETO_ROUTING_MODES.find((m) => m.id === paretoModeId) || PARETO_ROUTING_MODES[1];

  // Baseline Diesel Euro 3 according to GLEC Framework v3.0 (108.0 gCO2e / tonne-km WTW)
  const baselineIntensityG = 108.0;
  const baselineCo2Kg = Math.round(tonneKm * (baselineIntensityG / 1000) * 10) / 10;

  // Base reduction by powertrain:
  // EV: 32% powertrain + 8% green routing = 40%
  // Euro 5: 18% powertrain + 8% green routing = 26%
  // Diesel: 0% powertrain + 8% green routing = 8%
  const baseReduction = powertrainId === 'ev' ? 0.4 : powertrainId === 'euro5' ? 0.26 : 0.08;
  const totalReductionRatio = Math.max(0.05, Math.min(0.55, baseReduction + pareto.extraCo2Bonus));

  const actualCo2Kg = Math.round(baselineCo2Kg * (1 - totalReductionRatio) * 10) / 10;
  const savedCo2Kg = Math.round((baselineCo2Kg - actualCo2Kg) * 10) / 10;
  const reductionPct = Math.round(totalReductionRatio * 1000) / 10;
  const actualIntensityG = Math.round(((actualCo2Kg * 1000) / Math.max(1, tonneKm)) * 10) / 10;

  // Split WTW into WTT (Well-to-Tank) and TTW (Tank-to-Wheel)
  const ttwCo2Kg = powertrainId === 'ev' ? 0.0 : Math.round(actualCo2Kg * 0.82 * 10) / 10;
  const wttCo2Kg = Math.round((actualCo2Kg - ttwCo2Kg) * 10) / 10;

  // Energy / Fuel consumed
  const energyConsumed =
    powertrainId === 'ev'
      ? Math.round(distanceKm * (0.95 + weight * 0.018) * 10) / 10
      : Math.round(distanceKm * (0.21 + weight * 0.0045) * 10) / 10;
  const energyUnit = powertrainId === 'ev' ? 'kWh điện sạch' : 'Lít Diesel';

  // Duration & ETA
  const rawDuration = Number(realRoute.durationMinutes) || Math.round((distanceKm / 52) * 60);
  const etaMinutes = Math.max(15, Math.round(rawDuration * pareto.etaMultiplier));

  // Transparent Cost Breakdown (VND)
  const baseTransportCostVnd = Math.round((distanceKm * 26500) / 1000) * 1000;
  const payloadSurchargeVnd = Math.round((weight * 85000) / 1000) * 1000;
  const tollFeeVnd = distanceKm > 40 ? 165000 : distanceKm > 22 ? 85000 : 45000;
  const greenDiscountVnd =
    powertrainId === 'ev'
      ? Math.round(((baseTransportCostVnd + payloadSurchargeVnd) * 0.06) / 1000) * 1000
      : powertrainId === 'euro5'
        ? Math.round(((baseTransportCostVnd + payloadSurchargeVnd) * 0.03) / 1000) * 1000
        : 0;

  const estimatedCostVnd =
    Math.round(
      ((baseTransportCostVnd + payloadSurchargeVnd + tollFeeVnd - greenDiscountVnd) *
        pareto.costMultiplier) /
        1000
    ) * 1000;

  return {
    distanceKm,
    tonneKm,
    etaMinutes,
    baselineIntensityG,
    actualIntensityG,
    baselineCo2Kg,
    wttCo2Kg,
    ttwCo2Kg,
    actualCo2Kg,
    savedCo2Kg,
    reductionPct,
    energyConsumed,
    energyUnit,
    baseTransportCostVnd,
    payloadSurchargeVnd,
    tollFeeVnd,
    greenDiscountVnd,
    estimatedCostVnd,
    previewWaypoints: realRoute.points
  };
}

/**
 * 5. TẠO BẢNG NHẬT KÝ ĐIỂM CHỐT GIAO THÔNG THỰC TẾ TRÊN TUYẾN (HIGHWAY CHECKPOINTS)
 */
const CORRIDOR_HIGHWAY_SEGMENTS = {
  catlai_vsip: [
    {
      pct: 0,
      name: 'Cổng Cảng Cát Lái (Trạm cân & Hải quan KV1)',
      road: 'Đường Nguyễn Thị Định, TP. Thủ Đức'
    },
    { pct: 16, name: 'Nút giao Mỹ Thủy & Cầu Kỳ Hà', road: 'Đường Võ Chí Công (Vành Đai 2 Đông)' },
    { pct: 44, name: 'Nút giao Trạm 2 & Cầu Rạch Chiếc', road: 'Xa lộ Hà Nội – Quốc lộ 1A' },
    {
      pct: 74,
      name: 'Trạm thu phí Vĩnh Phú – Cửa ngõ Bình Dương',
      road: 'Quốc lộ 13 (Đại lộ Bình Dương)'
    },
    {
      pct: 100,
      name: 'Cổng KCN VSIP 1 – Trung tâm Phân phối',
      road: 'Số 8 Đại lộ Hữu Nghị, Thuận An'
    }
  ],
  catlai_songthan: [
    { pct: 0, name: 'Cổng Cảng Cát Lái (Khu A/B)', road: 'Đường Nguyễn Thị Định, TP. Thủ Đức' },
    { pct: 20, name: 'Nút giao Mỹ Thủy – Vành Đai 2', road: 'Đường Võ Chí Công, TP. Thủ Đức' },
    { pct: 55, name: 'Ngã tư Thủ Đức – Khu Công Nghệ Cao', road: 'Xa lộ Hà Nội' },
    { pct: 82, name: 'Cầu vượt Sóng Thần – Quốc lộ 1A', road: 'Đại lộ Độc Lập, Dĩ An' },
    { pct: 100, name: 'Cổng ICD Sóng Thần – Kho ngoại quan', road: 'Phường An Bình, TP. Dĩ An' }
  ],
  catlai_caimep: [
    { pct: 0, name: 'Cổng Cảng Cát Lái', road: 'Đường Nguyễn Thị Định, TP. Thủ Đức' },
    {
      pct: 18,
      name: 'Nút giao An Phú – ĐCT Long Thành',
      road: 'Cao tốc TP.HCM – Long Thành – Dầu Giây'
    },
    { pct: 48, name: 'Nút giao Quốc lộ 51 – Long Thành', road: 'Quốc lộ 51, Đồng Nai' },
    { pct: 78, name: 'KCN Phú Mỹ 1 – Thị xã Phú Mỹ', road: 'Đường Liên Cảng Cái Mép – Thị Vải' },
    { pct: 100, name: 'Cảng Quốc tế Cái Mép (CMIT/TCTT)', road: 'Phường Phước Hòa, Phú Mỹ, BR-VT' }
  ],
  catlai_tanbinh: [
    { pct: 0, name: 'Cổng Cảng Cát Lái', road: 'Đường Nguyễn Thị Định, TP. Thủ Đức' },
    { pct: 24, name: 'Cầu Phú Mỹ – Trục Vành Đai 2', road: 'Đường Võ Chí Công, Quận 7' },
    { pct: 58, name: 'Nút giao Bình Thuận – Quốc lộ 1A', road: 'Đại lộ Nguyễn Văn Linh' },
    { pct: 82, name: 'Ngã tư An Sương – Cửa ngõ Tây Bắc', road: 'Đường Trường Chinh – QL1A' },
    { pct: 100, name: 'Cổng KCN Tân Bình (Khu A/B)', road: 'Đường Tây Thạnh, Quận Tân Phú' }
  ],
  catlai_nhontrach: [
    { pct: 0, name: 'Cổng Cảng Cát Lái', road: 'Đường Nguyễn Thị Định, TP. Thủ Đức' },
    { pct: 22, name: 'Nút giao Vành Đai 2 – Cao tốc Long Thành', road: 'ĐCT TP.HCM – Long Thành' },
    { pct: 56, name: 'Nút giao đường 319B kết nối Nhơn Trạch', road: 'Đường 319B, Đồng Nai' },
    {
      pct: 82,
      name: 'Trạm kiểm soát tải trọng KCN Nhơn Trạch',
      road: 'Đường Tôn Đức Thắng (ĐT 25B)'
    },
    { pct: 100, name: 'Tổng kho KCN Nhơn Trạch 1-6', road: 'ĐT 25B, Nhơn Trạch, Đồng Nai' }
  ],
  catlai_hiepphuoc: [
    { pct: 0, name: 'Cổng Cảng Cát Lái', road: 'Đường Nguyễn Thị Định, TP. Thủ Đức' },
    { pct: 25, name: 'Cầu Phú Mỹ – Vượt sông Sài Gòn', road: 'Trục Vành Đai 2 Nam' },
    { pct: 55, name: 'Nút giao Nguyễn Văn Linh & Nguyễn Hữu Thọ', road: 'Trục Bắc Nam TP.HCM' },
    { pct: 80, name: 'KCN Long Hậu – Cửa ngõ Hiệp Phước', road: 'Đường Nguyễn Văn Tạo, Nhà Bè' },
    { pct: 100, name: 'Cảng Tân Cảng Hiệp Phước', road: 'Khu B, KCN Hiệp Phước, Nhà Bè' }
  ],
  vsip_caimep: [
    { pct: 0, name: 'Cổng KCN VSIP 1', road: 'Số 8 Đại lộ Hữu Nghị, Thuận An' },
    { pct: 18, name: 'Nút giao Bình Phước & Quốc lộ 1A', road: 'Quốc lộ 13' },
    { pct: 45, name: 'Nút giao Trạm 2 – Vành Đai 2', road: 'Xa lộ Hà Nội' },
    { pct: 72, name: 'Trạm thu phí Long Phước & Nút giao QL51', road: 'ĐCT Long Thành – Dầu Giây' },
    { pct: 100, name: 'Cảng Quốc tế Cái Mép', road: 'Đường Liên Cảng Cái Mép – Thị Vải' }
  ]
};

export function buildRouteCheckpoints(
  originId,
  destId,
  originLabel,
  destLabel,
  distanceKm,
  progressPct
) {
  const key = `${originId}_${destId}`;
  const revKey = `${destId}_${originId}`;
  const dist = Number(distanceKm) || 28.9;
  const prog = Math.max(0, Math.min(100, Number(progressPct) || 0));

  let template = CORRIDOR_HIGHWAY_SEGMENTS[key];
  if (!template && CORRIDOR_HIGHWAY_SEGMENTS[revKey]) {
    template = CORRIDOR_HIGHWAY_SEGMENTS[revKey]
      .map((s) => ({
        ...s,
        pct: 100 - s.pct
      }))
      .reverse();
  }

  if (!template) {
    const oName = originLabel ? originLabel.split(',')[0] : 'Điểm xuất phát';
    const dName = destLabel ? destLabel.split(',')[0] : 'Điểm giao hàng';
    template = [
      {
        pct: 0,
        name: `Cổng xuất bến ${oName} (Trạm cân & Kiểm soát)`,
        road: 'Trục giao thông nội bộ & Cửa ngõ xuất phát'
      },
      {
        pct: 22,
        name: 'Nhập làn Trục Vành Đai / Quốc lộ chính',
        road: 'Hành lang vận tải logistics ưu tiên container'
      },
      {
        pct: 52,
        name: 'Nút giao Liên vùng & Trạm giám sát giao thông',
        road: 'Tuyến cao tốc / Quốc lộ liên tỉnh kết nối'
      },
      {
        pct: 80,
        name: `Cửa ngõ tiếp cận ${dName}`,
        road: 'Trục đường chính KCN / Cảng biển đích'
      },
      {
        pct: 100,
        name: `Cổng nhận hàng ${dName} (Bãi dỡ hàng)`,
        road: 'Điểm ký nhận điện tử ePOD & Bàn giao container'
      }
    ];
  }

  return template.map((cp, idx) => {
    const kmAtPoint = Number(((cp.pct / 100) * dist).toFixed(1));
    const nextPct = template[idx + 1]?.pct ?? 101;
    let state = 'UPCOMING';
    if (prog >= cp.pct && prog < nextPct && prog < 100) {
      state = 'CURRENT';
    } else if (prog >= cp.pct) {
      state = 'PASSED';
    }
    return {
      step: idx + 1,
      pct: cp.pct,
      kmAtPoint,
      name: cp.name,
      road: cp.road,
      state,
      deviationMeters: state === 'UPCOMING' ? null : Number((3.4 + (idx % 3) * 1.2).toFixed(1))
    };
  });
}
