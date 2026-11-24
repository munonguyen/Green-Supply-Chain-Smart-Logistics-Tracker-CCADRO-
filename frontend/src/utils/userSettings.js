import { readJsonObject, writeJsonStore } from './storage';

const PREFS_STORAGE_PREFIX = 'ccadro_user_prefs_v1::';
export const USER_SETTINGS_CHANGED_EVENT = 'ccadro-user-settings-changed';

export const ROLE_HEADER_META = Object.freeze({
  ADMIN: {
    badgeLabel: 'QUẢN TRỊ HỆ THỐNG • ROOT ADMIN',
    shortBadge: 'ROOT ADMIN',
    accentColor: '#10b981',
    statusTitle: 'Trực tuyến',
    statusSub: 'Không gian 3D',
    canBroadcastAlert: true,
    canSimulateAlert: true,
    alertLabel: 'Khẩn Cấp',
    roleOpsTabLabel: 'Vận hành Hệ thống',
    roleOpsDescription: 'Cấu hình bảo mật IAM, kiểm toán tự động & luồng cảnh báo Kafka toàn mạng'
  },
  OPERATOR: {
    badgeLabel: 'ĐIỀU HÀNH & VẬN HÀNH LOGISTICS',
    shortBadge: 'VẬN HÀNH',
    accentColor: '#0ea5e9',
    statusTitle: 'Điều hành Live',
    statusSub: 'NOC & Bưu cục',
    canBroadcastAlert: true,
    canSimulateAlert: true,
    alertLabel: 'Khẩn Cấp',
    roleOpsTabLabel: 'Nghiệp vụ Vận hành',
    roleOpsDescription: 'Điều phối vận tải container đường dài, quản trị bưu cục, phân bổ dải mã và đối soát COD'
  },
  DISPATCHER: {
    badgeLabel: 'TRUNG TÂM NOC • ĐIỀU PHỐI VIÊN',
    shortBadge: 'ĐIỀU PHỐI NOC',
    accentColor: '#0ea5e9',
    statusTitle: 'Điều phối Live',
    statusSub: 'Tối ưu lộ trình',
    canBroadcastAlert: true,
    canSimulateAlert: true,
    alertLabel: 'Khẩn Cấp',
    roleOpsTabLabel: 'Nghiệp vụ Điều phối',
    roleOpsDescription: 'Tối ưu lộ trình đa mục tiêu Pareto, ngưỡng lệch GPS & cảnh báo trễ SLA'
  },
  SAFETY_MANAGER: {
    badgeLabel: 'GIÁM SÁT AN TOÀN • HSE',
    shortBadge: 'AN TOÀN HSE',
    accentColor: '#f59e0b',
    statusTitle: 'An toàn Đội xe',
    statusSub: 'Cảm biến an toàn',
    canBroadcastAlert: true,
    canSimulateAlert: true,
    alertLabel: 'Sự Cố HSE',
    roleOpsTabLabel: 'An toàn & Kỷ luật',
    roleOpsDescription: 'Ngưỡng tốc độ đỏ, giờ lái HOS 4h, điểm Demerit tự khóa & kiểm tra Pre-trip'
  },
  ESG_AUDITOR: {
    badgeLabel: 'KIỂM TOÁN ESG • GLEC v3',
    shortBadge: 'ESG GLEC v3',
    accentColor: '#8b5cf6',
    statusTitle: 'GLEC v3 Live',
    statusSub: 'ISO 14083',
    canBroadcastAlert: false,
    canSimulateAlert: false,
    alertLabel: 'Cảnh Báo ESG',
    roleOpsTabLabel: 'Kiểm toán Carbon',
    roleOpsDescription: 'Chuẩn phát thải GLEC v3.1 / ISO 14083, phạm vi WTW/TTW & xuất chứng từ'
  },
  CUSTOMER: {
    badgeLabel: 'DOANH NGHIỆP B2B • ĐỐI TÁC',
    shortBadge: 'KHÁCH HÀNG B2B',
    accentColor: '#10b981',
    statusTitle: 'Cổng B2B Live',
    statusSub: 'Net-30 & Kafka',
    canBroadcastAlert: false,
    canSimulateAlert: false,
    alertLabel: 'Vận đơn',
    roleOpsTabLabel: 'Hợp đồng & Cold-Chain',
    roleOpsDescription: 'Email nhận PDF hợp đồng qua Kafka, thanh toán Net-30 & ngưỡng nhiệt độ hàng'
  },
  HUB_MANAGER: {
    badgeLabel: 'QUẢN LÝ TRỤ SỞ • 3PL HUB',
    shortBadge: 'QUẢN LÝ HUB',
    accentColor: '#10b981',
    statusTitle: 'Hub WMS Sync',
    statusSub: 'Phân tuyến 3PL',
    canBroadcastAlert: false,
    canSimulateAlert: false,
    alertLabel: 'Cảnh báo Hub',
    roleOpsTabLabel: 'Điều hành Trụ sở',
    roleOpsDescription: 'Geofence GPS ký nhận, chụp ảnh Photo POD & tự động đẩy Webhook 3PL WMS'
  },
  HUB_SHIPPER: {
    badgeLabel: 'GIAO NHẬN LAST-MILE • 3PL',
    shortBadge: 'SHIPPER HUB',
    accentColor: '#0ea5e9',
    statusTitle: 'Tuyến Last-Mile',
    statusSub: 'Photo POD GPS',
    canBroadcastAlert: false,
    canSimulateAlert: false,
    alertLabel: 'Đơn giao',
    roleOpsTabLabel: 'Giao nhận & POD',
    roleOpsDescription: 'Cấu hình trụ sở mặc định, bán kính GPS và cảnh báo đơn ưu tiên'
  },
  SHIPPER: {
    badgeLabel: 'ĐỐI TÁC GIAO NHẬN • 3PL',
    shortBadge: 'SHIPPER 3PL',
    accentColor: '#0ea5e9',
    statusTitle: 'Tuyến 3PL Live',
    statusSub: 'ePOD Đích',
    canBroadcastAlert: false,
    canSimulateAlert: false,
    alertLabel: 'Đơn giao',
    roleOpsTabLabel: 'Giao nhận & POD',
    roleOpsDescription: 'Cấu hình trụ sở mặc định, bán kính GPS và cảnh báo đơn ưu tiên'
  },
  HUB_AUDITOR: {
    badgeLabel: 'KIỂM TOÁN TRỤ SỞ • READ-ONLY',
    shortBadge: 'AUDIT HUB',
    accentColor: '#8b5cf6',
    statusTitle: 'Audit Read-Only',
    statusSub: 'Đối soát 3PL',
    canBroadcastAlert: false,
    canSimulateAlert: false,
    alertLabel: 'Đối soát',
    roleOpsTabLabel: 'Đối soát & Lưu trữ',
    roleOpsDescription: 'Chuẩn đối soát biên bản bàn giao Photo POD và xuất báo cáo kiểm toán Hub'
  },
  DRIVER: {
    badgeLabel: 'CABIN OS • TÀI XẾ ĐỘI XE',
    shortBadge: 'TÀI XẾ CABIN',
    accentColor: '#10b981',
    statusTitle: 'Cabin Telemetry',
    statusSub: 'HOS 4h Active',
    canBroadcastAlert: false,
    canSimulateAlert: false,
    alertLabel: 'SOS',
    roleOpsTabLabel: 'Cabin & Ca lái HOS',
    roleOpsDescription: 'Âm báo lệch tuyến, tự động đổi tối ban đêm, nhắc nghỉ 4h & tần suất GPS'
  }
});

export function getRoleHeaderMeta(role) {
  const key = String(role || 'ADMIN').toUpperCase();
  return ROLE_HEADER_META[key] || ROLE_HEADER_META.ADMIN;
}

export function getDefaultLandingOptionsForRole(role) {
  const r = String(role || 'ADMIN').toUpperCase();
  if (r === 'CUSTOMER') {
    return [
      { value: 'overview', label: 'Tổng quan & Lộ trình Container' },
      { value: 'booking', label: 'Đặt Xe Xanh & Tạo Đơn B2B' },
      { value: 'contracts', label: 'Hợp đồng MSA & Thanh toán' },
      { value: 'carbon', label: 'Báo cáo ESG & Carbon Scope 3' }
    ];
  }
  if (['HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR', 'SHIPPER'].includes(r)) {
    return [
      { value: 'dispatch', label: 'Điều phối & Giao nhận Bưu kiện' },
      { value: 'containers', label: 'Bàn giao Container & Webhook 3PL' },
      { value: 'shippers', label: 'Đội ngũ Shipper & Geofence' }
    ];
  }
  if (r === 'OPERATOR') {
    return [
      { value: 'overview', label: 'Trung tâm Giám sát & Điều phối NOC' },
      { value: 'shipments', label: 'Quản lý Vận đơn & Tuyến xe' },
      { value: 'dispatch', label: 'Điều phối & Giao nhận Bưu cục' }
    ];
  }
  if (r === 'DRIVER') {
    return [
      { value: 'navigation', label: 'Bản đồ Dẫn đường & Telemetry' },
      { value: 'pretrip', label: 'Kiểm định Pre-Trip & Pin EV' },
      { value: 'chat', label: 'CCADRO Messenger Cabin' }
    ];
  }
  if (r === 'ESG_AUDITOR') {
    return [
      { value: 'carbon', label: 'Kiểm toán Phát thải GLEC v3' },
      { value: 'benchmark', label: 'Định mức Carbon Hành lang' },
      { value: 'overview', label: 'Trung tâm Giám sát NOC' }
    ];
  }
  if (r === 'SAFETY_MANAGER') {
    return [
      { value: 'governance', label: 'An toàn Đội xe & Kỷ luật' },
      { value: 'overview', label: 'Trung tâm Giám sát NOC' },
      { value: 'shipments', label: 'Danh sách Vận đơn & GPS' }
    ];
  }
  return [
    { value: 'overview', label: 'Trung tâm Giám sát NOC Real-time' },
    { value: 'shipments', label: 'Quản lý Vận đơn & Điều phối' },
    { value: 'governance', label: 'Quản trị IAM & Giám sát An toàn' }
  ];
}

export const DEFAULT_USER_SETTINGS = {
  // Preferences & Localization
  soundAlerts: true,
  desktopAlerts: true,
  realtimeIntervalSec: 15,
  compactSidebar: false,
  tableDensity: 'standard',
  distanceUnit: 'metric',
  currency: 'VND',
  carbonUnit: 'kg',
  timezone: 'Asia/Ho_Chi_Minh',
  reduceMotion: false,
  defaultLandingTab: 'overview',

  // Notifications
  notifyIncidentSos: true,
  notifyShipmentEpod: true,
  notifyMessenger: true,
  notifyPaymentContract: true,
  notifySlaCarbon: true,
  quietHoursEnabled: false,
  quietHoursRange: '22:00 - 06:00',

  // Security
  twoFactorEnabled: false,
  autoLockMinutes: 30,
  unusualLoginAlert: true,

  // Role-specific Operations
  roleOps: {
    // ADMIN
    requireDualApprovalForLock: true,
    allowPublicB2bRegistration: true,
    autoAuditIamEvents: true,
    kafkaSlaAlertEmail: true,
    // DISPATCHER
    paretoPriority: 'BALANCED',
    gpsDeviationAlertMeters: 500,
    slaEarlyWarningMinutes: 30,
    preferEvUnder150Km: true,
    // SAFETY_MANAGER
    speedAlertLimitKmh: 85,
    maxContinuousDriveHours: 4,
    autoLockDemeritThreshold: 15,
    requirePretripPhotoProof: true,
    // ESG_AUDITOR
    emissionStandard: 'GLEC_V3_1',
    emissionScope: 'WTW',
    corridorOverBenchmarkPct: 15,
    auditExportFormat: 'PDF_SIGNED',
    // CUSTOMER
    contractEmailRecipient: '',
    autoSendContractPdfAfterPay: true,
    preferredPaymentMethod: 'NET_30',
    coldChainThresholdPreset: 'FROZEN_18',
    geofenceApproachKm: 10,
    // HUB_* / SHIPPER
    defaultHubCode: 'HUB-DINHBANG-BN',
    hubGeofenceRadiusM: 300,
    requireWatermarkPhotoPod: true,
    autoPush3plWmsWebhook: true,
    // DRIVER
    voiceNavigationAlerts: true,
    nightAutoDarkCabin: true,
    hosBreakReminderMinutes: 15,
    gpsPingIntervalSec: 5,
    sosEmergencyPhone: '1900-636-888'
  }
};

export function loadUserSettings(username, user = null) {
  const base = {
    ...DEFAULT_USER_SETTINGS,
    roleOps: {
      ...DEFAULT_USER_SETTINGS.roleOps,
      contractEmailRecipient: user?.email || '',
      defaultHubCode: user?.assignedHubCode || DEFAULT_USER_SETTINGS.roleOps.defaultHubCode
    }
  };
  if (!username || typeof window === 'undefined') return base;
  const parsed = readJsonObject(`${PREFS_STORAGE_PREFIX}${username.toLowerCase()}`, null);
  if (parsed) {
    return {
      ...base,
      ...parsed,
      roleOps: {
        ...base.roleOps,
        ...(parsed?.roleOps || {})
      }
    };
  }
  return base;
}

export function saveUserSettings(username, nextSettings) {
  if (!username || typeof window === 'undefined') return;
  writeJsonStore(`${PREFS_STORAGE_PREFIX}${username.toLowerCase()}`, nextSettings);
  try {
    window.dispatchEvent(
      new CustomEvent(USER_SETTINGS_CHANGED_EVENT, {
        detail: { username, settings: nextSettings }
      })
    );
  } catch (_) {
    // ignore SSR/non-window event dispatch
  }
}

export function resetUserSettings(username, user = null) {
  const fresh = {
    ...DEFAULT_USER_SETTINGS,
    roleOps: {
      ...DEFAULT_USER_SETTINGS.roleOps,
      contractEmailRecipient: user?.email || '',
      defaultHubCode: user?.assignedHubCode || DEFAULT_USER_SETTINGS.roleOps.defaultHubCode
    }
  };
  saveUserSettings(username, fresh);
  return fresh;
}

