import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

/**
 * Định nghĩa cố định (Hardcoded) 7 Vai trò (Role Templates) chuẩn CCADRO v4.0
 * Tách biệt hoàn toàn CUSTOMER (Khách hàng B2B tại /customer) và SHIPPER (Bên giao nhận điểm đích / 3PL tại /shipper)
 * đồng bộ 1-1 với Flyway V014 -> V020.
 */
export const SYSTEM_FIXED_ROLES = Object.freeze([
  'ADMIN',
  'DISPATCHER',
  'SAFETY_MANAGER',
  'DRIVER',
  'ESG_AUDITOR',
  'CUSTOMER',
  'SHIPPER'
]);

export const ALL_SYSTEM_PERMISSIONS = [
  { code: 'USER_MANAGE', label: 'Quản lý & cấp phát tài khoản', group: 'IAM & Quản trị' },
  { code: 'ROLE_MANAGE', label: 'Phân quyền vai trò (RBAC)', group: 'IAM & Quản trị' },
  { code: 'VEHICLE_READ', label: 'Xem danh sách phương tiện', group: 'Đội xe & An toàn' },
  { code: 'VEHICLE_WRITE', label: 'Thêm / cập nhật phương tiện', group: 'Đội xe & An toàn' },
  { code: 'MAINTENANCE_MANAGE', label: 'Quản lý bảo dưỡng phương tiện', group: 'Đội xe & An toàn' },
  { code: 'INSPECTION_SUBMIT', label: 'Gửi biên bản kiểm tra Pre-trip', group: 'Đội xe & An toàn' },
  { code: 'INSPECTION_REVIEW', label: 'Phê duyệt kiểm định an toàn', group: 'Đội xe & An toàn' },
  { code: 'SHIPMENT_CREATE', label: 'Khởi tạo vận đơn mới', group: 'Vận đơn & Điều phối' },
  { code: 'SHIPMENT_READ', label: 'Xem toàn bộ vận đơn hệ thống', group: 'Vận đơn & Điều phối' },
  {
    code: 'SHIPMENT_READ_OWN',
    label: 'Xem vận đơn của riêng doanh nghiệp (Customer)',
    group: 'Vận đơn & Điều phối'
  },
  {
    code: 'SHIPMENT_READ_INBOUND',
    label: 'Xem hàng/container giao tới bãi điểm đích (3PL Shipper)',
    group: 'Giao nhận Điểm đích (3PL)'
  },
  {
    code: 'EXTERNAL_3PL_SYNC',
    label: 'Đồng bộ trạng thái & Webhook qua hệ thống thứ 3 (WMS/3PL)',
    group: 'Giao nhận Điểm đích (3PL)'
  },
  { code: 'SHIPMENT_WRITE', label: 'Cập nhật thông tin vận đơn', group: 'Vận đơn & Điều phối' },
  { code: 'SHIPMENT_DISPATCH', label: 'Phát lệnh điều xe xuất bến', group: 'Vận đơn & Điều phối' },
  { code: 'ROUTE_PLAN', label: 'Lập lộ trình đa mục tiêu Pareto', group: 'Định tuyến & GPS' },
  { code: 'ROUTE_SELECT', label: 'Chọn phương án lộ trình', group: 'Định tuyến & GPS' },
  { code: 'REROUTE_APPROVE', label: 'Phê duyệt tái định tuyến động', group: 'Định tuyến & GPS' },
  { code: 'TRACKING_LIVE', label: 'Giám sát bản đồ GPS thời gian thực', group: 'Định tuyến & GPS' },
  { code: 'TELEMETRY_SEND', label: 'Phát tín hiệu tọa độ GPS từ xe', group: 'Định tuyến & GPS' },
  { code: 'ALERT_ACK', label: 'Tiếp nhận & xử lý cảnh báo lệch tuyến', group: 'Sự cố & Cảnh báo' },
  { code: 'INCIDENT_REPORT', label: 'Báo cáo sự cố hiện trường', group: 'Sự cố & Cảnh báo' },
  { code: 'EXCEPTION_RESOLVE', label: 'Thẩm định ngoại lệ vận hành', group: 'Sự cố & Cảnh báo' },
  { code: 'DEMERIT_MANAGE', label: 'Quản trị điểm phạt tài xế', group: 'Sự cố & Cảnh báo' },
  { code: 'POD_SUBMIT', label: 'Ký xác nhận bàn giao hàng (ePOD)', group: 'Carbon & Chứng từ' },
  { code: 'POD_VIEW_OWN', label: 'Tải chứng từ ePOD doanh nghiệp', group: 'Carbon & Chứng từ' },
  { code: 'CARBON_READ', label: 'Tra cứu sổ cái phát thải CO2e', group: 'Carbon & Chứng từ' },
  { code: 'CARBON_CALCULATE', label: 'Quyết toán phát thải GLEC v3', group: 'Carbon & Chứng từ' },
  { code: 'BENCHMARK_READ', label: 'Xem định mức carbon hành lang', group: 'Carbon & Chứng từ' },
  { code: 'REPORT_EXPORT', label: 'Xuất chứng nhận ISO 14083', group: 'Carbon & Chứng từ' },
  { code: 'DRIVER_CHAT', label: 'Nhắn tin trực tiếp 2 chiều Customer ↔ Tài xế', group: 'Điều phối & Giao tiếp' },
  { code: 'PAYMENT_CREATE', label: 'Khởi tạo yêu cầu thanh toán & hóa đơn VAT', group: 'Thanh toán & Tài chính' },
  { code: 'PAYMENT_READ_OWN', label: 'Xem lịch sử thanh toán & công nợ Net-30', group: 'Thanh toán & Tài chính' },
  { code: 'PAYMENT_MANAGE', label: 'Quản trị đối soát & hoàn tiền giao dịch', group: 'Thanh toán & Tài chính' },
  { code: 'CONTRACT_READ_OWN', label: 'Xem hợp đồng khung MSA, hợp đồng chuyến & SLA', group: 'Hợp đồng & SLA' },
  { code: 'CONTRACT_CREATE', label: 'Khởi tạo hợp đồng điện tử B2B', group: 'Hợp đồng & SLA' },
  { code: 'CONTRACT_SIGN', label: 'Ký số xác nhận hợp đồng & nghiệm thu ePOD', group: 'Hợp đồng & SLA' },
  { code: 'CONTRACT_MANAGE', label: 'Quản trị hạn mức công nợ & đối soát SLA', group: 'Hợp đồng & SLA' }
];

export const ENTERPRISE_ROLES = {
  ADMIN: {
    role: 'ADMIN',
    portalType: 'INTERNAL',
    fullName: 'Quản Trị Viên Toàn Hệ Thống',
    department: 'Ban Quản Trị Hạ Tầng & Bảo Mật IAM',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Hệ Thống Giám Sát Nội Bộ (Internal Core)',
    color: '#a855f7',
    bgDim: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.45)',
    description:
      'Toàn quyền cấu hình hệ thống, khởi tạo tài khoản cho các role nội bộ, phân quyền RBAC và giám sát toàn bộ phân hệ.',
    permissions: ALL_SYSTEM_PERMISSIONS.map((p) => p.code)
  },
  DISPATCHER: {
    role: 'DISPATCHER',
    portalType: 'INTERNAL',
    fullName: 'Điều Phối Viên Trung Tâm (NOC)',
    department: 'Trung Tâm Điều Hành Vận Tải Xanh',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Hệ Thống Giám Sát Nội Bộ (Internal Core)',
    color: '#38bdf8',
    bgDim: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.45)',
    description:
      'Lập lộ trình đa tiêu chí (UC05), phát lệnh điều xe (UC06), theo dõi GPS (UC09) & duyệt đổi tuyến động (UC10).',
    permissions: [
      'SHIPMENT_READ',
      'SHIPMENT_WRITE',
      'SHIPMENT_DISPATCH',
      'ROUTE_PLAN',
      'ROUTE_SELECT',
      'REROUTE_APPROVE',
      'TRACKING_LIVE',
      'ALERT_ACK',
      'VEHICLE_READ',
      'CARBON_CALCULATE',
      'DRIVER_CHAT'
    ]
  },
  SAFETY_MANAGER: {
    role: 'SAFETY_MANAGER',
    portalType: 'INTERNAL',
    fullName: 'Trưởng Ban An Toàn Đội Xe',
    department: 'Phòng Thanh Tra Kỹ Thuật & An Toàn',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Hệ Thống Giám Sát Nội Bộ (Internal Core)',
    color: '#f97316',
    bgDim: 'rgba(249, 115, 22, 0.16)',
    border: 'rgba(249, 115, 22, 0.45)',
    description:
      'Phát lệnh cảnh báo khẩn cấp toàn đội xe, kiểm duyệt Pre-trip (UC01), xử lý ngoại lệ (BRULE-17) & điểm phạt tài xế (BRULE-18).',
    permissions: [
      'VEHICLE_READ',
      'VEHICLE_WRITE',
      'MAINTENANCE_MANAGE',
      'INSPECTION_REVIEW',
      'EXCEPTION_RESOLVE',
      'DEMERIT_MANAGE',
      'ALERT_ACK',
      'TRACKING_LIVE'
    ]
  },
  DRIVER: {
    role: 'DRIVER',
    portalType: 'INTERNAL',
    fullName: 'Tài Xế Vận Tải Hành Lang Xanh',
    department: 'Đội Vận Tải Đường Dài Nam Bộ',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Thiết Bị Đầu Cuối Nội Bộ (Driver Terminal)',
    color: '#10b981',
    bgDim: 'rgba(16, 185, 129, 0.16)',
    border: 'rgba(16, 185, 129, 0.45)',
    description:
      'Thực hiện kiểm tra an toàn 6 hạng mục trước chuyến (UC01), gửi tọa độ GPS (UC09), báo cáo sự cố (UC16) & ký nhận ePOD (UC11).',
    permissions: [
      'INSPECTION_SUBMIT',
      'TELEMETRY_SEND',
      'INCIDENT_REPORT',
      'POD_SUBMIT',
      'VEHICLE_READ',
      'DRIVER_CHAT'
    ]
  },
  ESG_AUDITOR: {
    role: 'ESG_AUDITOR',
    portalType: 'INTERNAL',
    fullName: 'Kiểm Toán Viên Độc Lập GLEC v3',
    department: 'Tổ Chức Chứng Nhận Phát Thải Xanh',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Cổng Kiểm Toán Nội Bộ (ESG Audit)',
    color: '#eab308',
    bgDim: 'rgba(234, 179, 8, 0.16)',
    border: 'rgba(234, 179, 8, 0.45)',
    description:
      'Truy cập chỉ đọc (Read-only): Kiểm toán phát thải WTW/TTW/WTT (UC12), đối sánh hành lang (UC13) & xác thực báo cáo SHA-256 (UC14).',
    permissions: ['CARBON_READ', 'BENCHMARK_READ', 'REPORT_EXPORT', 'SHIPMENT_READ']
  },
  CUSTOMER: {
    role: 'CUSTOMER',
    portalType: 'CUSTOMER',
    fullName: 'Khách Hàng / Chủ Hàng Doanh Nghiệp B2B',
    department: 'Khách Hàng Doanh Nghiệp B2B',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)',
    color: '#ec4899',
    bgDim: 'rgba(236, 72, 153, 0.16)',
    border: 'rgba(236, 72, 153, 0.45)',
    description:
      'Khách hàng B2B đặt xe xanh tại /customer: khởi tạo vận đơn, giám sát container & IoT, chat 2 chiều với tài xế Grab/Xanh SM, xem ePOD & chứng chỉ ISO 14083 (BRULE-16).',
    permissions: [
      'SHIPMENT_CREATE',
      'SHIPMENT_READ_OWN',
      'POD_VIEW_OWN',
      'CARBON_READ',
      'DRIVER_CHAT',
      'PAYMENT_CREATE',
      'PAYMENT_READ_OWN',
      'CONTRACT_READ_OWN',
      'CONTRACT_CREATE',
      'CONTRACT_SIGN'
    ]
  },
  SHIPPER: {
    role: 'SHIPPER',
    portalType: 'SHIPPER',
    fullName: 'Đối Tác Giao Nhận Điểm Đích / Kho 3PL (Bên Thứ 3)',
    department: 'Kho Giao Nhận Điểm Đích & Hệ Thống 3PL',
    zone: 'THIRD_PARTY_DEST_3PL',
    zoneLabel: 'Cổng Đối Tác Giao Nhận Điểm Đích / Hệ Thống Thứ 3 (/shipper)',
    color: '#06b6d4',
    bgDim: 'rgba(6, 182, 212, 0.16)',
    border: 'rgba(6, 182, 212, 0.45)',
    description:
      'Bên thứ 3 tại địa điểm hàng được giao tới: xem container đang về bãi đích, xác nhận Dock-In/e-Seal, ký nhận bàn giao ePOD, chat chỉ dẫn tài xế vào cổng & đồng bộ Webhook sang WMS/ERP thứ 3.',
    permissions: [
      'SHIPMENT_READ_INBOUND',
      'POD_SUBMIT',
      'EXTERNAL_3PL_SYNC',
      'TRACKING_LIVE',
      'DRIVER_CHAT'
    ]
  }
};

const ACCOUNTS_STORAGE_KEY = 'ccadro_accounts_v2';

/**
 * Bộ 6 tài khoản hạt nhân cố định (System Seed Accounts) đồng bộ 1-1 với bảng `users` trong Flyway V014/V018.
 * Các tài khoản này được bảo vệ khỏi thao tác xóa hoặc hạ role trái phép.
 */
const ROOT_ADMIN_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000001',
  username: 'admin',
  password: 'ccadro@123',
  email: 'admin@ccadro.com',
  fullName: 'Quản Trị Viên Hệ Thống (Root Admin)',
  companyName: 'CCADRO Green Logistics Corporation',
  department: 'Ban Quản Trị Hạ Tầng & Bảo Mật IAM',
  customerId: 'CCADRO_CORE',
  phone: '028 3888 9999',
  industry: 'Điều hành Chuỗi cung ứng Xanh',
  role: 'ADMIN',
  portalType: 'INTERNAL',
  zone: 'INTERNAL_CORE',
  permissions: [...ENTERPRISE_ROLES.ADMIN.permissions],
  status: 'ACTIVE',
  isRootAdmin: true,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-01'
};

const ROOT_DISPATCHER_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000002',
  username: 'dispatcher',
  password: 'ccadro@123',
  email: 'dispatcher@ccadro.com',
  fullName: 'Nguyễn Văn Nam (Điều Phối Trưởng)',
  companyName: 'CCADRO Green Logistics Corporation',
  department: 'Trung Tâm Điều Hành Vận Tải Xanh',
  customerId: 'CCADRO_CORE',
  phone: '028 3888 8802',
  industry: 'Điều độ & Định tuyến Pareto',
  role: 'DISPATCHER',
  portalType: 'INTERNAL',
  zone: 'INTERNAL_CORE',
  permissions: [...ENTERPRISE_ROLES.DISPATCHER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-01'
};

const ROOT_DRIVER_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000003',
  username: 'driver',
  password: 'ccadro@123',
  email: 'driver@ccadro.com',
  fullName: 'Trần Văn Tài (Tài Xế Trưởng)',
  companyName: 'CCADRO Green Logistics Corporation',
  department: 'Đội Vận Tải Đường Dài Nam Bộ',
  customerId: 'CCADRO_FLEET',
  phone: '0903 812 456',
  industry: 'Vận Tải Hàng Hóa Đường Bộ Xanh',
  role: 'DRIVER',
  portalType: 'INTERNAL',
  zone: 'INTERNAL_CORE',
  permissions: [...ENTERPRISE_ROLES.DRIVER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-01'
};

const ROOT_AUDITOR_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000004',
  username: 'auditor',
  password: 'ccadro@123',
  email: 'auditor@ccadro.com',
  fullName: 'Lê Thị Kiểm Toán (GLEC v3 Auditor)',
  companyName: 'CCADRO Green Logistics Corporation',
  department: 'Tổ Chức Chứng Nhận Phát Thải Xanh',
  customerId: 'CCADRO_AUDIT',
  phone: '028 3888 8804',
  industry: 'Kiểm toán Carbon ISO 14083',
  role: 'ESG_AUDITOR',
  portalType: 'INTERNAL',
  zone: 'INTERNAL_CORE',
  permissions: [...ENTERPRISE_ROLES.ESG_AUDITOR.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-01'
};

const ROOT_SAFETY_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000005',
  username: 'safety',
  password: 'ccadro@123',
  email: 'safety@ccadro.com',
  fullName: 'Phạm Văn An Toàn (Safety Manager)',
  companyName: 'CCADRO Green Logistics Corporation',
  department: 'Phòng Thanh Tra Kỹ Thuật & An Toàn',
  customerId: 'CCADRO_SAFETY',
  phone: '028 3888 8805',
  industry: 'Thanh tra Kỹ thuật & An toàn Đội xe',
  role: 'SAFETY_MANAGER',
  portalType: 'INTERNAL',
  zone: 'INTERNAL_CORE',
  permissions: [...ENTERPRISE_ROLES.SAFETY_MANAGER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-01'
};

const ROOT_SHIPPER_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000006',
  username: 'shipper',
  password: 'ccadro@123',
  email: 'shipper-3pl@ccadro.com',
  fullName: 'Gemadept Destination 3PL Hub (Đối Tác Điểm Đích)',
  companyName: 'Gemadept & Kerry SmartWMS 3PL',
  department: 'Kho Giao Nhận Điểm Đích & Tích Hợp Hệ Thống Thứ 3',
  customerId: 'DEST_3PL_HUB',
  externalSystemName: 'Gemadept SmartPort API / SAP EWM',
  phone: '028 3899 3PL0',
  industry: 'Kho Vận Điểm Đích & Giao Nhận Bên Thứ 3 (3PL)',
  role: 'SHIPPER',
  portalType: 'SHIPPER',
  zone: 'THIRD_PARTY_DEST_3PL',
  permissions: [...ENTERPRISE_ROLES.SHIPPER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-01'
};

const ROOT_CUSTOMER_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000007',
  username: 'customer',
  password: 'ccadro@123',
  email: 'customer@ccadro.com',
  fullName: 'Minh Phú & Vinamilk B2B (Chủ Hàng)',
  companyName: 'Vinamilk Logistics Hub',
  department: 'Khách Hàng Doanh Nghiệp B2B',
  customerId: 'DOANH_NGHIEP_B2B',
  phone: '028 5415 5555',
  industry: 'Sản xuất & Chuỗi cung ứng Lạnh',
  role: 'CUSTOMER',
  portalType: 'CUSTOMER',
  zone: 'B2B_EXTRANET',
  permissions: [...ENTERPRISE_ROLES.CUSTOMER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-01'
};

export const ROOT_SYSTEM_ACCOUNTS = [
  ROOT_ADMIN_ACCOUNT,
  ROOT_DISPATCHER_ACCOUNT,
  ROOT_DRIVER_ACCOUNT,
  ROOT_AUDITOR_ACCOUNT,
  ROOT_SAFETY_ACCOUNT,
  ROOT_CUSTOMER_ACCOUNT,
  ROOT_SHIPPER_ACCOUNT
];

export function getDefaultPortalPath(targetUser) {
  if (!targetUser) return '/login';
  if (targetUser.role === 'SHIPPER' || targetUser.portalType === 'SHIPPER') {
    return '/shipper';
  }
  if (targetUser.role === 'CUSTOMER' || targetUser.portalType === 'CUSTOMER') {
    return '/customer';
  }
  if (targetUser.role === 'DRIVER') {
    return '/driver';
  }
  return '/portal';
}

function hydrateAccountWithRoleVisuals(acc) {
  const roleKey = ENTERPRISE_ROLES[acc.role] ? acc.role : 'CUSTOMER';
  const tpl = ENTERPRISE_ROLES[roleKey];
  const isShipper = roleKey === 'SHIPPER';
  const isCustomer = roleKey === 'CUSTOMER';

  return {
    ...tpl,
    ...acc,
    role: roleKey,
    portalType: isShipper ? 'SHIPPER' : isCustomer ? 'CUSTOMER' : 'INTERNAL',
    zone: isShipper ? 'THIRD_PARTY_DEST_3PL' : isCustomer ? 'B2B_EXTRANET' : 'INTERNAL_CORE',
    zoneLabel: isShipper
      ? 'Cổng Đối Tác Giao Nhận Điểm Đích / Hệ Thống Thứ 3 (/shipper)'
      : isCustomer
        ? 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)'
        : 'Hệ Thống Giám Sát Nội Bộ (Internal Core)',
    color: tpl.color,
    bgDim: tpl.bgDim,
    border: tpl.border,
    permissions:
      Array.isArray(acc.permissions) && acc.permissions.length > 0
        ? acc.permissions
        : [...tpl.permissions]
  };
}

function loadSystemAccounts() {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let list = parsed.map((acc) => {
          const seed = ROOT_SYSTEM_ACCOUNTS.find(
            (s) => s.username.toLowerCase() === (acc.username || '').toLowerCase()
          );
          if (seed) {
            return {
              ...seed,
              ...acc,
              userId: seed.userId,
              role: seed.role,
              portalType: seed.portalType,
              isRootAdmin: seed.isRootAdmin,
              isSystemSeed: true
            };
          }
          return acc;
        });

        for (const seed of ROOT_SYSTEM_ACCOUNTS) {
          if (!list.some((a) => a.username?.toLowerCase() === seed.username)) {
            list.push(seed);
          }
        }
        return list.map(hydrateAccountWithRoleVisuals);
      }
    }
  } catch (_) {
    // ignore storage errors
  }
  return ROOT_SYSTEM_ACCOUNTS.map(hydrateAccountWithRoleVisuals);
}

function saveSystemAccounts(list) {
  try {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    // ignore storage errors
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState(() => loadSystemAccounts());

  const [user, setUser] = useState(() => {
    try {
      const saved = window.localStorage.getItem('ccadro_user');
      if (saved) {
        return hydrateAccountWithRoleVisuals(JSON.parse(saved));
      }
    } catch (_) {
      // ignore
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    try {
      return window.localStorage.getItem('ccadro_token') || null;
    } catch (_) {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('IAM_MANAGED');

  /**
   * Đăng nhập cho cả User (Khách hàng tự đăng ký) và Nhân sự Nội bộ (do Admin khởi tạo).
   */
  const login = async (usernameInput, password) => {
    const normalized = (usernameInput || '').toLowerCase().trim();
    if (!normalized) {
      throw new Error('Vui lòng nhập tên đăng nhập hoặc email.');
    }

    const currentAccounts = loadSystemAccounts();
    setAccounts(currentAccounts);

    const matched = currentAccounts.find(
      (a) =>
        a.username?.toLowerCase() === normalized ||
        (a.email && a.email.toLowerCase() === normalized)
    );

    if (!matched) {
      throw new Error(
        `Tài khoản "${usernameInput}" chưa tồn tại trên hệ thống. Nếu bạn là Khách hàng, vui lòng bấm "Đăng ký tài khoản mới". Nếu bạn là Nhân sự nội bộ, tài khoản phải do ADMIN khởi tạo trong phân hệ Quản trị IAM.`
      );
    }

    if (matched.status === 'LOCKED') {
      throw new Error(
        `Tài khoản "@${matched.username}" đã bị Quản trị viên (ADMIN) tạm khóa truy cập.`
      );
    }

    const expectedPassword = matched.password || 'ccadro@123';
    if (password !== expectedPassword) {
      throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }

    // Thử đồng bộ JWT từ Identity Service nếu backend đang chạy
    let sessionToken = `iam-jwt-${matched.username}-${Date.now()}`;
    try {
      const res = await api.login(matched.username, password);
      if (res?.result?.token) {
        sessionToken = res.result.token;
      }
    } catch (_) {
      // Sử dụng phiên IAM cục bộ khi chạy độc lập
    }

    const profile = hydrateAccountWithRoleVisuals(matched);
    setToken(sessionToken);
    setUser(profile);
    setAuthMode(
      profile.portalType === 'SHIPPER'
        ? 'THIRD_PARTY_SHIPPER_AUTH'
        : profile.portalType === 'CUSTOMER'
          ? 'CUSTOMER_PORTAL_AUTH'
          : 'INTERNAL_IAM_AUTH'
    );

    try {
      window.localStorage.setItem('ccadro_token', sessionToken);
      window.localStorage.setItem('ccadro_user', JSON.stringify(profile));
    } catch (_) {
      // ignore
    }

    return {
      success: true,
      user: profile,
      token: sessionToken,
      redirectTo: getDefaultPortalPath(profile)
    };
  };

  /**
   * Dành cho User / Khách hàng tự đăng ký tài khoản mới tại /register
   */
  const registerUser = async (formData) => {
    const cleanUsername = (formData.username || '').trim().toLowerCase();
    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const fullName = (formData.fullName || '').trim();
    const companyName = (formData.companyName || '').trim();
    const phone = (formData.phone || '').trim();
    const industry = formData.industry || 'Sản xuất & Xuất nhập khẩu';
    const password = formData.password || '';

    if (cleanUsername.length < 3) {
      throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự.');
    }
    if (password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const currentAccounts = loadSystemAccounts();
    const duplicate = currentAccounts.find(
      (a) =>
        a.username.toLowerCase() === cleanUsername ||
        (cleanEmail && a.email?.toLowerCase() === cleanEmail)
    );

    if (duplicate) {
      throw new Error('Tên đăng nhập hoặc email này đã tồn tại trên hệ thống.');
    }

    const customerCode =
      (formData.customerCode || '').trim().toUpperCase() ||
      companyName
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 16) ||
      cleanUsername.toUpperCase();

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.slice(-1).join(' ') || cleanUsername;
    const lastName = nameParts.slice(0, -1).join(' ') || companyName;

    try {
      await api.createUser({
        username: cleanUsername,
        password,
        email: cleanEmail,
        firstName,
        lastName,
        roles: ['CUSTOMER']
      });
    } catch (_) {
      // ignore backend offline error
    }

    const newCustomerAccount = hydrateAccountWithRoleVisuals({
      userId: `usr-${Date.now()}`,
      username: cleanUsername,
      password,
      email: cleanEmail,
      fullName: fullName || cleanUsername,
      companyName: companyName || 'Doanh Nghiệp Khách Hàng',
      department: companyName || 'Khách Hàng Doanh Nghiệp B2B',
      customerId: customerCode,
      phone: phone || '0909 888 999',
      industry,
      role: 'CUSTOMER',
      portalType: 'CUSTOMER',
      permissions: [...ENTERPRISE_ROLES.CUSTOMER.permissions],
      status: 'ACTIVE',
      createdBy: 'SELF_REGISTERED',
      createdAt: new Date().toISOString().slice(0, 10)
    });

    const updated = [...currentAccounts, newCustomerAccount];
    setAccounts(updated);
    saveSystemAccounts(updated);

    const sessionToken = `customer-jwt-${cleanUsername}-${Date.now()}`;
    setToken(sessionToken);
    setUser(newCustomerAccount);
    setAuthMode('CUSTOMER_SELF_REGISTERED');

    try {
      window.localStorage.setItem('ccadro_token', sessionToken);
      window.localStorage.setItem('ccadro_user', JSON.stringify(newCustomerAccount));
    } catch (_) {
      // ignore
    }

    return {
      success: true,
      user: newCustomerAccount,
      token: sessionToken,
      redirectTo: '/customer'
    };
  };

  /**
   * Dành riêng cho ADMIN: Tạo tài khoản cho các Role nội bộ (DISPATCHER, SAFETY_MANAGER, DRIVER, ESG_AUDITOR, ADMIN)
   * hoặc tạo tài khoản đối tác B2B và gán quyền chi tiết.
   */
  const adminCreateAccount = async (payload) => {
    const cleanUsername = (payload.username || '').trim().toLowerCase();
    const cleanEmail = (payload.email || `${cleanUsername}@ccadro.com`).trim().toLowerCase();
    const password = payload.password || '';
    const fullName = (payload.fullName || '').trim();
    const roleKey = ENTERPRISE_ROLES[payload.role] ? payload.role : 'DISPATCHER';
    const roleTemplate = ENTERPRISE_ROLES[roleKey];

    if (cleanUsername.length < 3) {
      throw new Error('Username phải có từ 3 ký tự trở lên.');
    }
    if (password.length < 6) {
      throw new Error('Mật khẩu phải có từ 6 ký tự trở lên.');
    }

    const currentAccounts = loadSystemAccounts();
    const duplicate = currentAccounts.find(
      (a) =>
        a.username.toLowerCase() === cleanUsername ||
        (cleanEmail && a.email?.toLowerCase() === cleanEmail)
    );
    if (duplicate) {
      throw new Error(`Tài khoản "${cleanUsername}" hoặc email "${cleanEmail}" đã tồn tại.`);
    }

    const assignedPermissions =
      Array.isArray(payload.permissions) && payload.permissions.length > 0
        ? payload.permissions
        : [...roleTemplate.permissions];

    const isCustomer = roleKey === 'CUSTOMER';
    const isShipper = roleKey === 'SHIPPER';
    const department =
      (payload.department || '').trim() || roleTemplate.department || 'Trung Tâm Điều Hành Nội Bộ';
    const customerId = isCustomer
      ? (payload.customerId || cleanUsername).toUpperCase()
      : isShipper
        ? `3PL_${cleanUsername.toUpperCase()}`
        : 'CCADRO_INTERNAL';

    try {
      const nameParts = fullName.split(/\s+/);
      await api.createUser({
        username: cleanUsername,
        password,
        email: cleanEmail,
        firstName: nameParts.slice(-1).join(' ') || cleanUsername,
        lastName: nameParts.slice(0, -1).join(' ') || department,
        roles: [roleKey]
      });
    } catch (_) {
      // Vẫn lưu vào sổ cái IAM cục bộ
    }

    const newAcc = hydrateAccountWithRoleVisuals({
      userId: `iam-${Date.now()}`,
      username: cleanUsername,
      password,
      email: cleanEmail,
      fullName: fullName || cleanUsername,
      companyName: isCustomer || isShipper ? department : 'CCADRO Green Logistics Corporation',
      department,
      customerId,
      phone: payload.phone || '028 3888 9999',
      industry: isShipper
        ? 'Đối tác Giao nhận Điểm đích (3PL / WMS)'
        : isCustomer
          ? 'Đối tác Chủ hàng B2B'
          : 'Vận hành & Giám sát Nội bộ',
      role: roleKey,
      portalType: isShipper ? 'SHIPPER' : isCustomer ? 'CUSTOMER' : 'INTERNAL',
      permissions: assignedPermissions,
      status: 'ACTIVE',
      createdBy: user?.username || 'admin',
      createdAt: new Date().toISOString().slice(0, 10)
    });

    const updated = [...currentAccounts, newAcc];
    setAccounts(updated);
    saveSystemAccounts(updated);
    return newAcc;
  };

  /**
   * Dành cho ADMIN: Cập nhật Vai trò (Role), Danh sách Quyền (Permissions), Phòng ban hoặc Khóa/Mở khóa tài khoản.
   */
  const adminUpdateAccount = (usernameToUpdate, changes) => {
    const normalized = (usernameToUpdate || '').toLowerCase();
    const currentAccounts = loadSystemAccounts();

    const updated = currentAccounts.map((acc) => {
      if (acc.username.toLowerCase() !== normalized) return acc;

      // Không cho phép khóa, đổi role hoặc hạ quyền tài khoản Root Admin
      if (acc.isRootAdmin || acc.username === 'admin') {
        return hydrateAccountWithRoleVisuals({
          ...acc,
          fullName: changes.fullName ?? acc.fullName,
          department: changes.department ?? acc.department
        });
      }

      // 6 tài khoản hạt nhân cố định giữ nguyên Role cứng và trạng thái ACTIVE; cho phép tinh chỉnh permissions
      const isSeed =
        acc.isSystemSeed ||
        ROOT_SYSTEM_ACCOUNTS.some((s) => s.username === acc.username?.toLowerCase());
      const requestedRole =
        !isSeed && changes.role && SYSTEM_FIXED_ROLES.includes(changes.role)
          ? changes.role
          : acc.role;
      const nextRole = requestedRole;
      const nextStatus = isSeed ? 'ACTIVE' : changes.status || acc.status;
      const nextPermissions =
        Array.isArray(changes.permissions) && changes.permissions.length > 0
          ? changes.permissions
          : nextRole !== acc.role
            ? [...ENTERPRISE_ROLES[nextRole].permissions]
            : acc.permissions;

      return hydrateAccountWithRoleVisuals({
        ...acc,
        ...changes,
        role: nextRole,
        status: nextStatus,
        isSystemSeed: isSeed,
        permissions: nextPermissions
      });
    });

    setAccounts(updated);
    saveSystemAccounts(updated);

    // Nếu tài khoản đang đăng nhập chính là tài khoản vừa cập nhật thì đồng bộ lại phiên
    if (user?.username?.toLowerCase() === normalized) {
      const refreshed = updated.find((a) => a.username.toLowerCase() === normalized);
      if (refreshed) {
        setUser(refreshed);
        try {
          window.localStorage.setItem('ccadro_user', JSON.stringify(refreshed));
        } catch (_) {
          // ignore
        }
      }
    }

    return updated;
  };

  /**
   * Dành cho ADMIN: Xóa tài khoản khỏi hệ thống (ngoại trừ 6 tài khoản hạt nhân cố định).
   */
  const adminDeleteAccount = (usernameToDelete) => {
    const normalized = (usernameToDelete || '').toLowerCase();
    if (ROOT_SYSTEM_ACCOUNTS.some((s) => s.username === normalized)) {
      throw new Error(
        `Không thể xóa tài khoản hạt nhân cố định "@${normalized}" của hệ thống.`
      );
    }
    const currentAccounts = loadSystemAccounts();
    const updated = currentAccounts.filter((a) => a.username.toLowerCase() !== normalized);
    setAccounts(updated);
    saveSystemAccounts(updated);
    return updated;
  };

  const logout = async () => {
    if (token && !token.startsWith('iam-jwt-') && !token.startsWith('customer-jwt-')) {
      try {
        await api.logout(token);
      } catch (_) {
        // ignore
      }
    }
    setToken(null);
    setUser(null);
    setAuthMode('IAM_MANAGED');
    try {
      window.localStorage.removeItem('ccadro_token');
      window.localStorage.removeItem('ccadro_user');
    } catch (_) {
      // ignore
    }
  };

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
  };

  const hasRole = (...allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  // Tách danh sách Khách hàng B2B (CUSTOMER) và Đối tác Điểm đích 3PL (SHIPPER)
  const registeredUsers = accounts.filter(
    (a) => a.portalType === 'CUSTOMER' || a.role === 'CUSTOMER'
  );

  const shipperPartners = accounts.filter(
    (a) => a.portalType === 'SHIPPER' || a.role === 'SHIPPER'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authMode,
        accounts,
        registeredUsers,
        shipperPartners,
        login,
        registerUser,
        adminCreateAccount,
        adminUpdateAccount,
        adminDeleteAccount,
        logout,
        hasPermission,
        hasRole,
        getDefaultPortalPath,
        SYSTEM_FIXED_ROLES,
        ROOT_SYSTEM_ACCOUNTS,
        ENTERPRISE_ROLES,
        ALL_SYSTEM_PERMISSIONS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
