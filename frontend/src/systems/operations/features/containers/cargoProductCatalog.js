/**
 * Danh mục chi tiết mã SKU sản phẩm và tiêu chuẩn kỹ thuật đóng gói hàng hóa
 * phục vụ quản lý, kiểm đếm và điều phối container/chặng cuối.
 */

export const CARGO_CATEGORY_META = {
  FMCG_DRY: {
    label: 'Hàng tiêu dùng nhanh (FMCG Khô)',
    shortLabel: 'FMCG_DRY',
    tone: 'emerald',
    description: 'Hàng tiêu dùng đóng gói bao bì khô, nhiệt độ thường'
  },
  COLD_CHILLED: {
    label: 'Chuỗi cung ứng lạnh bảo ôn (2°C - 8°C)',
    shortLabel: 'COLD_CHILLED',
    tone: 'cyan',
    description: 'Thực phẩm tươi, sữa và chế phẩm giữ mát'
  },
  COLD_FROZEN: {
    label: 'Chuỗi cung ứng cấp đông sâu (-18°C)',
    shortLabel: 'COLD_FROZEN',
    tone: 'blue',
    description: 'Thủy hải sản, thịt tươi cấp đông IQF'
  },
  HIGH_VALUE_TECH: {
    label: 'Công nghệ cao & Vi mạch bán dẫn',
    shortLabel: 'HIGH_VALUE_TECH',
    tone: 'indigo',
    description: 'Linh kiện bán dẫn, vi mạch điện tử giá trị cao'
  },
  CHEMICAL: {
    label: 'Hóa chất & Vật tư kỹ thuật chuyên dụng',
    shortLabel: 'CHEMICAL',
    tone: 'amber',
    description: 'Vật liệu nhựa nguyên sinh, hóa chất tinh khiết'
  }
};

export const CARGO_STATUS_META = {
  IN_CONTAINER: { label: 'Trong container', tone: 'purple' },
  AT_HUB: { label: 'Đã đến bưu cục', tone: 'blue' },
  PENDING: { label: 'Chờ phân bổ', tone: 'amber' },
  ASSIGNED: { label: 'Đã phân công', tone: 'sky' },
  ASSIGNED_TO_SHIPPER: { label: 'Đã phân công shipper', tone: 'sky' },
  OUT_FOR_DELIVERY: { label: 'Đang giao chặng cuối', tone: 'amber' },
  DELIVERED_POD: { label: 'Đã giao (Ký ePOD)', tone: 'emerald' },
  DELIVERED: { label: 'Đã giao thành công', tone: 'emerald' },
  DELIVERY_FAILED: { label: 'Giao thất bại', tone: 'rose' },
  FAILED: { label: 'Lỗi giao nhận', tone: 'rose' }
};

/**
 * Danh mục chi tiết SKU sản phẩm cố định cho các mã vận đơn thực tế
 */
const PREDEFINED_CATALOG = {
  'WB-VSIP-8219-01': [
    {
      skuCode: 'SKU-PG-8219-01',
      barcode: '893500123401',
      name: 'Dầu gội Rejoice Siêu Mượt Hương Hoa 650g',
      spec: 'Thùng Master Carton (12 chai x 650g)',
      category: 'Hóa mỹ phẩm cá nhân',
      lotNumber: 'LOT-PG-2026-03',
      quantity: 15,
      unit: 'Thùng',
      weightKg: 180.0,
      unitWeight: '12.0 kg/thùng',
      storageCondition: 'Nhiệt độ phòng (Dry 20-25°C)',
      status: 'Đã kiểm đếm'
    },
    {
      skuCode: 'SKU-PG-8219-02',
      barcode: '893500123402',
      name: 'Bột giặt Tide Chuyên Dụng Trắng Đột Phá 5kg',
      spec: 'Thùng Master Carton (4 túi x 5kg)',
      category: 'Chất tẩy rửa gia dụng',
      lotNumber: 'LOT-TD-2026-02',
      quantity: 15,
      unit: 'Thùng',
      weightKg: 180.0,
      unitWeight: '12.0 kg/thùng',
      storageCondition: 'Nhiệt độ phòng (Dry 20-25°C)',
      status: 'Đã kiểm đếm'
    },
    {
      skuCode: 'SKU-PG-8219-03',
      barcode: '893500123403',
      name: 'Nước xả vải Downy Huyền Bí Đậm Đặc 3.5L',
      spec: 'Thùng Master Carton (4 can x 3.5L)',
      category: 'Làm mềm vải & lưu hương',
      lotNumber: 'LOT-DW-2026-01',
      quantity: 10,
      unit: 'Thùng',
      weightKg: 120.0,
      unitWeight: '12.0 kg/thùng',
      storageCondition: 'Nhiệt độ phòng (Dry 20-25°C)',
      status: 'Đã kiểm đếm'
    }
  ],
  'WB-VSIP-8219-02': [
    {
      skuCode: 'SKU-VNM-8219-01',
      barcode: '893467310101',
      name: 'Sữa tươi Vinamilk 100% Tiệt Trùng Ít Đường 180ml',
      spec: 'Khay Bảo Ôn Chống Thấm (48 hộp x 180ml)',
      category: 'Sữa tươi dinh dưỡng',
      lotNumber: 'LOT-VNM-2026-A1',
      quantity: 16,
      unit: 'Khay lạnh',
      weightKg: 224.0,
      unitWeight: '14.0 kg/khay',
      storageCondition: 'Chuỗi lạnh 2°C - 4°C',
      status: 'Kiểm soát nhiệt độ liên tục'
    },
    {
      skuCode: 'SKU-VNM-8219-02',
      barcode: '893467310102',
      name: 'Sữa chua ăn Vinamilk Nha Đam Tự Nhiên 100g',
      spec: 'Khay Bảo Ôn Foam Lạnh (48 hũ x 100g)',
      category: 'Sữa chua men sống',
      lotNumber: 'LOT-VNM-2026-B2',
      quantity: 12,
      unit: 'Khay lạnh',
      weightKg: 166.0,
      unitWeight: '13.8 kg/khay',
      storageCondition: 'Chuỗi lạnh 2°C - 4°C',
      status: 'Kiểm soát nhiệt độ liên tục'
    }
  ],
  'WB-VSIP-8219-03': [
    {
      skuCode: 'SKU-PKG-8219-01',
      barcode: '893601290301',
      name: 'Cuộn màng co PE Công nghiệp 500mm x 15kg',
      spec: 'Kiện Bọc Màng Khí Chống Xước (2 cuộn)',
      category: 'Vật tư màng bọc',
      lotNumber: 'LOT-PE-2026-X',
      quantity: 18,
      unit: 'Kiện',
      weightKg: 288.0,
      unitWeight: '16.0 kg/kiện',
      storageCondition: 'Nhiệt độ phòng (<35°C)',
      status: 'Đã kiểm đếm'
    },
    {
      skuCode: 'SKU-PKG-8219-02',
      barcode: '893601290302',
      name: 'Hạt nhựa PP Nguyên sinh Kỹ thuật Cao cấp Lô A',
      spec: 'Bao Tráng Màng Nhựa PP Chống Ẩm (16kg)',
      category: 'Hạt nhựa nguyên sinh',
      lotNumber: 'LOT-PP-2026-Y',
      quantity: 12,
      unit: 'Bao',
      weightKg: 192.0,
      unitWeight: '16.0 kg/bao',
      storageCondition: 'Kho tiêu chuẩn công nghiệp',
      status: 'Đã kiểm đếm'
    }
  ],
  'WB-AMATA-8192-01': [
    {
      skuCode: 'SKU-MPH-8192-01',
      barcode: '893510281901',
      name: 'Tôm Sú Cà Mau IQF Size 16-20 Con/Kg (Thùng 12kg)',
      spec: 'Thùng Xốp Bảo Ôn Cấp Đông Sâu',
      category: 'Thủy hải sản đông lạnh sâu',
      lotNumber: 'LOT-MPH-2026-F1',
      quantity: 20,
      unit: 'Thùng',
      weightKg: 260.0,
      unitWeight: '13.0 kg/thùng',
      storageCondition: 'Đông sâu -18°C',
      status: 'Đã kiểm đếm'
    },
    {
      skuCode: 'SKU-MPH-8192-02',
      barcode: '893510281902',
      name: 'Tôm Thẻ Chân Trắng Bóc Nõn Hấp Sơ IQF (Thùng 10kg)',
      spec: 'Thùng Xốp Bảo Ôn Hút Chân Không',
      category: 'Thủy hải sản sơ chế đông lạnh',
      lotNumber: 'LOT-MPH-2026-F2',
      quantity: 12,
      unit: 'Thùng',
      weightKg: 160.0,
      unitWeight: '13.3 kg/thùng',
      storageCondition: 'Đông sâu -18°C',
      status: 'Đã kiểm đếm'
    }
  ],
  'WB-AMATA-8192-02': [
    {
      skuCode: 'SKU-SLM-8192-01',
      barcode: '893510281903',
      name: 'Phi lê Cá Hồi Nauy Tươi Cấp Lạnh Chilled (Khay 5kg)',
      spec: 'Khay Foam Bảo Ôn Đá Gel Chuyên Dụng',
      category: 'Hải sản nhập khẩu tươi mát',
      lotNumber: 'LOT-SLM-2026-N1',
      quantity: 14,
      unit: 'Khay lạnh',
      weightKg: 200.0,
      unitWeight: '14.3 kg/khay',
      storageCondition: 'Chuỗi lạnh -2°C đến 2°C',
      status: 'Kiểm soát nhiệt độ liên tục'
    },
    {
      skuCode: 'SKU-SLM-8192-02',
      barcode: '893510281904',
      name: 'Cá Tuyết Nam Cực Fillet Hút Chân Không (Khay 5kg)',
      spec: 'Khay Hút Chân Không Chống Oxy Hóa',
      category: 'Hải sản cao cấp',
      lotNumber: 'LOT-SLM-2026-N2',
      quantity: 10,
      unit: 'Khay lạnh',
      weightKg: 140.0,
      unitWeight: '14.0 kg/khay',
      storageCondition: 'Chuỗi lạnh -2°C đến 2°C',
      status: 'Kiểm soát nhiệt độ liên tục'
    }
  ],
  'WB-AMATA-8192-03': [
    {
      skuCode: 'SKU-CTN-8192-01',
      barcode: '893510281905',
      name: 'Thùng Carton 5 Lớp Sóng AB Chịu Lực Xuất Khẩu',
      spec: 'Pallet Gỗ Ép Định Hình (500 thùng/pallet)',
      category: 'Bao bì carton công nghiệp',
      lotNumber: 'LOT-CTN-2026-A1',
      quantity: 10,
      unit: 'Pallet',
      weightKg: 200.0,
      unitWeight: '20.0 kg/pallet',
      storageCondition: 'Khô ráo thoáng khí',
      status: 'Đã kiểm đếm'
    },
    {
      skuCode: 'SKU-CTN-8192-02',
      barcode: '893510281906',
      name: 'Tấm Xốp EPS Cách Nhiệt Giữ Lạnh Chuyên Dụng',
      spec: 'Pallet Màng Co (300 tấm/pallet)',
      category: 'Vật tư cách nhiệt bảo ôn',
      lotNumber: 'LOT-CTN-2026-A2',
      quantity: 8,
      unit: 'Pallet',
      weightKg: 160.0,
      unitWeight: '20.0 kg/pallet',
      storageCondition: 'Khô ráo, cách nhiệt',
      status: 'Đã kiểm đếm'
    }
  ],
  'WB-SHTP-4920-01': [
    {
      skuCode: 'SKU-INT-4920-01',
      barcode: '893700492001',
      name: 'Wafer Silicon 300mm Tiêu Chuẩn Bán Dẫn Lõi',
      spec: 'Hộp Chống Tĩnh Điện FOSB Cleanroom Class 10',
      category: 'Linh kiện bán dẫn công nghệ cao',
      lotNumber: 'LOT-INT-2026-W1',
      quantity: 9,
      unit: 'Hộp FOSB',
      weightKg: 174.0,
      unitWeight: '19.3 kg/hộp',
      storageCondition: 'Kiểm soát độ ẩm < 30% RH, 20°C',
      status: 'Đã kiểm định phòng sạch'
    },
    {
      skuCode: 'SKU-INT-4920-02',
      barcode: '893700492002',
      name: 'Mô đun Cảm biến Quang học CMOS Độ Nhạy Cao',
      spec: 'Khay Chống Sốc Hút Chân Không Khí Trơ',
      category: 'Cảm biến quang học chính xác',
      lotNumber: 'LOT-INT-2026-S2',
      quantity: 6,
      unit: 'Kiện',
      weightKg: 116.0,
      unitWeight: '19.3 kg/kiện',
      storageCondition: 'Nhiệt độ phòng tiêu chuẩn 20°C',
      status: 'Đã kiểm định phòng sạch'
    }
  ],
  'WB-SHTP-4920-02': [
    {
      skuCode: 'SKU-PCB-4920-01',
      barcode: '893700492003',
      name: 'Bo mạch Điều Khiển Biến Tần Nidec Inverter PCB',
      spec: 'Thùng Chống Tĩnh Điện ESD (20 bo/thùng)',
      category: 'Bo mạch điện tử công nghiệp',
      lotNumber: 'LOT-PCB-2026-P1',
      quantity: 12,
      unit: 'Thùng',
      weightKg: 180.0,
      unitWeight: '15.0 kg/thùng',
      storageCondition: 'Phòng sạch ESD, 22-25°C',
      status: 'Đã kiểm đếm'
    },
    {
      skuCode: 'SKU-PCB-4920-02',
      barcode: '893700492004',
      name: 'Vỏ Hợp Kim Nhôm Đúc Cho Thiết Bị Cảm Biến',
      spec: 'Thùng Carton Chèn Bọt Khí (15 chiếc/thùng)',
      category: 'Vỏ thiết bị tự động hóa',
      lotNumber: 'LOT-PCB-2026-P2',
      quantity: 10,
      unit: 'Thùng',
      weightKg: 150.0,
      unitWeight: '15.0 kg/thùng',
      storageCondition: 'Khô ráo tiêu chuẩn',
      status: 'Đã kiểm đếm'
    }
  ],
  'WB-SHTP-4920-03': [
    {
      skuCode: 'SKU-CHM-4920-01',
      barcode: '893700492005',
      name: 'Dung dịch Ăn Mòn Tinh Khiết Bán Dẫn Ultra-Pure HF',
      spec: 'Bình Fluoropolymer Chuyên Dụng Chống Rò Rỉ (10L)',
      category: 'Hóa chất tinh khiết bán dẫn',
      lotNumber: 'LOT-CHM-2026-C1',
      quantity: 7,
      unit: 'Bình',
      weightKg: 140.0,
      unitWeight: '20.0 kg/bình',
      storageCondition: 'Chuỗi lạnh an toàn 8°C',
      status: 'Kiểm soát hóa chất nghiêm ngặt'
    },
    {
      skuCode: 'SKU-CHM-4920-02',
      barcode: '893700492006',
      name: 'Dung môi Quang Khắc Bán Dẫn Photoresist Cấp Điện Tử',
      spec: 'Bình Nhôm Áp Suất Kín Chống Ánh Sáng (10L)',
      category: 'Vật liệu quang khắc vi mạch',
      lotNumber: 'LOT-CHM-2026-C2',
      quantity: 5,
      unit: 'Bình',
      weightKg: 100.0,
      unitWeight: '20.0 kg/bình',
      storageCondition: 'Chuỗi lạnh an toàn 8°C',
      status: 'Kiểm soát hóa chất nghiêm ngặt'
    }
  ],
  'WB-NT2-6192-01': [
    {
      skuCode: 'SKU-SEA-6192-01',
      barcode: '893520619201',
      name: 'Mực Ống Tàu Câu Đông Lạnh Sâu IQF Size L (Thùng 15kg)',
      spec: 'Thùng Xốp Giữ Lạnh Chuyên Dụng Hàng Hải',
      category: 'Hải sản xuất khẩu đông sâu',
      lotNumber: 'LOT-SEA-2026-M1',
      quantity: 16,
      unit: 'Thùng',
      weightKg: 215.0,
      unitWeight: '13.4 kg/thùng',
      storageCondition: 'Đông sâu -18°C',
      status: 'Đã hoàn tất bàn giao POD'
    },
    {
      skuCode: 'SKU-SEA-6192-02',
      barcode: '893520619202',
      name: 'Cá Ngừ Đại Dương Cắt Khúc Saku Sashimi Grade',
      spec: 'Thùng Xốp Hút Chân Không Khí Trơ (10kg)',
      category: 'Hải sản cao cấp Sashimi',
      lotNumber: 'LOT-SEA-2026-M2',
      quantity: 10,
      unit: 'Thùng',
      weightKg: 135.0,
      unitWeight: '13.5 kg/thùng',
      storageCondition: 'Đông sâu -18°C',
      status: 'Đã hoàn tất bàn giao POD'
    }
  ]
};

/**
 * Sinh danh mục SKU sản phẩm cho mọi món hàng manifest
 * Đảm bảo tổng số lượng (parcels) và khối lượng (kg) khớp chính xác với dữ liệu hồ sơ
 */
export function getManifestProducts(item) {
  if (!item) return [];

  // Nếu dữ liệu API đã có sẵn mảng sản phẩm
  if (Array.isArray(item.products) && item.products.length > 0) {
    return item.products;
  }
  if (Array.isArray(item.skuList) && item.skuList.length > 0) {
    return item.skuList;
  }

  // Nếu khớp với danh mục cố định theo mã vận đơn
  if (PREDEFINED_CATALOG[item.itemCode]) {
    return PREDEFINED_CATALOG[item.itemCode];
  }

  // Trường hợp hàng hóa sinh động (hoặc do người dùng thêm mới qua Modal)
  const totalParcels = Math.max(1, Number(item.parcelCount) || 1);
  const totalWeight = Math.max(1, Number(item.weightKg) || 10);
  const rawCode = (item.itemCode || 'SKU-AUTO').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  const baseName = item.cargoName || 'Hàng hóa quy chuẩn';
  const isCold = Boolean(item.requiresColdChain);
  const tempText = isCold ? `Chuỗi lạnh ${item.requiredTempC ?? 4}°C` : 'Nhiệt độ phòng (Dry)';

  if (totalParcels === 1) {
    return [
      {
        skuCode: `${rawCode}-01`,
        barcode: `8938${Math.abs(hashStr(rawCode) % 900000 + 100000)}01`,
        name: baseName,
        spec: isCold ? 'Khay Bảo Ôn Đóng Gói Kín' : 'Thùng Master Tiêu Chuẩn',
        category: item.cargoCategory || 'Hàng hóa thương mại',
        lotNumber: `LOT-${rawCode}-01`,
        quantity: 1,
        unit: isCold ? 'Khay lạnh' : 'Kiện',
        weightKg: Number(totalWeight.toFixed(1)),
        unitWeight: `${totalWeight.toFixed(1)} kg/kiện`,
        storageCondition: tempText,
        status: 'Đã kiểm đếm'
      }
    ];
  }

  // Phân bổ thành 2 dòng SKU sản phẩm chi tiết
  const p1Count = Math.max(1, Math.floor(totalParcels * 0.6));
  const p2Count = totalParcels - p1Count;
  const p1Weight = Number((totalWeight * (p1Count / totalParcels)).toFixed(1));
  const p2Weight = Number((totalWeight - p1Weight).toFixed(1));

  return [
    {
      skuCode: `${rawCode}-01`,
      barcode: `8938${Math.abs(hashStr(rawCode) % 900000 + 100000)}01`,
      name: `${baseName} (Dòng Quy Chuẩn Loại A)`,
      spec: isCold ? 'Khay Bảo Ôn Chống Thấm (Loại A)' : 'Thùng Master Carton Chịu Lực (Loại A)',
      category: item.cargoCategory || 'Hàng hóa thương mại',
      lotNumber: `LOT-${rawCode}-A`,
      quantity: p1Count,
      unit: isCold ? 'Khay lạnh' : 'Thùng',
      weightKg: p1Weight,
      unitWeight: `${(p1Weight / p1Count).toFixed(1)} kg/đơn vị`,
      storageCondition: tempText,
      status: 'Đã kiểm đếm'
    },
    {
      skuCode: `${rawCode}-02`,
      barcode: `8938${Math.abs(hashStr(rawCode) % 900000 + 100000)}02`,
      name: `${baseName} (Dòng Quy Chuẩn Loại B)`,
      spec: isCold ? 'Khay Foam Bảo Ôn Kín (Loại B)' : 'Thùng Master Carton Chịu Lực (Loại B)',
      category: item.cargoCategory || 'Hàng hóa thương mại',
      lotNumber: `LOT-${rawCode}-B`,
      quantity: p2Count,
      unit: isCold ? 'Khay lạnh' : 'Thùng',
      weightKg: p2Weight,
      unitWeight: `${(p2Weight / p2Count).toFixed(1)} kg/đơn vị`,
      storageCondition: tempText,
      status: 'Đã kiểm đếm'
    }
  ];
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

