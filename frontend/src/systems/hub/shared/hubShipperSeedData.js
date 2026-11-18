// Seed & helper data for Trụ sở Đình Bảng - Từ Sơn - Bắc Ninh (HUB-DINHBANG-BN),
// Hub-bound Shipper Policies, Code-Range Task Assignments, Sender/Receiver details,
// and Photo POD / Tracking timeline.

export const DINHBANG_HUB = {
  id: '55555555-5555-4555-8555-555555550000',
  hubCode: 'HUB-DINHBANG-BN',
  shortName: 'Trụ sở Đình Bảng • Từ Sơn, Bắc Ninh',
  hubName: 'Trụ sở Giao nhận Đình Bảng • Từ Sơn, Bắc Ninh',
  companyName: 'ViettelPost & Kinh Bắc 3PL Hub',
  externalSystemName: 'VTP SmartHub DMS Bắc Ninh v4',
  webhookEndpoint: 'https://dms-bacninh.viettelpost.example.vn/webhooks/ccadro/handover',
  address: 'Đường Trần Phú, P. Đình Bảng, TP. Từ Sơn, Tỉnh Bắc Ninh',
  districtZone: 'P. Đình Bảng - KCN Tiên Sơn - KCN VSIP Bắc Ninh - Phố Mới',
  centerLat: 21.1145,
  centerLng: 105.9585,
  coverageRadiusKm: 5.5
};

export const DINHBANG_HANDOVER = {
  id: '44444444-4444-4444-8444-444444440000',
  containerCode: 'VNBN-202688-1',
  shipmentCode: 'SHP-2026-9901',
  hubCode: 'HUB-DINHBANG-BN',
  destinationHub: 'Trụ sở Đình Bảng • TP. Từ Sơn, Bắc Ninh',
  shipperCompany: 'ViettelPost & Kinh Bắc 3PL Hub',
  externalSystemName: 'VTP SmartHub DMS Bắc Ninh v4',
  externalTrackingRef: 'BN-DINHBANG-9901',
  webhookEndpoint: 'https://dms-bacninh.viettelpost.example.vn/webhooks/ccadro/handover',
  dockGate: 'Cổng A1 • Băng chuyền Phân tuyến Từ Sơn',
  handoverStatus: 'AT_GATE_DOCKED',
  manifestParcelCount: 6,
  manifestTotalWeightKg: 1210,
  manifestIngested: true,
  driverCode: 'DRV-EV-009',
  driverName: 'Hoàng Văn Hùng',
  driverPhone: '0971 228 994',
  vehiclePlate: '99C-088.19',
  etaMinutes: 0,
  tempC: -15.2,
  eSealNumber: 'VN-BN-990188',
  epodSignedBy: null,
  epodSignatureHash: null,
  lastSyncStatus: 'MANIFEST_INGESTED',
  lastSyncPayload:
    '{"event":"CONTAINER_MANIFEST_INGESTED","containerCode":"VNBN-202688-1","hubCode":"HUB-DINHBANG-BN","items":"PKG-DB-0001..PKG-DB-0006"}',
  lastSyncedAt: new Date(Date.now() - 20 * 60000).toISOString()
};

export const DINHBANG_SHIPPERS = [
  {
    id: '66666666-6666-4666-8666-666666660001',
    shipperCode: 'SHP-BN-001',
    hubCode: 'HUB-DINHBANG-BN',
    accountUsername: 'shipper',
    fullName: 'Nguyễn Văn Bắc',
    phone: '0978 312 689',
    vehicleType: 'Xe Van Lạnh EV 1.5T',
    vehiclePlate: '99C-182.68',
    assignedZoneName: 'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn',
    todayDeliveryScope:
      'Phường Đình Bảng (Khu phố Thượng, Khu phố Hạ, Đường Trần Phú) & Cụm KCN Tiên Sơn Cổng Bắc',
    assignedCodeRangeFrom: 'PKG-DB-0001',
    assignedCodeRangeTo: 'PKG-DB-0003',
    assignedLat: 21.1168,
    assignedLng: 105.9612,
    coverageRadiusKm: 2.2,
    currentLat: 21.116,
    currentLng: 105.9604,
    coldChainCapable: true,
    maxCapacityKg: 1500,
    currentLoadKg: 480,
    activeItemCount: 3,
    shiftStatus: 'AVAILABLE',
    rating: 4.98
  },
  {
    id: '66666666-6666-4666-8666-666666660002',
    shipperCode: 'SHP-BN-002',
    hubCode: 'HUB-DINHBANG-BN',
    accountUsername: 'shipper_bn2',
    fullName: 'Trần Đình Sơn',
    phone: '0982 604 115',
    vehicleType: 'Xe Tải Nhẹ EV 2.0T',
    vehiclePlate: '99C-245.19',
    assignedZoneName: 'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng',
    todayDeliveryScope: 'Khu Công Nghiệp VSIP Bắc Ninh (Đường số 1 - số 6), Xã Phù Chẩn, TP. Từ Sơn',
    assignedCodeRangeFrom: 'PKG-DB-0004',
    assignedCodeRangeTo: 'PKG-DB-0005',
    assignedLat: 21.0985,
    assignedLng: 105.971,
    coverageRadiusKm: 2.5,
    currentLat: 21.0992,
    currentLng: 105.9701,
    coldChainCapable: false,
    maxCapacityKg: 2000,
    currentLoadKg: 520,
    activeItemCount: 2,
    shiftStatus: 'AVAILABLE',
    rating: 4.94
  },
  {
    id: '66666666-6666-4666-8666-666666660003',
    shipperCode: 'SHP-BN-003',
    hubCode: 'HUB-DINHBANG-BN',
    accountUsername: 'shipper_bn3',
    fullName: 'Lê Hoàng Kinh Bắc',
    phone: '0916 882 309',
    vehicleType: 'Xe Van Lạnh EV 1.5T',
    vehiclePlate: '99C-309.77',
    assignedZoneName: 'Tuyến 03: P. Đồng Nguyên - Trang Hạ - Chợ Giầu Từ Sơn',
    todayDeliveryScope: 'Phường Đồng Nguyên, Chợ Giầu, Khu đô thị Đền Đô, TP. Từ Sơn',
    assignedCodeRangeFrom: 'PKG-DB-0006',
    assignedCodeRangeTo: 'PKG-DB-0006',
    assignedLat: 21.124,
    assignedLng: 105.951,
    coverageRadiusKm: 2.3,
    currentLat: 21.1232,
    currentLng: 105.952,
    coldChainCapable: true,
    maxCapacityKg: 1500,
    currentLoadKg: 210,
    activeItemCount: 1,
    shiftStatus: 'AVAILABLE',
    rating: 4.95
  }
];

export const SAMPLE_POD_IMAGE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#065f46"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <rect width="640" height="380" rx="18" fill="url(#bg)"/>
      <rect x="28" y="28" width="584" height="324" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
      <rect x="210" y="96" width="220" height="150" rx="14" fill="#fbbf24" stroke="#f59e0b" stroke-width="3"/>
      <rect x="210" y="138" width="220" height="24" fill="#78350f" opacity="0.22"/>
      <rect x="288" y="96" width="44" height="150" fill="#fef3c7" opacity="0.72"/>
      <circle cx="430" cy="112" r="28" fill="#10b981" stroke="#ffffff" stroke-width="4"/>
      <path d="M417 112 l9 9 l18 -18" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="320" y="294" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="bold">ẢNH XÁC THỰC POD • GIAO THÀNH CÔNG</text>
      <text x="320" y="324" text-anchor="middle" fill="#d1fae5" font-family="monospace" font-size="14">GPS Verified • Trụ sở Đình Bảng, Từ Sơn, Bắc Ninh</text>
    </svg>`
  );

export const SAMPLE_POD_PRESETS = [
  {
    id: 'pod-warehouse',
    label: 'Ảnh bàn giao tại Kho Người nhận (Tem + Kệ)',
    caption: 'Đã bàn giao kiện hàng nguyên đai nguyên kiện tại cửa kho người nhận, đủ tem mã kiện',
    url: SAMPLE_POD_IMAGE_SVG
  },
  {
    id: 'pod-gate',
    label: 'Ảnh chụp trước Biển hiệu / Cổng KCN',
    caption: 'Xác thực chụp rõ kiện hàng trước cổng bảo vệ / cửa hàng người nhận kèm chữ ký thủ kho',
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380">
          <rect width="640" height="380" rx="18" fill="#0f172a"/>
          <rect x="30" y="30" width="580" height="320" rx="12" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
          <rect x="70" y="92" width="160" height="140" rx="10" fill="#0284c7" opacity="0.25" stroke="#38bdf8" stroke-width="2"/>
          <rect x="260" y="106" width="310" height="114" rx="12" fill="rgba(16,185,129,0.16)" stroke="#10b981" stroke-width="2"/>
          <text x="415" y="155" text-anchor="middle" fill="#34d399" font-family="sans-serif" font-size="18" font-weight="bold">CCADRO PHOTO POD</text>
          <text x="415" y="185" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="13">KCN VSIP / Đình Bảng • Ký nhận đủ</text>
          <text x="320" y="304" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="15">Ảnh xác thực điểm giao • Có lưu Timestamp & GPS</text>
        </svg>`
      )
  }
];

export const INITIAL_HUB_POLICIES = {
  'HUB-DINHBANG-BN': {
    hubCode: 'HUB-DINHBANG-BN',
    policyCode: 'POL-HUB-DINHBANG-2026',
    policyTitle: 'Chính sách Bảo mật & Giao nhận Nội khu — Trụ sở Đình Bảng, Từ Sơn, Bắc Ninh',
    dataIsolationRule:
      'Tài khoản Shipper thuộc Trụ sở Đình Bảng (HUB-DINHBANG-BN) chỉ được truy cập danh sách hàng hóa, phạm vi giao hàng và dải mã kiện hàng thuộc Trụ sở Đình Bảng. Nghiêm cấm truy xuất dữ liệu của trụ sở khác.',
    photoPodRule:
      'Bắt buộc chụp tối thiểu 01 ảnh thực tế kiện hàng tại điểm giao (rõ tem mã vạch PKG-DB-* và biển hiệu/kho người nhận) trước khi bấm Hoàn tất POD.',
    temperatureSlaRule:
      'Hàng linh kiện điện tử & thực phẩm lạnh phải duy trì thùng bảo ôn kín, giao trong vòng 90 phút kể từ lúc xuất kho Trụ sở Đình Bảng.',
    codAndPricingRule:
      'Shipper chỉ nhìn thấy thông tin Người gửi, Người nhận, Địa điểm, Khối lượng và Trạng thái giao nhận; hệ thống tự động ẩn toàn bộ giá trị Hợp đồng B2B của Chủ hàng (Customer).',
    maxDailyRadiusKm: 2.5,
    slaDeliveryMinutes: 90,
    requirePhotoPod: true,
    requireRecipientSignature: true,
    hideB2bContractValue: true
  },
  'HUB-AMATA-BH': {
    hubCode: 'HUB-AMATA-BH',
    policyCode: 'POL-HUB-AMATA-2026',
    policyTitle: 'Chính sách Vận hành Chuỗi Lạnh & Phân Tuyến — Trụ sở KCN Amata Biên Hòa',
    dataIsolationRule:
      'Cô lập dữ liệu 100% trong phạm vi Trụ sở Amata Biên Hòa (HUB-AMATA-BH). Shipper chỉ nhận và xử lý các kiện hàng trong dải mã được giao.',
    photoPodRule: 'Bắt buộc đính kèm hình ảnh kiện hàng tại Dock nhận và chữ ký xác nhận của thủ kho nhà máy.',
    temperatureSlaRule: 'Duy trì nhiệt độ thùng xe Van lạnh từ -18°C đến -12°C đối với hàng thủy sản đông lạnh.',
    codAndPricingRule: 'Ẩn chi phí cước B2B và hạn mức tín dụng Net-30 của Chủ hàng.',
    maxDailyRadiusKm: 2.5,
    slaDeliveryMinutes: 120,
    requirePhotoPod: true,
    requireRecipientSignature: true,
    hideB2bContractValue: true
  },
  'HUB-SHTP-Q9': {
    hubCode: 'HUB-SHTP-Q9',
    policyCode: 'POL-HUB-SHTP-2026',
    policyTitle: 'Chính sách Giao nhận Công nghệ Cao ESD — Trụ sở SHTP Quận 9',
    dataIsolationRule:
      'Tài khoản Shipper chỉ được phép xem dữ liệu hàng hóa thuộc Trụ sở SHTP Quận 9 (HUB-SHTP-Q9).',
    photoPodRule: 'Bắt buộc chụp ảnh niêm phong ESD và biên bản bàn giao tại cổng Cleanroom.',
    temperatureSlaRule: 'Đảm bảo độ ẩm < 45% và nhiệt độ 20°C ± 2°C cho khay Wafer bán dẫn.',
    codAndPricingRule: 'Bảo mật tuyệt đối giá trị lô hàng công nghệ cao và hợp đồng vận chuyển.',
    maxDailyRadiusKm: 2.2,
    slaDeliveryMinutes: 60,
    requirePhotoPod: true,
    requireRecipientSignature: true,
    hideB2bContractValue: true
  },
  'HUB-VSIP1-BD': {
    hubCode: 'HUB-VSIP1-BD',
    policyCode: 'POL-HUB-VSIP1-2026',
    policyTitle: 'Chính sách Phân phối FMCG & Siêu thị — Trụ sở VSIP 1 Thuận An',
    dataIsolationRule: 'Cô lập dữ liệu nội bộ Trụ sở VSIP 1 (HUB-VSIP1-BD) theo tài khoản Shipper.',
    photoPodRule: 'Bắt buộc chụp ảnh kiện hàng nguyên đai nguyên kiện tại quầy tiếp nhận.',
    temperatureSlaRule: 'Tuân thủ chuẩn bảo quản mát 4°C cho nhóm hàng sữa và thực phẩm.',
    codAndPricingRule: 'Chỉ hiển thị dữ liệu vận hành giao nhận, ẩn dữ liệu tài chính B2B.',
    maxDailyRadiusKm: 2.5,
    slaDeliveryMinutes: 120,
    requirePhotoPod: true,
    requireRecipientSignature: true,
    hideB2bContractValue: true
  },
  'HUB-NT2-DN': {
    hubCode: 'HUB-NT2-DN',
    policyCode: 'POL-HUB-NT2-2026',
    policyTitle: 'Chính sách Kho Lạnh Xuất Khẩu — Trụ sở Nhơn Trạch 2',
    dataIsolationRule: 'Cô lập dữ liệu nội bộ Trụ sở Nhơn Trạch 2 (HUB-NT2-DN) theo khu vực phân công.',
    photoPodRule: 'Bắt buộc lưu trữ ảnh chụp POD kèm tọa độ GPS và thời gian thực.',
    temperatureSlaRule: 'Kiểm soát nhiệt độ âm sâu -18°C xuyên suốt chặng cuối.',
    codAndPricingRule: 'Chỉ hiển thị thông tin vận đơn giao nhận chặng cuối.',
    maxDailyRadiusKm: 2.8,
    slaDeliveryMinutes: 120,
    requirePhotoPod: true,
    requireRecipientSignature: true,
    hideB2bContractValue: true
  }
};

export const INITIAL_TASK_RANGE_BATCHES = [
  {
    id: 'range-db-01',
    batchCode: 'BATCH-DB-2026-01',
    hubCode: 'HUB-DINHBANG-BN',
    shipperCode: 'SHP-BN-001',
    shipperName: 'Nguyễn Văn Bắc',
    fromItemCode: 'PKG-DB-0001',
    toItemCode: 'PKG-DB-0003',
    totalItems: 3,
    totalWeightKg: 350,
    assignedZoneScope:
      'Phường Đình Bảng (Khu phố Thượng, Khu phố Hạ, Đường Trần Phú) & Cụm KCN Tiên Sơn Cổng Bắc',
    batchStatus: 'ACTIVE_IN_SHIFT',
    assignedBy: 'Trưởng Trụ sở Đình Bảng',
    assignedAt: new Date(Date.now() - 45 * 60000).toISOString()
  },
  {
    id: 'range-db-02',
    batchCode: 'BATCH-DB-2026-02',
    hubCode: 'HUB-DINHBANG-BN',
    shipperCode: 'SHP-BN-002',
    shipperName: 'Trần Đình Sơn',
    fromItemCode: 'PKG-DB-0004',
    toItemCode: 'PKG-DB-0005',
    totalItems: 2,
    totalWeightKg: 650,
    assignedZoneScope:
      'Khu Công Nghiệp VSIP Bắc Ninh (Đường số 1 - số 6), Xã Phù Chẩn, TP. Từ Sơn',
    batchStatus: 'ACTIVE_IN_SHIFT',
    assignedBy: 'Trưởng Trụ sở Đình Bảng',
    assignedAt: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: 'range-db-03',
    batchCode: 'BATCH-DB-2026-03',
    hubCode: 'HUB-DINHBANG-BN',
    shipperCode: 'SHP-BN-003',
    shipperName: 'Lê Hoàng Kinh Bắc',
    fromItemCode: 'PKG-DB-0006',
    toItemCode: 'PKG-DB-0006',
    totalItems: 1,
    totalWeightKg: 210,
    assignedZoneScope: 'Phường Đồng Nguyên, Chợ Giầu, Khu đô thị Đền Đô, TP. Từ Sơn',
    batchStatus: 'ACTIVE_IN_SHIFT',
    assignedBy: 'Trưởng Trụ sở Đình Bảng',
    assignedAt: new Date(Date.now() - 25 * 60000).toISOString()
  }
];

export const DINHBANG_MANIFEST_ITEMS = [
  {
    id: '77777777-7777-4777-8777-777777770001',
    itemCode: 'PKG-DB-0001',
    sequenceNo: 1,
    containerCode: 'VNBN-202688-1',
    shipmentCode: 'SHP-2026-9901',
    hubCode: 'HUB-DINHBANG-BN',
    cargoName: 'Lô Thực phẩm Lạnh Cao Cấp CP Foods (18 Thùng Bảo Ôn)',
    cargoCategory: 'COLD_FROZEN',
    senderName: 'Nhà máy Chế biến Thực phẩm CP Hải Dương',
    senderPhone: '0220 3852 119',
    senderAddress: 'KCN Tân Trường, Cẩm Giàng, Hải Dương',
    consigneeName: 'Siêu thị Dabaco Từ Sơn - Chi nhánh Đình Bảng',
    consigneePhone: '0222 3741 882',
    deliveryAddress: 'Số 45 Đường Trần Phú, P. Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    deliveryZoneName: 'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn',
    deliveryLat: 21.1172,
    deliveryLng: 105.9618,
    weightKg: 180,
    parcelCount: 18,
    requiredTempC: -15,
    requiresColdChain: true,
    slaWindow: 'Giao trước 11:30 hôm nay',
    dispatchStatus: 'DELIVERED_POD',
    assignedShipperCode: 'SHP-BN-001',
    assignedShipperName: 'Nguyễn Văn Bắc',
    proximityDistanceKm: 0.08,
    matchScore: 99.4,
    dispatchReason: 'Giao theo dải mã PKG-DB-0001 -> PKG-DB-0003 • Cách vị trí phân công 0.08 km',
    proofImageUrl: SAMPLE_POD_IMAGE_SVG,
    proofImageCaption:
      'Ảnh chụp thực tế 18 thùng bảo ôn CP Foods bàn giao tại Kho nhận Siêu thị Dabaco Đình Bảng',
    proofUploadedAt: new Date(Date.now() - 35 * 60000).toISOString(),
    deliveredAt: new Date(Date.now() - 35 * 60000).toISOString(),
    recipientPodName: 'Lê Thị Mai (Quản lý Kho Dabaco Đình Bảng)',
    trackingHistoryJson: JSON.stringify([
      { time: '07:45', status: 'IN_CONTAINER', note: 'Container VNBN-202688-1 xuất bãi kho trung chuyển Hà Nội' },
      { time: '08:25', status: 'SYNCED_TO_HUB', note: 'Nhập băng chuyền Trụ sở Đình Bảng (HUB-DINHBANG-BN)' },
      { time: '08:32', status: 'ASSIGNED_TO_SHIPPER', note: 'Phân công theo dải PKG-DB-0001 -> PKG-DB-0003 cho Nguyễn Văn Bắc' },
      { time: '08:50', status: 'DELIVERED_POD', note: 'Đã giao hoàn tất & đính kèm ảnh chụp POD tại Siêu thị Dabaco' }
    ])
  },
  {
    id: '77777777-7777-4777-8777-777777770002',
    itemCode: 'PKG-DB-0002',
    sequenceNo: 2,
    containerCode: 'VNBN-202688-1',
    shipmentCode: 'SHP-2026-9901',
    hubCode: 'HUB-DINHBANG-BN',
    cargoName: 'Thùng Linh kiện Mạch PCB Chính Hãng (12 Kiện Chống Tĩnh Điện)',
    cargoCategory: 'HIGH_VALUE_TECH',
    senderName: 'Công ty Điện tử Hansol Tech Việt Nam',
    senderPhone: '0222 3901 440',
    senderAddress: 'KCN Yên Phong I, H. Yên Phong, Tỉnh Bắc Ninh',
    consigneeName: 'Xưởng Lắp ráp Mạch Điện tử Kinh Bắc',
    consigneePhone: '0984 119 302',
    deliveryAddress: 'Lô B4, KCN Tiên Sơn (Cổng Bắc), P. Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    deliveryZoneName: 'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn',
    deliveryLat: 21.1195,
    deliveryLng: 105.9631,
    weightKg: 95,
    parcelCount: 12,
    requiredTempC: 20,
    requiresColdChain: false,
    slaWindow: 'Giao trước 13:30 hôm nay',
    dispatchStatus: 'OUT_FOR_DELIVERY',
    assignedShipperCode: 'SHP-BN-001',
    assignedShipperName: 'Nguyễn Văn Bắc',
    proximityDistanceKm: 0.36,
    matchScore: 96.5,
    dispatchReason: 'Giao theo dải mã PKG-DB-0001 -> PKG-DB-0003 • Shipper đang trên tuyến đường Trần Phú -> KCN Tiên Sơn',
    proofImageUrl: null,
    proofImageCaption: null,
    proofUploadedAt: null,
    deliveredAt: null,
    recipientPodName: null,
    trackingHistoryJson: JSON.stringify([
      { time: '08:25', status: 'SYNCED_TO_HUB', note: 'Nhập kho Trụ sở Đình Bảng • Xác nhận nguyên đai ESD' },
      { time: '08:32', status: 'ASSIGNED_TO_SHIPPER', note: 'Phân công theo dải PKG-DB-0001 -> PKG-DB-0003 cho Nguyễn Văn Bắc' },
      { time: '09:10', status: 'OUT_FOR_DELIVERY', note: 'Nguyễn Văn Bắc (99C-182.68) đang di chuyển tới KCN Tiên Sơn Cổng Bắc' }
    ])
  },
  {
    id: '77777777-7777-4777-8777-777777770003',
    itemCode: 'PKG-DB-0003',
    sequenceNo: 3,
    containerCode: 'VNBN-202688-1',
    shipmentCode: 'SHP-2026-9901',
    hubCode: 'HUB-DINHBANG-BN',
    cargoName: 'Tủ Dược phẩm & Kit Xét nghiệm Y tế (6 Kiện 2-8°C)',
    cargoCategory: 'COLD_PHARMA',
    senderName: 'Tổng Kho Dược phẩm Trung ương CPC1',
    senderPhone: '024 3868 1990',
    senderAddress: 'Cụm CN Hà Bình Phương, Thường Tín, Hà Nội',
    consigneeName: 'Phòng Khám Đa Khoa Quốc tế Kinh Đô Từ Sơn',
    consigneePhone: '0222 3833 555',
    deliveryAddress: 'Số 108 Đường Lý Thánh Tông, Phố Mới, P. Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    deliveryZoneName: 'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn',
    deliveryLat: 21.1154,
    deliveryLng: 105.9598,
    weightKg: 75,
    parcelCount: 6,
    requiredTempC: 4,
    requiresColdChain: true,
    slaWindow: 'Khẩn cấp trước 14:00',
    dispatchStatus: 'ASSIGNED_TO_SHIPPER',
    assignedShipperCode: 'SHP-BN-001',
    assignedShipperName: 'Nguyễn Văn Bắc',
    proximityDistanceKm: 0.21,
    matchScore: 98.1,
    dispatchReason: 'Giao theo dải mã PKG-DB-0001 -> PKG-DB-0003 • Xe Van Lạnh EV đáp ứng chuẩn 2-8°C',
    proofImageUrl: null,
    proofImageCaption: null,
    proofUploadedAt: null,
    deliveredAt: null,
    recipientPodName: null,
    trackingHistoryJson: JSON.stringify([
      { time: '08:25', status: 'SYNCED_TO_HUB', note: 'Kiểm tra cảm biến nhiệt độ 4.0°C đạt chuẩn tại Trụ sở Đình Bảng' },
      { time: '08:32', status: 'ASSIGNED_TO_SHIPPER', note: 'Nằm trong dải nhiệm vụ PKG-DB-0001 -> PKG-DB-0003 giao cho Nguyễn Văn Bắc' }
    ])
  },
  {
    id: '77777777-7777-4777-8777-777777770004',
    itemCode: 'PKG-DB-0004',
    sequenceNo: 4,
    containerCode: 'VNBN-202688-1',
    shipmentCode: 'SHP-2026-9901',
    hubCode: 'HUB-DINHBANG-BN',
    cargoName: 'Pallet Bao Bì In Offset Xuất Khẩu (20 Kiện)',
    cargoCategory: 'DRY_INDUSTRIAL',
    senderName: 'Công ty In Bao bì Sông Hồng',
    senderPhone: '024 3974 2210',
    senderAddress: 'KCN Sài Đồng B, Q. Long Biên, Hà Nội',
    consigneeName: 'Nhà máy Đồ Uống PepsiCo VSIP Bắc Ninh',
    consigneePhone: '0222 3765 900',
    deliveryAddress: 'Số 12 Đường số 3, KCN VSIP Bắc Ninh, TP. Từ Sơn, Bắc Ninh',
    deliveryZoneName: 'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng',
    deliveryLat: 21.0979,
    deliveryLng: 105.9722,
    weightKg: 340,
    parcelCount: 20,
    requiredTempC: 25,
    requiresColdChain: false,
    slaWindow: 'Giao trong ca chiều (16:00)',
    dispatchStatus: 'ASSIGNED_TO_SHIPPER',
    assignedShipperCode: 'SHP-BN-002',
    assignedShipperName: 'Trần Đình Sơn',
    proximityDistanceKm: 0.14,
    matchScore: 98.8,
    dispatchReason: 'Giao theo dải mã PKG-DB-0004 -> PKG-DB-0005 • Chốt trực tại KCN VSIP Bắc Ninh',
    proofImageUrl: null,
    proofImageCaption: null,
    proofUploadedAt: null,
    deliveredAt: null,
    recipientPodName: null,
    trackingHistoryJson: JSON.stringify([
      { time: '08:25', status: 'SYNCED_TO_HUB', note: 'Nhập Trụ sở Đình Bảng từ Container VNBN-202688-1' },
      { time: '08:35', status: 'ASSIGNED_TO_SHIPPER', note: 'Giao dải mã PKG-DB-0004 -> PKG-DB-0005 cho Trần Đình Sơn' }
    ])
  },
  {
    id: '77777777-7777-4777-8777-777777770005',
    itemCode: 'PKG-DB-0005',
    sequenceNo: 5,
    containerCode: 'VNBN-202688-1',
    shipmentCode: 'SHP-2026-9901',
    hubCode: 'HUB-DINHBANG-BN',
    cargoName: 'Phụ tùng Băng chuyền Tự động hóa (10 Kiện)',
    cargoCategory: 'DRY_INDUSTRIAL',
    senderName: 'Công ty Cơ Khí Chính Xác Thăng Long',
    senderPhone: '024 3881 7741',
    senderAddress: 'KCN Bắc Thăng Long, Đông Anh, Hà Nội',
    consigneeName: 'Công ty TNHH Điện tử Foster Bắc Ninh',
    consigneePhone: '0222 3768 411',
    deliveryAddress: 'Đường số 6, KCN VSIP Bắc Ninh, Xã Phù Chẩn, TP. Từ Sơn, Bắc Ninh',
    deliveryZoneName: 'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng',
    deliveryLat: 21.1002,
    deliveryLng: 105.9696,
    weightKg: 310,
    parcelCount: 10,
    requiredTempC: 25,
    requiresColdChain: false,
    slaWindow: 'Giao trong ca chiều (16:30)',
    dispatchStatus: 'SYNCED_TO_HUB',
    assignedShipperCode: 'SHP-BN-002',
    assignedShipperName: 'Trần Đình Sơn',
    proximityDistanceKm: 0.24,
    matchScore: 97.6,
    dispatchReason: 'Giao theo dải mã PKG-DB-0004 -> PKG-DB-0005 • Chờ xuất kho Trụ sở Đình Bảng',
    proofImageUrl: null,
    proofImageCaption: null,
    proofUploadedAt: null,
    deliveredAt: null,
    recipientPodName: null,
    trackingHistoryJson: JSON.stringify([
      { time: '08:25', status: 'SYNCED_TO_HUB', note: 'Đã kiểm đếm tại Trụ sở Đình Bảng, sẵn sàng xuất kho tuyến VSIP' }
    ])
  },
  {
    id: '77777777-7777-4777-8777-777777770006',
    itemCode: 'PKG-DB-0006',
    sequenceNo: 6,
    containerCode: 'VNBN-202688-1',
    shipmentCode: 'SHP-2026-9901',
    hubCode: 'HUB-DINHBANG-BN',
    cargoName: 'Hải sản & Cá Hồi Na Uy Tươi Sống (14 Thùng Gel Lạnh)',
    cargoCategory: 'COLD_FRESH',
    senderName: 'Kho Lạnh Thực phẩm Biển Đông Hải Phòng',
    senderPhone: '0225 3668 912',
    senderAddress: 'KCN Đình Vũ, Q. Hải An, Hải Phòng',
    consigneeName: 'Trung tâm Hội nghị & Nhà hàng Kinh Bắc Palace',
    consigneePhone: '0912 778 552',
    deliveryAddress: 'Số 22 Khu Phố Chợ Giầu, P. Đồng Nguyên, TP. Từ Sơn, Bắc Ninh',
    deliveryZoneName: 'Tuyến 03: P. Đồng Nguyên - Trang Hạ - Chợ Giầu Từ Sơn',
    deliveryLat: 21.1235,
    deliveryLng: 105.9518,
    weightKg: 210,
    parcelCount: 14,
    requiredTempC: 2,
    requiresColdChain: true,
    slaWindow: 'Giao trước 11:45 hôm nay',
    dispatchStatus: 'DELIVERED_POD',
    assignedShipperCode: 'SHP-BN-003',
    assignedShipperName: 'Lê Hoàng Kinh Bắc',
    proximityDistanceKm: 0.1,
    matchScore: 99.1,
    dispatchReason: 'Giao theo dải mã PKG-DB-0006 • Trực tiếp tại Chợ Giầu Từ Sơn',
    proofImageUrl: SAMPLE_POD_PRESETS[1].url,
    proofImageCaption: 'Đã giao đủ 14 thùng cá hồi gel lạnh 2°C tại Bếp Trung tâm Chợ Giầu Từ Sơn',
    proofUploadedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    deliveredAt: new Date(Date.now() - 18 * 60000).toISOString(),
    recipientPodName: 'Nguyễn Hữu Thắng (Bếp trưởng Kinh Bắc Palace)',
    trackingHistoryJson: JSON.stringify([
      { time: '08:25', status: 'SYNCED_TO_HUB', note: 'Nhập Trụ sở Đình Bảng • Duy trì 2.0°C' },
      { time: '08:40', status: 'ASSIGNED_TO_SHIPPER', note: 'Giao mã PKG-DB-0006 cho Lê Hoàng Kinh Bắc' },
      { time: '09:02', status: 'DELIVERED_POD', note: 'Hoàn tất giao kèm ảnh POD xác thực GPS Chợ Giầu' }
    ])
  }
];

export function parseTrackingTimeline(item) {
  if (Array.isArray(item?.trackingHistory)) return item.trackingHistory;
  if (item?.trackingHistoryJson) {
    try {
      const parsed = JSON.parse(item.trackingHistoryJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }
  const timeline = [
    {
      time: '07:50',
      status: 'IN_CONTAINER',
      note: `Hàng nằm trong Container ${item?.containerCode || 'Linehaul'} vận chuyển tới ${item?.hubCode}`
    }
  ];
  if (item?.dispatchStatus !== 'IN_CONTAINER') {
    timeline.push({
      time: '08:20',
      status: 'SYNCED_TO_HUB',
      note: `Đã đồng bộ dữ liệu sang Trụ sở ${item?.hubCode}`
    });
  }
  if (
    item?.dispatchStatus === 'ASSIGNED_TO_SHIPPER' ||
    item?.dispatchStatus === 'OUT_FOR_DELIVERY' ||
    item?.dispatchStatus === 'DELIVERED_POD'
  ) {
    timeline.push({
      time: '08:40',
      status: 'ASSIGNED_TO_SHIPPER',
      note: `Giao cho ${item?.assignedShipperName || 'Shipper nội khu'} (${item?.assignedShipperCode || ''})`
    });
  }
  if (item?.dispatchStatus === 'DELIVERED_POD') {
    timeline.push({
      time: '09:15',
      status: 'DELIVERED_POD',
      note: `Đã giao thành công • ${item?.recipientPodName || 'Đã ký & đính kèm ảnh POD'}`
    });
  }
  return timeline;
}

export function enrichSenderMetadata(item) {
  if (item.senderName && item.senderAddress) return item;
  const defaultsByHub = {
    'HUB-AMATA-BH': {
      senderName: 'Tổng Kho Cảng Cát Lái • Chủ hàng B2B Vinamilk & Nestlé',
      senderPhone: '028 3897 6620',
      senderAddress: 'Cổng B Cảng Cát Lái, TP. Thủ Đức, TP.HCM'
    },
    'HUB-SHTP-Q9': {
      senderName: 'Kho Công nghệ Cao Samsung SDS SHTP',
      senderPhone: '028 3736 1188',
      senderAddress: 'Lô I-3B Khu Công Nghệ Cao, TP. Thủ Đức'
    },
    'HUB-VSIP1-BD': {
      senderName: 'Nhà máy Phân phối Sữa & FMCG Bình Dương',
      senderPhone: '0274 3782 550',
      senderAddress: 'Số 10 Đại lộ Tự Do, KCN VSIP 1, Bình Dương'
    },
    'HUB-NT2-DN': {
      senderName: 'Kho Lạnh Xuất Khẩu Thủy Sản Đông Nam Bộ',
      senderPhone: '0251 3569 401',
      senderAddress: 'KCN Nhơn Trạch 2, H. Nhơn Trạch, Đồng Nai'
    }
  };
  const fallbackSender = defaultsByHub[item.hubCode] || {
    senderName: 'Trung tâm Khai thác Container CCADRO',
    senderPhone: '1900 6868',
    senderAddress: 'Kho Hub Trung tâm CCADRO'
  };
  return {
    ...fallbackSender,
    ...item
  };
}

