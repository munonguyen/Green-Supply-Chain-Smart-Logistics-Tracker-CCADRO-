export const CONTAINER_STATUSES = {
  AVAILABLE: { label: 'Sẵn sàng', tone: 'green' },
  ASSIGNED: { label: 'Đã phân công', tone: 'blue' },
  IN_TRANSIT: { label: 'Đang vận chuyển', tone: 'blue' },
  DELIVERED: { label: 'Đã giao', tone: 'green' },
  MAINTENANCE: { label: 'Bảo trì', tone: 'amber' }
};

export const CONTAINER_TYPES = {
  DRY_20FT: 'Container khô 20 feet',
  DRY_40FT: 'Container khô 40 feet',
  REEFER_20FT: 'Container lạnh 20 feet',
  REEFER_40FT: 'Container lạnh 40 feet',
  FLAT_RACK: 'Container sàn',
  OPEN_TOP: 'Container mở nóc'
};

export const EMPTY_CONTAINER = {
  containerCode: '',
  containerType: 'DRY_40FT',
  isoType: '45G1',
  ownerName: '',
  cscApprovalCountry: '',
  cscApprovalReference: '',
  cscManufactureDate: '',
  cscInspectionScheme: '',
  cscAcepProgramNumber: '',
  cscNextExaminationDate: '',
  tareWeightTons: '',
  maxPayloadTons: '',
  cubicCapacityM3: '',
  isReefer: false,
  responsibleCompanyId: '',
  eSealNumber: '',
  telematicsModel: ''
};

export const EMPTY_ITEM = {
  itemCode: '',
  shipmentCode: '',
  hubCode: '',
  cargoName: '',
  cargoCategory: '',
  consigneeName: '',
  consigneePhone: '',
  deliveryAddress: '',
  deliveryZoneName: '',
  deliveryLat: '',
  deliveryLng: '',
  weightKg: '',
  parcelCount: 1,
  requiredTempC: '',
  requiresColdChain: false,
  slaWindow: 'Theo thỏa thuận'
};

export const asList = (response) => {
  const result = response?.result ?? response;
  return Array.isArray(result) ? result.filter((item) => !item.isDeleted) : [];
};

export const formatNumber = (value, unit = '') =>
  value == null || value === ''
    ? 'Chưa có dữ liệu'
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value) + unit;

export const formatDate = (value) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleString('vi-VN')
    : 'Chưa ghi nhận';

export const formatDateOnly = (value) => {
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return formatDate(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('vi-VN');
};

export const sealData = (container) => ({
  // Jackson's bean naming currently serializes these three fields as "eseal…".
  number: container.eSealNumber ?? container.esealNumber,
  status: container.eSealStatus ?? container.esealStatus,
  integrity: container.eSealIntegrityPct ?? container.esealIntegrityPct
});

export const SEAL_LABELS = {
  LOCKED_SECURE: 'Đang niêm phong',
  UNLOCKED_AUTHORIZED: 'Đã mở có xác nhận',
  UNLOCKED: 'Đã mở niêm phong',
  OPENED: 'Đã mở niêm phong',
  TAMPERED: 'Cảnh báo can thiệp',
  BROKEN: 'Niêm phong bị hỏng'
};

export const CARGO_STATUSES = {
  IN_CONTAINER: 'Trong container',
  AT_HUB: 'Đã đến cơ sở',
  PENDING: 'Chờ phân công',
  ASSIGNED: 'Đã phân công giao',
  ASSIGNED_TO_SHIPPER: 'Đã phân công shipper',
  DELIVERED_POD: 'Đã giao, có POD',
  OUT_FOR_DELIVERY: 'Đang giao chặng cuối',
  DELIVERED: 'Đã giao',
  DELIVERY_FAILED: 'Giao không thành công',
  FAILED: 'Giao không thành công'
};

export function buildContainerChecklist(container, items, manifestState, now = Date.now()) {
  const seal = sealData(container);
  const weight = items.reduce((sum, item) => sum + Number(item.weightKg || 0), 0);
  const coldItems = items.filter((item) => item.requiresColdChain);
  const hasCoordinates = (item) => item.deliveryLat != null && item.deliveryLng != null;
  const loaded = manifestState === 'ready';
  const check = (label, complete, detail) => ({
    label,
    state: complete ? 'complete' : 'missing',
    detail
  });
  const manifestCheck = (label, complete, detail) =>
    loaded
      ? check(label, complete, detail)
      : {
          label,
          state: 'unknown',
          detail:
            manifestState === 'loading'
              ? 'Đang tải manifest…'
              : 'Chưa tải được manifest; hãy thử lại.'
        };
  return [
    check(
      'Hồ sơ thiết bị',
      container.containerCode &&
        container.containerType &&
        container.isoType &&
        container.ownerName &&
        Number(container.tareWeightTons) > 0 &&
        Number(container.maxPayloadTons) > 0 &&
        Number(container.cubicCapacityM3) > 0,
      'Mã thiết bị, loại / ISO, chủ sở hữu, trọng lượng vỏ, tải trọng và thể tích.'
    ),
    check(
      'Biển an toàn CSC',
      container.cscApprovalCountry && container.cscApprovalReference &&
        (container.cscInspectionScheme === 'PERIODIC'
          ? container.cscNextExaminationDate && String(container.cscNextExaminationDate).slice(0, 10) >= (() => {
              const current = new Date(now);
              return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            })()
          : container.cscInspectionScheme === 'ACEP' && container.cscAcepProgramNumber),
      container.cscInspectionScheme === 'PERIODIC'
        ? 'Đối chiếu quốc gia, mã phê duyệt và ngày kiểm tra kế tiếp với biển CSC.'
        : container.cscInspectionScheme === 'ACEP'
          ? 'Đối chiếu thông tin phê duyệt và mã chương trình ACEP với nhãn/hồ sơ chủ sở hữu.'
          : 'Chưa khai báo quốc gia, tham chiếu phê duyệt và chương trình kiểm tra CSC.'
    ),
    check(
      'Công ty phụ trách',
      container.responsibleCompanyId &&
        container.responsibleCompanyCode &&
        container.responsibleCompanyName,
      container.responsibleCompanyName || 'Chưa gán đơn vị phụ trách vận chuyển.'
    ),
    check(
      'Xe & tài xế',
      container.assignedVehicleId &&
        container.vehicleLicensePlate &&
        container.assignedDriverId &&
        container.driverName &&
        container.driverPhone &&
        container.driverLicense,
      'Cần phân công xe, biển số, tài xế, liên hệ và giấy phép trước khi xuất bến.'
    ),
    check(
      'Vận đơn & hành trình',
      container.assignedShipmentId &&
        container.assignedShipmentCode &&
        container.originName &&
        container.destinationName,
      'Liên kết vận đơn, điểm xuất phát và cơ sở đích.'
    ),
    manifestCheck(
      'Mã hàng & cơ sở giao',
      items.length > 0 &&
        items.every(
          (item) =>
            item.itemCode &&
            item.cargoName &&
            item.cargoCategory &&
            item.shipmentCode &&
            item.hubCode &&
            item.consigneeName &&
            item.consigneePhone &&
            item.deliveryAddress &&
            item.deliveryZoneName &&
            item.slaWindow &&
            hasCoordinates(item) &&
            Number(item.parcelCount) > 0 &&
            Number(item.weightKg) > 0
        ),
      loaded
        ? items.length + ' mã hàng; kiểm tra người nhận, cơ sở, tọa độ, số kiện, khối lượng và SLA.'
        : ''
    ),
    manifestCheck(
      'Giới hạn tải trọng',
      items.length > 0 &&
        Number(container.maxPayloadTons) > 0 &&
        weight <= Number(container.maxPayloadTons) * 1000,
      formatNumber(weight, ' kg') +
        ' / ' +
        formatNumber(container.maxPayloadTons, ' tấn tải tối đa.')
    ),
    check(
      'Niêm phong điện tử',
      seal.number &&
        seal.integrity === 100 &&
        (seal.status === 'LOCKED_SECURE' ||
          (container.status === 'DELIVERED' &&
            ['UNLOCKED', 'OPENED', 'UNLOCKED_AUTHORIZED'].includes(seal.status))),
      seal.number
        ? seal.number + ' · ' + (SEAL_LABELS[seal.status] || seal.status || 'Chưa có trạng thái')
        : 'Chưa có số niêm phong / xác nhận nguyên vẹn.'
    ),
    !loaded
      ? manifestCheck('Chuỗi lạnh', false, '')
      : coldItems.length === 0 && !container.isReefer
        ? { label: 'Chuỗi lạnh', state: 'na', detail: 'Không có hàng yêu cầu chuỗi lạnh.' }
        : check(
            'Chuỗi lạnh',
            container.isReefer &&
              coldItems.every((item) => item.requiredTempC != null) &&
              container.supplyAirTempC != null &&
              container.returnAirTempC != null,
            'Kiểm tra container lạnh, nhiệt độ yêu cầu và dữ liệu cảm biến; chưa kết luận tuân thủ SLA.'
          ),
    check(
      'Vị trí & thiết bị giám sát',
      container.telematicsModel &&
        container.lastLatitude != null &&
        container.lastLongitude != null &&
        container.lastLocationName &&
        container.batteryPct != null,
      'Thiết bị IoT, vị trí và pin đã được ghi nhận; chưa xác nhận độ mới của tín hiệu.'
    ),
    container.status === 'DELIVERED'
      ? check(
          'Bằng chứng bàn giao',
          container.completedAt && container.epodRecipient && container.epodSignature,
          'Thời điểm hoàn tất, người nhận và chữ ký ePOD.'
        )
      : { label: 'Bằng chứng bàn giao', state: 'na', detail: 'Chỉ yêu cầu khi container đã giao.' }
  ];
}
