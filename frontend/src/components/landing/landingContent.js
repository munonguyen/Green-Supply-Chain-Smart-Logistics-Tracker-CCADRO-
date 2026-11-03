/**
 * Static marketing content for the public landing page.
 * Content is kept separate from presentation so copy can be updated
 * (or later served from a CMS / API) without touching layout code.
 *
 * NOTE: Figures on the public site are illustrative corporate reporting
 * snapshots. Operational numbers live in the internal console.
 */
import {
  Activity,
  Car,
  FileCheck2,
  Fuel,
  Leaf,
  Package,
  Radio,
  ShieldCheck,
  Timer,
  Trees,
  Truck
} from 'lucide-react';

const UNSPLASH = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const IMAGES = {
  hero: '/images/landing/hero-port.jpg',
  evTruck: '/images/landing/ev-truck-charging.jpg',
  warehouse: UNSPLASH('photo-1586528116311-ad8dd3c8310d'),
  containers: UNSPLASH('photo-1578575437130-527eed3abbec'),
  truckRoad: UNSPLASH('photo-1601584115197-04ecc0da31d7')
};

export const NAV_LINKS = [
  { id: 'tong-quan', label: 'Trang Chủ' },
  { id: 'dinh-huong', label: 'Định Hướng Net-Zero' },
  { id: 'giai-phap', label: 'Hệ Sinh Thái Giải Pháp' },
  { id: 'thong-ke-carbon', label: 'Thống Kê Phát Thải' },
  { id: 'tin-tuc', label: 'Tin Tức & Báo Cáo' }
];

export const PARTNERS = [
  'VINAMILK LOGISTICS',
  'SAMSUNG ELECTRONICS VN',
  'UNILEVER SUPPLY CHAIN',
  'TÂN CẢNG SÀI GÒN',
  'CẢNG QUỐC TẾ CÁI MÉP',
  'ICD SÓNG THẦN',
  'TH TRUE MILK',
  'VSIP GROUP'
];

/* ---------- Carbon reporting snapshot (cumulative, last 12 months) ---------- */
export const CARBON_SUMMARY = {
  savedKg: 318460,
  reductionPercent: 24.8,
  baselineTonnes: 1284.1,
  actualTonnes: 965.6,
  periodLabel: '11/2025 – 10/2026'
};

/** Monthly CO2e avoided (tonnes). Sum = CARBON_SUMMARY.savedKg / 1000. */
export const MONTHLY_SAVINGS = [
  { month: 'T11', tonnes: 18.6 },
  { month: 'T12', tonnes: 20.1 },
  { month: 'T1', tonnes: 21.4 },
  { month: 'T2', tonnes: 22.8 },
  { month: 'T3', tonnes: 24.5 },
  { month: 'T4', tonnes: 25.9 },
  { month: 'T5', tonnes: 27.3 },
  { month: 'T6', tonnes: 28.6 },
  { month: 'T7', tonnes: 30.2 },
  { month: 'T8', tonnes: 31.8 },
  { month: 'T9', tonnes: 32.9 },
  { month: 'T10', tonnes: 34.36 }
];

/** Reference conversion factors used for the "equivalent impact" tiles. */
export const EQUIVALENCE_FACTORS = {
  kgPerTreePerYear: 22,
  kgPerLitreDieselWtw: 3.17,
  kgPerCarPerYear: 4600
};

export const CARBON_EQUIVALENTS = [
  {
    icon: Trees,
    value: Math.round(CARBON_SUMMARY.savedKg / EQUIVALENCE_FACTORS.kgPerTreePerYear),
    unit: 'cây xanh',
    label: 'lượng CO2 hấp thụ trong 1 năm'
  },
  {
    icon: Fuel,
    value: Math.round(CARBON_SUMMARY.savedKg / EQUIVALENCE_FACTORS.kgPerLitreDieselWtw),
    unit: 'lít diesel',
    label: 'nhiên liệu hóa thạch không phải đốt'
  },
  {
    icon: Car,
    value: Math.round(CARBON_SUMMARY.savedKg / EQUIVALENCE_FACTORS.kgPerCarPerYear),
    unit: 'ô tô con',
    label: 'ngừng lưu thông trọn 1 năm'
  },
  {
    icon: FileCheck2,
    value: 648,
    unit: 'chứng nhận',
    label: 'phát thải ISO 14083 cấp cho chủ hàng'
  }
];

/* ---------- Enterprise metrics strip ---------- */
export const ENTERPRISE_METRICS = [
  {
    icon: Package,
    value: 12450,
    suffix: '',
    label: 'Chuyến hàng xanh',
    hint: 'Hoàn tất & được kiểm kê carbon',
    bars: [38, 46, 44, 58, 62, 70, 76, 88]
  },
  {
    icon: Truck,
    value: 42,
    suffix: '%',
    label: 'Đội xe phát thải thấp',
    hint: 'Xe điện & xe tải đạt chuẩn Euro 5',
    bars: [18, 22, 25, 28, 31, 35, 38, 42]
  },
  {
    icon: Timer,
    value: 98.6,
    decimals: 1,
    suffix: '%',
    label: 'Giao hàng đúng hẹn',
    hint: 'Trên 4 hành lang trọng điểm phía Nam',
    bars: [90, 92, 91, 94, 95, 96, 97, 98]
  },
  {
    icon: Radio,
    value: 2,
    prefix: '< ',
    suffix: ' giây',
    label: 'Độ trễ định vị',
    hint: 'Cập nhật vị trí xe liên tục 24/7',
    bars: [70, 64, 60, 52, 48, 40, 34, 28]
  }
];

/* ---------- Interactive corridor map + estimator ---------- */
/** Map nodes in SVG units (viewBox 560 x 420), stylised Southern Key Economic Region. */
export const MAP_NODES = [
  { id: 'vsip', label: 'KCN VSIP 1', area: 'Bình Dương', x: 205, y: 72 },
  { id: 'songthan', label: 'ICD Sóng Thần', area: 'Bình Dương', x: 262, y: 128 },
  { id: 'tanbinh', label: 'KCN Tân Bình', area: 'TP. HCM', x: 140, y: 178 },
  { id: 'catlai', label: 'Cảng Cát Lái', area: 'TP. Thủ Đức', x: 298, y: 206 },
  { id: 'nhontrach', label: 'KCN Nhơn Trạch', area: 'Đồng Nai', x: 382, y: 246 },
  { id: 'hiepphuoc', label: 'Cảng Hiệp Phước', area: 'TP. HCM', x: 230, y: 304 },
  { id: 'caimep', label: 'Cảng Cái Mép', area: 'Bà Rịa – Vũng Tàu', x: 452, y: 344 }
];

/**
 * Illustrative estimator constants (public marketing calculator only).
 * Production planning uses the GLEC v3 factors configured in the carbon service.
 */
export const ESTIMATOR = {
  kmPerMapUnit: 0.208,
  dieselBaselineKgPerTkm: 0.105,
  greenRoutingReduction: 0.08,
  dieselPriceVndPerLitre: 20500,
  tripsPerMonth: 26
};

export const POWERTRAINS = [
  {
    id: 'ev',
    name: 'Xe đầu kéo điện (EV)',
    desc: 'Không phát thải tại ống xả, sạc tại depot năng lượng mặt trời',
    reduction: 0.32
  },
  {
    id: 'euro5',
    name: 'Xe tải chuẩn Euro 5',
    desc: 'Xử lý khí thải SCR, phun nhiên liệu điện tử',
    reduction: 0.18
  },
  {
    id: 'diesel',
    name: 'Xe diesel thông thường',
    desc: 'Mốc đối chứng – chỉ áp dụng tối ưu lộ trình',
    reduction: 0
  }
];

/* ---------- Tracking console demo shipments ---------- */
export const DEMO_TRIP_ID = 'f0000000-0000-0000-0000-000000000001';

export const DEMO_SHIPMENTS = {
  SH001: {
    code: 'SH001',
    customer: 'Vinamilk Logistics Hub',
    origin: 'Cảng Cát Lái',
    originArea: 'TP. Thủ Đức, TP. HCM',
    destination: 'KCN VSIP 1',
    destinationArea: 'Thuận An, Bình Dương',
    vehicle: 'Xe đầu kéo điện',
    plate: '51C-888.99',
    status: 'Đang di chuyển trên hành lang xanh',
    location: 'Cầu Phú Hữu, Vành Đai 2',
    speed: 54,
    etaMinutes: 24,
    distanceKm: 32.4,
    temperature: -18.2,
    co2SavedKg: 18.6,
    co2Percent: 28.5,
    progress: 68,
    steps: [
      { label: 'Tiếp nhận vận đơn', time: '08:15', state: 'done' },
      { label: 'Kiểm định & xuất bến', time: '08:40', state: 'done' },
      { label: 'Trên hành lang vận tải', time: '09:12', state: 'active' },
      { label: 'Giao hàng & ký nhận', time: '09:45 dự kiến', state: 'todo' }
    ]
  },
  SH002: {
    code: 'SH002',
    customer: 'Samsung Electronics VN',
    origin: 'Cảng Cái Mép',
    originArea: 'Phú Mỹ, Bà Rịa – Vũng Tàu',
    destination: 'ICD Sóng Thần',
    destinationArea: 'Dĩ An, Bình Dương',
    vehicle: 'Xe tải container Euro 5',
    plate: '60B-772.14',
    status: 'Đã thông quan, đang rời cảng',
    location: 'Quốc lộ 51, Phú Mỹ',
    speed: 62,
    etaMinutes: 48,
    distanceKm: 64.2,
    temperature: 4.5,
    co2SavedKg: 34.2,
    co2Percent: 21.4,
    progress: 36,
    steps: [
      { label: 'Tiếp nhận vận đơn', time: '07:30', state: 'done' },
      { label: 'Kiểm định & xuất bến', time: '08:05', state: 'active' },
      { label: 'Trên hành lang vận tải', time: '09:30 dự kiến', state: 'todo' },
      { label: 'Giao hàng & ký nhận', time: '10:15 dự kiến', state: 'todo' }
    ]
  },
  SH003: {
    code: 'SH003',
    customer: 'TH True Milk Distribution',
    origin: 'Cảng Hiệp Phước',
    originArea: 'Nhà Bè, TP. HCM',
    destination: 'KCN Tân Bình',
    destinationArea: 'Tân Phú, TP. HCM',
    vehicle: 'Xe van điện giao hàng',
    plate: '50E-123.45',
    status: 'Sắp đến nơi, chuẩn bị bàn giao',
    location: 'Đường Cộng Hòa, Tân Bình',
    speed: 38,
    etaMinutes: 8,
    distanceKm: 28.1,
    temperature: 2.1,
    co2SavedKg: 14.8,
    co2Percent: 32.0,
    progress: 100,
    steps: [
      { label: 'Tiếp nhận vận đơn', time: '09:00', state: 'done' },
      { label: 'Kiểm định & xuất bến', time: '09:25', state: 'done' },
      { label: 'Trên hành lang vận tải', time: '09:50', state: 'done' },
      { label: 'Giao hàng & ký nhận', time: '10:10', state: 'active' }
    ]
  }
};

/* ---------- Net-zero roadmap ---------- */
export const ROADMAP = [
  {
    year: '2024',
    state: 'done',
    status: 'Hoàn thành',
    title: 'Số hóa toàn bộ vận đơn',
    desc: '100% chuyến hàng có định vị liên tục và vận đơn điện tử.'
  },
  {
    year: '2025',
    state: 'done',
    status: 'Hoàn thành',
    title: 'Chuẩn hóa kiểm kê carbon',
    desc: 'Áp dụng GLEC Framework v3 & ISO 14083 cho mọi hành lang.'
  },
  {
    year: '2026',
    state: 'current',
    status: 'Đang triển khai',
    title: 'Giảm 25% cường độ phát thải',
    desc: '42% đội xe phát thải thấp, lập tuyến xanh mặc định.'
  },
  {
    year: '2028',
    state: 'todo',
    status: 'Kế hoạch',
    title: '60% xe điện chặng đô thị',
    desc: 'Trạm sạc năng lượng mặt trời tại 4 depot trọng điểm.'
  },
  {
    year: '2030',
    state: 'todo',
    status: 'Mục tiêu',
    title: 'Net-Zero vận hành',
    desc: 'Giảm 50% cường độ phát thải, bù trừ phần còn lại.'
  }
];

export const PILLARS = [
  {
    icon: Leaf,
    title: 'Kiểm kê chuẩn quốc tế',
    desc: 'Hệ số Well-to-Wheel theo GLEC v3, sẵn sàng cho báo cáo ESG và yêu cầu CBAM của đối tác EU.'
  },
  {
    icon: Activity,
    title: 'Lập tuyến đa tiêu chí',
    desc: 'Cân bằng phát thải, thời gian, chi phí và rủi ro ùn tắc cho từng chuyến hàng.'
  },
  {
    icon: Truck,
    title: 'Chuyển đổi phương tiện sạch',
    desc: 'Lộ trình thay thế đội xe diesel bằng xe điện và xe đạt chuẩn Euro 5.'
  },
  {
    icon: ShieldCheck,
    title: 'Minh bạch dữ liệu',
    desc: 'Chứng nhận số cho từng chuyến, lưu vết kiểm toán phục vụ thẩm định độc lập.'
  }
];

/* ---------- Social proof ---------- */
export const TESTIMONIALS = [
  {
    metric: '-23,7%',
    metricLabel: 'phát thải hành lang Cát Lái – VSIP',
    quote:
      'Dữ liệu carbon theo từng chuyến giúp chúng tôi hoàn thành kiểm toán ESG nhanh gấp ba lần so với trước.',
    author: 'Nguyễn Thanh Tùng',
    role: 'Giám đốc Chuỗi cung ứng',
    company: 'Vinamilk Logistics'
  },
  {
    metric: '99,4%',
    metricLabel: 'tỷ lệ giao linh kiện đúng giờ',
    quote:
      'Cảnh báo lệch tuyến sớm và đề xuất lộ trình thay thế giúp hạm đội container luôn chủ động trước ùn tắc.',
    author: 'Park Jin Woo',
    role: 'Trưởng bộ phận Vận tải',
    company: 'Samsung Electronics VN'
  },
  {
    metric: '±0,1°C',
    metricLabel: 'kiểm soát nhiệt độ chuỗi lạnh',
    quote:
      'Báo cáo phát thải trên từng lô hàng đã trở thành lợi thế cạnh tranh của sản phẩm xuất khẩu của chúng tôi.',
    author: 'Lê Hoàng Yến',
    role: 'Phó Tổng Giám đốc Vận hành',
    company: 'TH True Milk'
  }
];

export const NEWS = [
  {
    id: 1,
    featured: true,
    category: 'Chiến lược ESG',
    date: '15/10/2026',
    readTime: '5 phút đọc',
    image: IMAGES.evTruck,
    title: 'Lộ trình Net-Zero 2030: chuyển đổi xanh toàn bộ hạm đội vận tải',
    summary:
      'Công bố kế hoạch đầu tư xe điện, trạm sạc năng lượng mặt trời và cam kết giảm 50% cường độ phát thải trước năm 2030.'
  },
  {
    id: 2,
    category: 'Hiệu quả dự án',
    date: '28/10/2026',
    readTime: '4 phút đọc',
    image: IMAGES.containers,
    title: 'Hành lang Cát Lái – VSIP cắt giảm 23,7% lượng CO2e',
    summary:
      'Lập tuyến đa tiêu chí và điều phối tránh ùn tắc tiết kiệm hàng nghìn lít nhiên liệu mỗi tháng.'
  },
  {
    id: 3,
    category: 'Công nghệ vận tải',
    date: '02/11/2026',
    readTime: '6 phút đọc',
    image: IMAGES.truckRoad,
    title: 'Giám sát lệch tuyến thời gian thực và chứng nhận ISO 14083',
    summary:
      'Cảnh báo sớm khi xe rời hành lang an toàn và cấp chứng nhận phát thải số cho khách hàng B2B.'
  }
];

export const FAQS = [
  {
    q: 'GLEC Framework v3 và ISO 14083 mang lại lợi ích gì cho doanh nghiệp xuất khẩu?',
    a: 'Đây là chuẩn hạch toán phát thải logistics được các thị trường EU, Mỹ, Nhật Bản công nhận cho báo cáo Scope 3. Dữ liệu từ CCADRO giúp doanh nghiệp đáp ứng yêu cầu kiểm toán của đối tác mà không phải tự tổng hợp thủ công.'
  },
  {
    q: 'Hệ thống phát hiện xe đi lệch tuyến như thế nào?',
    a: 'Mỗi lộ trình được bao quanh bởi hành lang an toàn. Khi xe vượt ngưỡng cảnh báo trong nhiều lần định vị liên tiếp, trung tâm điều hành nhận cảnh báo ngay và có thể xem đề xuất lộ trình thay thế.'
  },
  {
    q: 'Ai quyết định việc đổi lộ trình khi có sự cố giao thông?',
    a: 'Hệ thống chỉ đề xuất phương án khi lợi ích vượt ngưỡng tối thiểu. Điều phối viên luôn là người phê duyệt cuối cùng trước khi lộ trình mới được gửi tới tài xế.'
  },
  {
    q: 'Có thể kết nối với ERP hoặc phần mềm quản lý vận tải hiện có không?',
    a: 'Có. CCADRO cung cấp API chuẩn để đồng bộ đơn hàng, trạng thái chuyến và chứng nhận phát thải về hệ thống ERP/TMS của doanh nghiệp.'
  }
];
