import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';
import { useLiveIdentity } from '../hooks/useLiveIdentity';

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
  'HUB_MANAGER',
  'HUB_SHIPPER',
  'HUB_AUDITOR',
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
  { code: 'CONTRACT_MANAGE', label: 'Quản trị hạn mức công nợ & đối soát SLA', group: 'Hợp đồng & SLA' },
  { code: 'HUB_WORKSPACE_READ', label: 'Truy cập không gian làm việc Trụ sở được phân công', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'CONTAINER_MANIFEST_INGEST', label: 'Nhận dữ liệu Manifest từ Container vào Trụ sở', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'HUB_DISPATCH_AUTO', label: 'Chia đơn tự động theo khoảng cách GPS trong Trụ sở', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'HUB_TASK_RANGE_ASSIGN', label: 'Giao nhiệm vụ cho Shipper theo Dải mã số', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'SHIPPER_POLICY_READ', label: 'Xem Chính sách vận hành dành riêng cho Shipper', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'SHIPPER_OWN_SCOPE_READ', label: 'Xem phạm vi địa bàn giao hôm nay của bản thân', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'SHIPPER_ITEM_STATUS_UPDATE', label: 'Cập nhật trạng thái đang đi giao hàng', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'POD_PHOTO_SUBMIT', label: 'Chụp & nộp Ảnh xác thực giao hàng (Photo POD)', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'POD_PHOTO_VIEW', label: 'Xem và đối soát Ảnh bằng chứng POD', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'HUB_AUDIT_READ', label: 'Kiểm toán chất lượng POD & tuân thủ SLA (Chỉ đọc)', group: 'Phân quyền Trụ sở & Shipper' },
  { code: 'HUB_ACCOUNT_MANAGE', label: 'Cấp phát & khóa/mở khóa tài khoản nội bộ Trụ sở', group: 'Phân quyền Trụ sở & Shipper' }
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
  },
  HUB_MANAGER: {
    role: 'HUB_MANAGER',
    portalType: 'SHIPPER',
    fullName: 'Trưởng Trụ Sở Giao Nhận Nội Khu',
    department: 'Ban Điều Phối Trụ Sở Địa Phương (Hub Isolation)',
    zone: 'HUB_OPERATIONS',
    zoneLabel: 'Cổng Điều Hành Trụ Sở & Giao Dải Mã (/shipper)',
    color: '#059669',
    bgDim: 'rgba(16, 185, 129, 0.16)',
    border: 'rgba(16, 185, 129, 0.45)',
    description:
      'Quản lý duy nhất 01 Trụ sở được phân công: nhận Manifest Container, chia đơn theo vị trí, giao nhiệm vụ theo Dải mã số & quản trị tài khoản Shipper của Trụ sở.',
    permissions: [
      'HUB_WORKSPACE_READ',
      'SHIPMENT_READ_INBOUND',
      'CONTAINER_MANIFEST_INGEST',
      'HUB_DISPATCH_AUTO',
      'HUB_TASK_RANGE_ASSIGN',
      'SHIPPER_POLICY_READ',
      'POD_PHOTO_VIEW',
      'POD_SUBMIT',
      'TRACKING_LIVE',
      'EXTERNAL_3PL_SYNC',
      'DRIVER_CHAT',
      'HUB_ACCOUNT_MANAGE'
    ]
  },
  HUB_SHIPPER: {
    role: 'HUB_SHIPPER',
    portalType: 'SHIPPER',
    fullName: 'Nhân Viên Giao Hàng Chặng Cuối (Shipper)',
    department: 'Đội Giao Nhận Nội Khu Trụ Sở',
    zone: 'HUB_SHIPPER_SCOPED',
    zoneLabel: 'Cổng Shipper Cô Lập Trụ Sở & Photo POD (/shipper)',
    color: '#0284c7',
    bgDim: 'rgba(2, 132, 199, 0.16)',
    border: 'rgba(2, 132, 199, 0.45)',
    description:
      'Bị khóa cứng vào 01 Trụ sở & 01 mã Shipper: chỉ xem Chính sách Shipper, Phạm vi giao hôm nay, các đơn hàng trong dải mã được giao, cập nhật đi giao & chụp Ảnh POD.',
    permissions: [
      'HUB_WORKSPACE_READ',
      'SHIPMENT_READ_INBOUND',
      'SHIPPER_POLICY_READ',
      'SHIPPER_OWN_SCOPE_READ',
      'SHIPPER_ITEM_STATUS_UPDATE',
      'POD_PHOTO_SUBMIT',
      'POD_PHOTO_VIEW',
      'POD_SUBMIT',
      'TRACKING_LIVE'
    ]
  },
  HUB_AUDITOR: {
    role: 'HUB_AUDITOR',
    portalType: 'SHIPPER',
    fullName: 'Kiểm Tra Viên Ảnh POD & SLA Trụ Sở',
    department: 'Bộ Phận Kiểm Soát Chất Lượng Trụ Sở',
    zone: 'HUB_AUDIT_READONLY',
    zoneLabel: 'Cổng Kiểm Soát Chất Lượng Trụ Sở (Chỉ Đọc)',
    color: '#d97706',
    bgDim: 'rgba(245, 158, 11, 0.16)',
    border: 'rgba(245, 158, 11, 0.45)',
    description:
      'Chế độ Chỉ đọc (Read-only): Thẩm định Ảnh POD, nhiệt độ bảo ôn và tuân thủ chính sách nội bộ tại Trụ sở được phân công; không có quyền chia đơn hay sửa POD.',
    permissions: [
      'HUB_WORKSPACE_READ',
      'SHIPMENT_READ_INBOUND',
      'SHIPPER_POLICY_READ',
      'POD_PHOTO_VIEW',
      'HUB_AUDIT_READ',
      'TRACKING_LIVE'
    ]
  }
};

const ACCOUNTS_STORAGE_KEY = 'ccadro_accounts_v3';
const COMPANIES_STORAGE_KEY = 'ccadro_companies_v1';
const SEED_PASSWORD_VERSION = '123-v1';
const HUB_AUDIT_STORAGE_KEY = 'ccadro_hub_auth_audit_v1';

export const ROOT_SYSTEM_COMPANIES = [
  {
    id: '90000000-0000-0000-0000-000000000001',
    companyCode: 'CCADRO_INT',
    companyName: 'CCADRO Green Logistics Corporation',
    taxCode: '0316889901',
    businessLicenseNumber: 'GP-KDVT-2026-0001',
    industry: 'Vận tải Xanh & Điều phối Thông minh',
    companyType: 'INTERNAL_CORP',
    companyPhone: '028 3888 8801',
    companyEmail: 'noc@ccadro.com',
    headquartersAddress: 'Tầng 12, Tòa nhà Smart Logistics, TP. Thủ Đức, TP.HCM',
    representativeName: 'Trần Minh Quản Trị',
    representativeTitle: 'Giám đốc Điều hành NOC',
    creditTier: 'ENTERPRISE_MSA',
    creditLimitVnd: 0,
    kycStatus: 'VERIFIED',
    isSystemSeed: true,
    isDeleted: false,
    createdAt: '2026-11-01'
  },
  {
    id: '90000000-0000-0000-0000-000000000002',
    companyCode: 'VINAMILK',
    companyName: 'CTCP Sữa Việt Nam (Vinamilk Logistics)',
    taxCode: '0300588569',
    businessLicenseNumber: 'GP-B2B-2025-8821',
    industry: 'FMCG & Chuỗi lạnh Thực phẩm',
    companyType: 'B2B_CUSTOMER',
    companyPhone: '028 5415 5555',
    companyEmail: 'logistics-b2b@vinamilk.com.vn',
    headquartersAddress: 'Số 10 Tân Trào, Phường Tân Phú, Quận 7, TP.HCM',
    representativeName: 'Nguyễn Thị Lan Anh',
    representativeTitle: 'Giám đốc Chuỗi cung ứng',
    creditTier: 'ENTERPRISE_MSA',
    creditLimitVnd: 500000000,
    kycStatus: 'VERIFIED',
    isSystemSeed: true,
    isDeleted: false,
    createdAt: '2026-11-01'
  },
  {
    id: '90000000-0000-0000-0000-000000000003',
    companyCode: 'SAMSUNG_VN',
    companyName: 'Công ty TNHH Samsung Electronics Việt Nam',
    taxCode: '2300325764',
    businessLicenseNumber: 'GP-B2B-2025-4410',
    industry: 'Điện tử & Linh kiện Xuất khẩu',
    companyType: 'B2B_CUSTOMER',
    companyPhone: '0222 369 6666',
    companyEmail: 'scm-vn@samsung.com',
    headquartersAddress: 'KCN Yên Phong I, Huyện Yên Phong, Tỉnh Bắc Ninh',
    representativeName: 'Phạm Minh Đức',
    representativeTitle: 'Trưởng phòng Xuất nhập khẩu',
    creditTier: 'GOLD_NET30',
    creditLimitVnd: 350000000,
    kycStatus: 'VERIFIED',
    isSystemSeed: true,
    isDeleted: false,
    createdAt: '2026-11-05'
  },
  {
    id: '90000000-0000-0000-0000-000000000004',
    companyCode: 'HUB_DINHBANG_BN',
    companyName: 'Trung Tâm Phân Phối Đình Bảng - VSIP Bắc Ninh',
    taxCode: '2301122334',
    businessLicenseNumber: 'GP-HUB-2026-0112',
    industry: 'Vận hành Hub Trung chuyển & Last-Mile',
    companyType: 'HUB_OPERATOR',
    companyPhone: '0222 374 8899',
    companyEmail: 'dinhbang-hub@ccadro.com',
    headquartersAddress: 'Lô CN-04 KCN VSIP, Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    representativeName: 'Trần Minh Quang',
    representativeTitle: 'Trưởng Trụ sở Hub Đình Bảng',
    creditTier: 'STANDARD',
    creditLimitVnd: 0,
    kycStatus: 'VERIFIED',
    isSystemSeed: true,
    isDeleted: false,
    createdAt: '2026-11-10'
  },
  {
    id: '90000000-0000-0000-0000-000000000005',
    companyCode: 'DHL_3PL',
    companyName: 'DHL Supply Chain Việt Nam (Đối tác 3PL)',
    taxCode: '0309911223',
    businessLicenseNumber: 'GP-3PL-2025-9902',
    industry: 'Kho vận 3PL & Giao nhận Cảng đích',
    companyType: 'PARTNER_3PL',
    companyPhone: '028 3844 6203',
    companyEmail: 'partner3pl@dhl-logistics.vn',
    headquartersAddress: 'KCN Amata, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
    representativeName: 'Lê Quốc Bảo',
    representativeTitle: 'Giám đốc Kho vận Miền Nam',
    creditTier: 'GOLD_NET30',
    creditLimitVnd: 200000000,
    kycStatus: 'VERIFIED',
    isSystemSeed: true,
    isDeleted: false,
    createdAt: '2026-11-12'
  }
];

function loadSystemCompanies() {
  try {
    const raw = window.localStorage.getItem(COMPANIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const list = [...parsed];
        for (const seed of ROOT_SYSTEM_COMPANIES) {
          if (!list.some((c) => c.companyCode?.toUpperCase() === seed.companyCode)) {
            list.push({ ...seed });
          }
        }
        return list;
      }
    }
  } catch (_) {
    // ignore
  }
  return ROOT_SYSTEM_COMPANIES.map((c) => ({ ...c }));
}

function saveSystemCompanies(list) {
  try {
    window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    // ignore
  }
}

// Deterministic salted digest so plaintext passwords are NEVER persisted in localStorage
function computeSaltedDigest(rawPassword, username) {
  const input = `ccadro-iam-v3::${(username || '').toLowerCase()}::${rawPassword || ''}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
  }
  return `sha256-salt:${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function sanitizeStoredAccount(acc) {
  const digest =
    acc.passwordDigest ||
    (acc.password ? computeSaltedDigest(acc.password, acc.username) : computeSaltedDigest('123', acc.username));
  const { password: _removedPlaintext, ...rest } = acc;
  return {
    ...rest,
    isDeleted: Boolean(rest.isDeleted),
    deletedAt: rest.deletedAt || null,
    deletedBy: rest.deletedBy || null,
    passwordDigest: digest
  };
}

/**
 * Bộ 6 tài khoản hạt nhân cố định (System Seed Accounts) đồng bộ 1-1 với bảng `users` trong Flyway V014/V018.
 * Các tài khoản này được bảo vệ khỏi thao tác xóa hoặc hạ role trái phép.
 */
const ROOT_ADMIN_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000001',
  username: 'admin',
  password: '123',
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
  password: '123',
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
  password: '123',
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
  password: '123',
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
  password: '123',
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
  password: '123',
  email: 'shipper-bn1@ccadro.com',
  fullName: 'Nguyễn Văn Toàn (Shipper Đình Bảng #1)',
  companyName: 'Trụ sở Đình Bảng - Từ Sơn, Bắc Ninh',
  department: 'Đội Giao Nhận Đình Bảng • KCN VSIP Bắc Ninh',
  customerId: 'HUB_DINHBANG_BN',
  assignedHubCode: 'HUB-DINHBANG-BN',
  assignedShipperCode: 'SHP-BN-001',
  phone: '0912 345 101',
  industry: 'Giao Hàng Chặng Cuối (Last-Mile Cold Chain)',
  role: 'HUB_SHIPPER',
  portalType: 'SHIPPER',
  zone: 'HUB_SHIPPER_SCOPED',
  permissions: [...ENTERPRISE_ROLES.HUB_SHIPPER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-14'
};

const ROOT_HUB_MGR_DINHBANG = {
  userId: '10000000-0000-0000-0000-000000000011',
  username: 'hub_mgr_dinhbang',
  password: '123',
  email: 'hub-mgr-dinhbang@ccadro.com',
  fullName: 'Trần Minh Quang (Trưởng Trụ Sở Đình Bảng)',
  companyName: 'Trụ sở Đình Bảng - Từ Sơn, Bắc Ninh',
  department: 'Ban Điều Hành Trụ Sở Đình Bảng - Từ Sơn',
  customerId: 'HUB_DINHBANG_BN',
  assignedHubCode: 'HUB-DINHBANG-BN',
  assignedShipperCode: null,
  phone: '0222 3841 999',
  industry: 'Điều Phối Trụ Sở Địa Phương (Hub-and-Spoke)',
  role: 'HUB_MANAGER',
  portalType: 'SHIPPER',
  zone: 'HUB_OPERATIONS',
  permissions: [...ENTERPRISE_ROLES.HUB_MANAGER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-14'
};

const ROOT_HUB_MGR_AMATA = {
  userId: '10000000-0000-0000-0000-000000000012',
  username: 'hub_mgr_amata',
  password: '123',
  email: 'hub-mgr-amata@ccadro.com',
  fullName: 'Lê Hoàng Nam (Trưởng Trụ Sở Amata)',
  companyName: 'Trụ sở Amata - Biên Hòa, Đồng Nai',
  department: 'Ban Điều Hành Trụ Sở Amata - Biên Hòa',
  customerId: 'HUB_AMATA_BH',
  assignedHubCode: 'HUB-AMATA-BH',
  assignedShipperCode: null,
  phone: '0251 3992 888',
  industry: 'Điều Phối Trụ Sở Địa Phương (Hub-and-Spoke)',
  role: 'HUB_MANAGER',
  portalType: 'SHIPPER',
  zone: 'HUB_OPERATIONS',
  permissions: [...ENTERPRISE_ROLES.HUB_MANAGER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-14'
};

const ROOT_SHIPPER_BN2 = {
  userId: '10000000-0000-0000-0000-000000000013',
  username: 'shipper_bn2',
  password: '123',
  email: 'shipper-bn2@ccadro.com',
  fullName: 'Phạm Thị Lan Anh (Shipper Đình Bảng #2)',
  companyName: 'Trụ sở Đình Bảng - Từ Sơn, Bắc Ninh',
  department: 'Đội Giao Nhận Đình Bảng • Phố Mới Từ Sơn',
  customerId: 'HUB_DINHBANG_BN',
  assignedHubCode: 'HUB-DINHBANG-BN',
  assignedShipperCode: 'SHP-BN-002',
  phone: '0912 345 102',
  industry: 'Giao Hàng Chặng Cuối (Last-Mile Cold Chain)',
  role: 'HUB_SHIPPER',
  portalType: 'SHIPPER',
  zone: 'HUB_SHIPPER_SCOPED',
  permissions: [...ENTERPRISE_ROLES.HUB_SHIPPER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-14'
};

const ROOT_SHIPPER_BN3 = {
  userId: '10000000-0000-0000-0000-000000000014',
  username: 'shipper_bn3',
  password: '123',
  email: 'shipper-bn3@ccadro.com',
  fullName: 'Ngô Đức Hải (Shipper Đình Bảng #3)',
  companyName: 'Trụ sở Đình Bảng - Từ Sơn, Bắc Ninh',
  department: 'Đội Giao Nhận Đình Bảng • Cụm Đền Đô',
  customerId: 'HUB_DINHBANG_BN',
  assignedHubCode: 'HUB-DINHBANG-BN',
  assignedShipperCode: 'SHP-BN-003',
  phone: '0912 345 103',
  industry: 'Giao Hàng Chặng Cuối (Last-Mile Cold Chain)',
  role: 'HUB_SHIPPER',
  portalType: 'SHIPPER',
  zone: 'HUB_SHIPPER_SCOPED',
  permissions: [...ENTERPRISE_ROLES.HUB_SHIPPER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-14'
};

const ROOT_SHIPPER_AMATA = {
  userId: '10000000-0000-0000-0000-000000000015',
  username: 'shipper_amata',
  password: '123',
  email: 'shipper-amata@ccadro.com',
  fullName: 'Đặng Quốc Bảo (Shipper Amata #101)',
  companyName: 'Trụ sở Amata - Biên Hòa, Đồng Nai',
  department: 'Đội Giao Nhận Amata • KCN Long Bình',
  customerId: 'HUB_AMATA_BH',
  assignedHubCode: 'HUB-AMATA-BH',
  assignedShipperCode: 'SHP-BH-101',
  phone: '0902 418 229',
  industry: 'Giao Hàng Chặng Cuối (Last-Mile Cold Chain)',
  role: 'HUB_SHIPPER',
  portalType: 'SHIPPER',
  zone: 'HUB_SHIPPER_SCOPED',
  permissions: [...ENTERPRISE_ROLES.HUB_SHIPPER.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-14'
};

const ROOT_HUB_AUDITOR_BN = {
  userId: '10000000-0000-0000-0000-000000000016',
  username: 'hub_inspector_bn',
  password: '123',
  email: 'inspector-bn@ccadro.com',
  fullName: 'Vũ Thu Hà (Kiểm Tra Viên Ảnh POD & SLA)',
  companyName: 'Trụ sở Đình Bảng - Từ Sơn, Bắc Ninh',
  department: 'Bộ Phận Thanh Tra Chất Lượng POD & SLA',
  customerId: 'HUB_DINHBANG_BN',
  assignedHubCode: 'HUB-DINHBANG-BN',
  assignedShipperCode: null,
  phone: '0918 776 301',
  industry: 'Kiểm Soát Tuân Thủ & Thanh Tra POD',
  role: 'HUB_AUDITOR',
  portalType: 'SHIPPER',
  zone: 'HUB_AUDIT_READONLY',
  permissions: [...ENTERPRISE_ROLES.HUB_AUDITOR.permissions],
  status: 'ACTIVE',
  isRootAdmin: false,
  isSystemSeed: true,
  createdBy: 'SYSTEM_BOOTSTRAP',
  createdAt: '2026-11-14'
};

const ROOT_CUSTOMER_ACCOUNT = {
  userId: '10000000-0000-0000-0000-000000000007',
  username: 'customer',
  password: '123',
  email: 'customer@ccadro.com',
  fullName: 'Minh Phú & Vinamilk B2B (Chủ Hàng)',
  jobTitle: 'Trưởng nhóm Điều vận B2B',
  companyId: '90000000-0000-0000-0000-000000000002',
  companyCode: 'VINAMILK',
  companyName: 'CTCP Sữa Việt Nam (Vinamilk Logistics)',
  taxCode: '0300588569',
  headquartersAddress: 'Số 10 Tân Trào, Phường Tân Phú, Quận 7, TP.HCM',
  creditTier: 'ENTERPRISE_MSA',
  creditLimitVnd: 500000000,
  kycStatus: 'VERIFIED',
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
  ROOT_SHIPPER_ACCOUNT,
  ROOT_HUB_MGR_DINHBANG,
  ROOT_HUB_MGR_AMATA,
  ROOT_SHIPPER_BN2,
  ROOT_SHIPPER_BN3,
  ROOT_SHIPPER_AMATA,
  ROOT_HUB_AUDITOR_BN
].map(sanitizeStoredAccount);

export const HUB_ACCOUNT_DIRECTORY = [
  ROOT_HUB_MGR_DINHBANG,
  ROOT_SHIPPER_ACCOUNT,
  ROOT_SHIPPER_BN2,
  ROOT_SHIPPER_BN3,
  ROOT_HUB_AUDITOR_BN,
  ROOT_HUB_MGR_AMATA,
  ROOT_SHIPPER_AMATA
].map((acc) => ({
  username: acc.username,
  role: acc.role,
  roleLabel: ENTERPRISE_ROLES[acc.role]?.roleLabel || acc.role,
  fullName: acc.fullName,
  assignedHubCode: acc.assignedHubCode,
  assignedShipperCode: acc.assignedShipperCode,
  companyName: acc.companyName,
  defaultHint: '123'
}));

const SHIPPER_PORTAL_ROLES = ['HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR', 'SHIPPER'];

export function getDefaultPortalPath(targetUser) {
  if (!targetUser) return '/login';
  if (SHIPPER_PORTAL_ROLES.includes(targetUser.role) || targetUser.portalType === 'SHIPPER') {
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

export function getAccessibleWorkspaces(targetUser) {
  if (!targetUser) return [];
  const role = targetUser.role;

  // Nguyên tắc phân quyền chặt: mỗi role CHỈ truy cập đúng cổng đã được phân quyền cho tài khoản đăng nhập.
  // Không cho phép Admin hay bất kỳ role nào chuyển/xoay ngang sang cổng của role khác.
  if (['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'].includes(role)) {
    return [
      {
        id: 'internal',
        path: '/portal',
        name: 'Trung Tâm Điều Hành Nội Bộ',
        subtitle: 'Giám sát đội xe 24/7, Lộ trình Xanh & Kiểm toán GLEC',
        badge: role
      }
    ];
  }

  if (SHIPPER_PORTAL_ROLES.includes(role)) {
    return [
      {
        id: 'shipper',
        path: '/shipper',
        name: 'Hệ Thống Trụ Sở & Shipper',
        subtitle: targetUser.assignedHubCode
          ? `Cô lập Trụ sở: ${targetUser.assignedHubCode}${targetUser.assignedShipperCode ? ` • ${targetUser.assignedShipperCode}` : ''}`
          : 'Điều phối Trụ sở địa phương, Giao dải mã & Photo POD',
        badge: targetUser.assignedHubCode || 'HUB-3PL'
      }
    ];
  }

  if (role === 'CUSTOMER') {
    return [
      {
        id: 'customer',
        path: '/customer',
        name: 'Hệ Thống Khách Hàng B2B',
        subtitle: targetUser.companyName || 'Đặt vận đơn xanh, Hợp đồng SLA & Thanh toán',
        badge: 'B2B Portal'
      }
    ];
  }

  if (role === 'DRIVER') {
    return [
      {
        id: 'driver',
        path: '/driver',
        name: 'Khoang Lái Tài Xế (Driver HUD)',
        subtitle: 'Điều hướng GPS, sự cố chặng đường & ePOD',
        badge: 'Driver'
      }
    ];
  }

  return [];
}

function hydrateAccountWithRoleVisuals(acc) {
  const roleKey = ENTERPRISE_ROLES[acc.role] ? acc.role : 'CUSTOMER';
  const tpl = ENTERPRISE_ROLES[roleKey];
  const isShipper = SHIPPER_PORTAL_ROLES.includes(roleKey);
  const isCustomer = roleKey === 'CUSTOMER';
  const sanitized = sanitizeStoredAccount(acc);

  return {
    ...tpl,
    ...sanitized,
    role: roleKey,
    portalType: isShipper ? 'SHIPPER' : isCustomer ? 'CUSTOMER' : 'INTERNAL',
    zone: isShipper
      ? tpl.zone || 'HUB_OPERATIONS'
      : isCustomer
        ? 'B2B_EXTRANET'
        : 'INTERNAL_CORE',
    zoneLabel: isShipper
      ? tpl.zoneLabel || 'Cổng Trụ Sở & Shipper Cô Lập (/shipper)'
      : isCustomer
        ? 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)'
        : 'Hệ Thống Giám Sát Nội Bộ (Internal Core)',
    color: tpl.color,
    bgDim: tpl.bgDim,
    border: tpl.border,
    permissions:
      Array.isArray(acc.permissions)
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
            const shouldUpgradeSeedPassword =
              !acc.passwordChangedAt && acc.passwordSeedVersion !== SEED_PASSWORD_VERSION;
            return sanitizeStoredAccount({
              ...seed,
              ...acc,
              userId: seed.userId,
              role: seed.role,
              portalType: seed.portalType,
              assignedHubCode: seed.assignedHubCode || acc.assignedHubCode || null,
              assignedShipperCode: seed.assignedShipperCode || acc.assignedShipperCode || null,
              isRootAdmin: seed.isRootAdmin,
              isSystemSeed: true,
              passwordSeedVersion: SEED_PASSWORD_VERSION,
              passwordDigest: shouldUpgradeSeedPassword
                ? seed.passwordDigest
                : acc.passwordDigest || seed.passwordDigest
            });
          }
          return sanitizeStoredAccount(acc);
        });

        for (const seed of ROOT_SYSTEM_ACCOUNTS) {
          if (!list.some((a) => a.username?.toLowerCase() === seed.username)) {
            list.push(sanitizeStoredAccount(seed));
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
    const sanitized = list.map(sanitizeStoredAccount);
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (_) {
    // ignore storage errors
  }
}

function loadHubAuthAuditLogs() {
  try {
    const raw = window.localStorage.getItem(HUB_AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {
    // ignore
  }
  return [
    {
      id: 'audit-seed-01',
      eventType: 'IAM_SCHEMA_INITIALIZED',
      username: 'SYSTEM_BOOTSTRAP',
      assignedHubCode: 'HUB-DINHBANG-BN',
      outcome: 'SUCCESS',
      detail: 'Khởi tạo phân vùng bảo mật hub_iam & 5 tài khoản cô lập Trụ sở Đình Bảng - Từ Sơn.',
      createdAt: '2026-11-14T08:00:00Z'
    }
  ];
}

function appendHubAuthAuditLog(entry) {
  const existing = loadHubAuthAuditLogs();
  const next = [
    {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...entry
    },
    ...existing
  ].slice(0, 100);
  try {
    window.localStorage.setItem(HUB_AUDIT_STORAGE_KEY, JSON.stringify(next));
  } catch (_) {
    // ignore
  }
  return next;
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
  const [companies, setCompanies] = useState(() => loadSystemCompanies());
  const [hubAuthAuditLogs, setHubAuthAuditLogs] = useState(() => loadHubAuthAuditLogs());
  const demoIdentity = import.meta.env.VITE_DEMO_MODE === 'true';
  const liveIdentity = useLiveIdentity({ user, token, setUser, setToken, setAuthMode,
    templates: ENTERPRISE_ROLES, enabled: !demoIdentity });

  /**
   * Đăng nhập bảo mật đa lớp:
   * - Xác thực qua Identity Service (BCrypt + JWT HS512) hoặc fallback salted-digest offline
   * - Chống Brute-force: khóa 15 phút sau 5 lần sai mật khẩu
   * - Ghi nhận nhật ký bảo mật hub_iam.hub_auth_audit_logs
   */
  const login = async (usernameInput, password, { requireBackend = false } = {}) => {
    if (!demoIdentity || requireBackend) {
      const result = await liveIdentity.authenticate(usernameInput, password);
      return { ...result, redirectTo: getDefaultPortalPath(result.user) };
    }
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
      setHubAuthAuditLogs(
        appendHubAuthAuditLog({
          eventType: 'LOGIN_FAILED_UNKNOWN_USER',
          username: normalized,
          assignedHubCode: 'UNKNOWN',
          outcome: 'DENIED',
          detail: 'Tài khoản không tồn tại trong sổ cái IAM.'
        })
      );
      throw new Error(
        `Tài khoản "${usernameInput}" chưa tồn tại trên hệ thống. Nếu bạn là Khách hàng, vui lòng bấm "Đăng ký tài khoản mới". Nếu bạn là Nhân sự nội bộ / Shipper, tài khoản phải do ADMIN hoặc Trưởng Trụ sở cấp phát.`
      );
    }

    if (matched.isDeleted || matched.status === 'DELETED') {
      setHubAuthAuditLogs(
        appendHubAuthAuditLog({
          eventType: 'LOGIN_BLOCKED_SOFT_DELETED',
          username: matched.username,
          assignedHubCode: matched.assignedHubCode || 'GLOBAL',
          outcome: 'DENIED',
          detail: 'Từ chối đăng nhập vì tài khoản đang nằm trong thùng rác (đã xóa mềm).'
        })
      );
      throw new Error(
        `Tài khoản "@${matched.username}" đã bị xóa mềm. Vui lòng liên hệ ADMIN để khôi phục.`
      );
    }

    if (matched.status === 'LOCKED') {
      setHubAuthAuditLogs(
        appendHubAuthAuditLog({
          eventType: 'LOGIN_BLOCKED_LOCKED',
          username: matched.username,
          assignedHubCode: matched.assignedHubCode || 'GLOBAL',
          outcome: 'DENIED',
          detail: 'Từ chối đăng nhập vì tài khoản đang ở trạng thái LOCKED.'
        })
      );
      throw new Error(
        `Tài khoản "@${matched.username}" đã bị khóa truy cập. Vui lòng liên hệ ADMIN hoặc Trưởng Trụ sở.`
      );
    }

    if (matched.lockedUntil && new Date(matched.lockedUntil).getTime() > Date.now()) {
      const minsLeft = Math.max(
        1,
        Math.ceil((new Date(matched.lockedUntil).getTime() - Date.now()) / 60000)
      );
      throw new Error(
        `Tài khoản "@${matched.username}" đang bị tạm khóa bảo mật (Brute-force Protection) trong ${minsLeft} phút.`
      );
    }

    const expectedDigest =
      matched.passwordDigest || computeSaltedDigest('123', matched.username);
    const inputDigest = computeSaltedDigest(password, matched.username);

    // Thử xác thực qua Identity Service (BCrypt + JWT HS512) nếu backend đang hoạt động
    let sessionToken = null;
    let backendVerified = false;
    let backendAuthPayload = null;
    try {
      const res = await api.login(matched.username, password);
      if (res?.result?.token) {
        sessionToken = res.result.token;
        backendVerified = true;
        backendAuthPayload = res.result;
      }
    } catch (err) {
      if (requireBackend) throw new Error(err.message || 'Không thể xác thực với máy chủ. Vui lòng thử lại.');
      // Nếu backend phản hồi lỗi 401/403/423 (có HTTP status) thì tôn trọng quyết định từ chối của backend
      const msg = String(err?.message || '');
      if (err?.status === 401 || err?.status === 403 || err?.status === 423 || msg.includes('401') || msg.includes('khóa')) {
        setHubAuthAuditLogs(
          appendHubAuthAuditLog({
            eventType: 'LOGIN_DENIED_BACKEND',
            username: matched.username,
            assignedHubCode: matched.assignedHubCode || 'GLOBAL',
            outcome: 'DENIED',
            detail: msg || 'Backend Identity Service từ chối xác thực.'
          })
        );
        throw new Error(msg || 'Xác thực thất bại tại Identity Service.');
      }
      // Backend offline -> fallback kiểm tra salted digest cục bộ
    }

    if (requireBackend && !backendVerified) {
      throw new Error('Máy chủ chưa cấp phiên đăng nhập. Vui lòng thử lại khi kết nối được khôi phục.');
    }
    if (!backendVerified && inputDigest !== expectedDigest) {
      const nextAttempts = Number(matched.failedLoginAttempts || 0) + 1;
      const shouldLockTemporarily = nextAttempts >= 5;
      const lockUntilIso = shouldLockTemporarily
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;

      const updated = currentAccounts.map((acc) =>
        acc.username.toLowerCase() === matched.username.toLowerCase()
          ? {
              ...acc,
              failedLoginAttempts: nextAttempts,
              lockedUntil: lockUntilIso
            }
          : acc
      );
      setAccounts(updated);
      saveSystemAccounts(updated);

      setHubAuthAuditLogs(
        appendHubAuthAuditLog({
          eventType: shouldLockTemporarily ? 'ACCOUNT_BRUTEFORCE_LOCKED' : 'LOGIN_FAILED_PASSWORD',
          username: matched.username,
          assignedHubCode: matched.assignedHubCode || 'GLOBAL',
          outcome: 'DENIED',
          detail: shouldLockTemporarily
            ? 'Khóa tạm thời 15 phút do nhập sai mật khẩu liên tiếp 5 lần.'
            : `Sai mật khẩu (lần ${nextAttempts}/5).`
        })
      );

      if (shouldLockTemporarily) {
        throw new Error(
          `Tài khoản "@${matched.username}" đã bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp.`
        );
      }
      throw new Error(
        `Mật khẩu không chính xác (Còn ${5 - nextAttempts} lần thử trước khi khóa tạm 15 phút).`
      );
    }

    if (!sessionToken) {
      sessionToken = `iam-jwt-${matched.username}-${Date.now()}`;
    }

    // Reset counter đăng nhập lỗi & cập nhật thời gian đăng nhập thành công
    const resetList = currentAccounts.map((acc) =>
      acc.username.toLowerCase() === matched.username.toLowerCase()
        ? {
            ...acc,
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date().toISOString()
          }
        : acc
    );
    setAccounts(resetList);
    saveSystemAccounts(resetList);

    const profile = hydrateAccountWithRoleVisuals({
      ...matched,
      assignedHubCode: backendAuthPayload?.assignedHubCode || matched.assignedHubCode || null,
      assignedShipperCode:
        backendAuthPayload?.assignedShipperCode || matched.assignedShipperCode || null,
      mustChangePassword: Boolean(backendAuthPayload?.mustChangePassword || matched.mustChangePassword),
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString()
    });
    setToken(sessionToken);
    setUser(profile);
    setAuthMode(
      profile.portalType === 'SHIPPER'
        ? 'HUB_IAM_SHIPPER_AUTH'
        : profile.portalType === 'CUSTOMER'
          ? 'CUSTOMER_PORTAL_AUTH'
          : 'INTERNAL_IAM_AUTH'
    );

    setHubAuthAuditLogs(
      appendHubAuthAuditLog({
        eventType: 'LOGIN_SUCCESS',
        username: profile.username,
        assignedHubCode: profile.assignedHubCode || 'GLOBAL',
        outcome: 'SUCCESS',
        detail: `Đăng nhập thành công (${profile.role}${profile.assignedHubCode ? ` • ${profile.assignedHubCode}` : ''}${profile.assignedShipperCode ? ` • ${profile.assignedShipperCode}` : ''}).`
      })
    );

    try {
      window.localStorage.setItem('ccadro_token', sessionToken);
      if (backendAuthPayload?.refreshToken) {
        window.localStorage.setItem('ccadro_refresh_token', backendAuthPayload.refreshToken);
      } else {
        window.localStorage.removeItem('ccadro_refresh_token');
      }
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
    if (!demoIdentity) return liveIdentity.register(formData);
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
    if (password.length < 3) {
      throw new Error('Mật khẩu phải có ít nhất 3 ký tự.');
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

    let backendToken = null;
    try {
      const regRes = await api.registerCustomer({
        username: cleanUsername,
        password,
        email: cleanEmail,
        firstName,
        lastName
      });
      backendToken = regRes?.result?.token || null;
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

    const sessionToken = backendToken || `customer-jwt-${cleanUsername}-${Date.now()}`;
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
    if (!demoIdentity) return liveIdentity.createAccount(payload);
    const cleanUsername = (payload.username || '').trim().toLowerCase();
    const cleanEmail = (payload.email || `${cleanUsername}@ccadro.com`).trim().toLowerCase();
    const password = payload.password || '';
    const fullName = (payload.fullName || '').trim();
    const roleKey = ENTERPRISE_ROLES[payload.role] ? payload.role : 'DISPATCHER';
    const roleTemplate = ENTERPRISE_ROLES[roleKey];

    if (cleanUsername.length < 3) {
      throw new Error('Username phải có từ 3 ký tự trở lên.');
    }
    if (password.length < 3) {
      throw new Error('Mật khẩu phải có từ 3 ký tự trở lên.');
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
    const isShipper = roleKey === 'SHIPPER' || SHIPPER_PORTAL_ROLES.includes(roleKey);
    const currentCompanies = loadSystemCompanies();
    const linkedCompany =
      (payload.companyId &&
        currentCompanies.find(
          (c) => c.id === payload.companyId || c.companyCode === payload.companyId
        )) ||
      (payload.customerId &&
        currentCompanies.find((c) => c.companyCode === payload.customerId?.toUpperCase())) ||
      null;
    const department =
      (payload.department || '').trim() || roleTemplate.department || 'Trung Tâm Điều Hành Nội Bộ';
    const customerId = linkedCompany?.companyCode
      ? linkedCompany.companyCode
      : isCustomer
        ? (payload.customerId || cleanUsername).toUpperCase()
        : isShipper
          ? `3PL_${cleanUsername.toUpperCase()}`
          : 'CCADRO_INTERNAL';
    const resolvedCompanyName =
      linkedCompany?.companyName ||
      (payload.companyName || '').trim() ||
      (isCustomer || isShipper ? department : 'CCADRO Green Logistics Corporation');

    try {
      const nameParts = fullName.split(/\s+/);
      await api.createUser({
        username: cleanUsername,
        password,
        email: cleanEmail,
        firstName: nameParts.slice(-1).join(' ') || cleanUsername,
        lastName: nameParts.slice(0, -1).join(' ') || department,
        phoneNumber: payload.phone || undefined,
        jobTitle: payload.jobTitle || undefined,
        department,
        nationalId: payload.nationalId || undefined,
        workAddress: payload.workAddress || undefined,
        companyId: linkedCompany?.id || undefined,
        customerId,
        companyName: resolvedCompanyName,
        taxCode: linkedCompany?.taxCode || payload.taxCode || undefined,
        assignedHubCode: payload.assignedHubCode || undefined,
        assignedShipperCode: payload.assignedShipperCode || undefined,
        notes: payload.notes || undefined,
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
      jobTitle: payload.jobTitle || roleTemplate.fullName,
      nationalId: payload.nationalId || '',
      workAddress: payload.workAddress || linkedCompany?.headquartersAddress || '',
      companyId: linkedCompany?.id || null,
      companyCode: linkedCompany?.companyCode || customerId,
      companyName: resolvedCompanyName,
      taxCode: linkedCompany?.taxCode || payload.taxCode || '',
      creditTier: linkedCompany?.creditTier || 'STANDARD',
      creditLimitVnd: linkedCompany?.creditLimitVnd ?? 0,
      kycStatus: linkedCompany?.kycStatus || payload.kycStatus || 'VERIFIED',
      notes: payload.notes || '',
      department,
      customerId,
      assignedHubCode: payload.assignedHubCode || null,
      assignedShipperCode: payload.assignedShipperCode || null,
      phone: payload.phone || '028 3888 9999',
      industry: linkedCompany?.industry || (isShipper
        ? 'Đối tác Giao nhận Điểm đích (3PL / WMS)'
        : isCustomer
          ? 'Đối tác Chủ hàng B2B'
          : 'Vận hành & Giám sát Nội bộ'),
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
   * Dành cho ADMIN: Cập nhật Vai trò (Role), Thông tin chi tiết User, Công ty, Quyền hoặc Trạng thái.
   */
  const adminUpdateAccount = async (usernameToUpdate, changes) => {
    if (!demoIdentity) return liveIdentity.updateAccount(usernameToUpdate, changes);
    const normalized = (usernameToUpdate || '').toLowerCase();
    const currentAccounts = loadSystemAccounts();
    const currentCompanies = loadSystemCompanies();
    const matchedCompany = changes.companyId
      ? currentCompanies.find((c) => c.id === changes.companyId || c.companyCode === changes.companyId)
      : null;
    const companyPatch = matchedCompany
      ? {
          companyId: matchedCompany.id,
          companyCode: matchedCompany.companyCode,
          companyName: matchedCompany.companyName,
          taxCode: matchedCompany.taxCode,
          customerId: matchedCompany.companyCode,
          creditTier: matchedCompany.creditTier,
          creditLimitVnd: matchedCompany.creditLimitVnd,
          kycStatus: matchedCompany.kycStatus
        }
      : {};
    const targetAcc = currentAccounts.find((a) => a.username.toLowerCase() === normalized);

    const updated = currentAccounts.map((acc) => {
      if (acc.username.toLowerCase() !== normalized) return acc;

      // Không cho phép khóa, đổi role hoặc hạ quyền tài khoản Root Admin
      if (acc.isRootAdmin || acc.username === 'admin') {
        return hydrateAccountWithRoleVisuals({
          ...acc,
          fullName: changes.fullName ?? acc.fullName,
          email: changes.email ?? acc.email,
          phone: changes.phone ?? acc.phone,
          jobTitle: changes.jobTitle ?? acc.jobTitle,
          department: changes.department ?? acc.department,
          workAddress: changes.workAddress ?? acc.workAddress,
          nationalId: changes.nationalId ?? acc.nationalId,
          notes: changes.notes ?? acc.notes,
          ...companyPatch
        });
      }

      // Tài khoản hạt nhân cố định giữ nguyên Role cứng; cho phép cập nhật thông tin hồ sơ + permissions
      const isSeed =
        acc.isSystemSeed ||
        ROOT_SYSTEM_ACCOUNTS.some((s) => s.username === acc.username?.toLowerCase());
      const requestedRole =
        !isSeed && changes.role && SYSTEM_FIXED_ROLES.includes(changes.role)
          ? changes.role
          : acc.role;
      const nextRole = requestedRole;
      const nextStatus = isSeed && changes.status === 'DELETED' ? 'ACTIVE' : changes.status || acc.status;
      const nextPermissions =
        Array.isArray(changes.permissions) && changes.permissions.length > 0
          ? changes.permissions
          : nextRole !== acc.role
            ? [...ENTERPRISE_ROLES[nextRole].permissions]
            : acc.permissions;

      return hydrateAccountWithRoleVisuals({
        ...acc,
        ...changes,
        ...companyPatch,
        role: nextRole,
        status: nextStatus,
        isSystemSeed: isSeed,
        permissions: nextPermissions
      });
    });

    setAccounts(updated);
    saveSystemAccounts(updated);

    if (targetAcc?.userId && !String(targetAcc.userId).startsWith('iam-')) {
      const fullNameStr = (changes.fullName ?? targetAcc.fullName ?? '').trim();
      const parts = fullNameStr ? fullNameStr.split(/\s+/) : [];
      Promise.resolve(
        api
          .updateUser(targetAcc.userId, {
            email: changes.email,
            firstName: parts.length ? parts.slice(-1).join(' ') : undefined,
            lastName: parts.length > 1 ? parts.slice(0, -1).join(' ') : undefined,
            phoneNumber: changes.phone,
            jobTitle: changes.jobTitle,
            department: changes.department,
            nationalId: changes.nationalId,
            workAddress: changes.workAddress,
            companyId: matchedCompany?.id || undefined,
            companyName: companyPatch.companyName ?? changes.companyName,
            customerId: companyPatch.customerId ?? changes.customerId,
            taxCode: companyPatch.taxCode ?? changes.taxCode,
            kycStatus: companyPatch.kycStatus ?? changes.kycStatus,
            notes: changes.notes,
            status: changes.status,
            assignedHubCode: changes.assignedHubCode,
            assignedShipperCode: changes.assignedShipperCode
          })
          .catch(() => {})
      );
    }

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
   * Dành cho ADMIN: Mở khóa brute-force hoặc khóa quản trị ngay lập tức
   */
  const adminUnlockAccount = async (usernameToUnlock) => {
    if (!demoIdentity) return liveIdentity.unlockAccount(usernameToUnlock);
    const normalized = (usernameToUnlock || '').toLowerCase();
    const currentAccounts = loadSystemAccounts();
    const target = currentAccounts.find((a) => a.username.toLowerCase() === normalized);
    if (!target) throw new Error(`Không tìm thấy tài khoản "@${normalized}".`);
    const updated = currentAccounts.map((a) =>
      a.username.toLowerCase() === normalized
        ? sanitizeStoredAccount({ ...a, status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null })
        : a
    );
    setAccounts(updated);
    saveSystemAccounts(updated);
    if (target.userId && !String(target.userId).startsWith('iam-')) {
      await api.unlockUser(target.userId).catch(() => {});
    }
    setHubAuthAuditLogs(
      appendHubAuthAuditLog({
        eventType: 'ADMIN_UNLOCK_ACCOUNT',
        username: target.username,
        assignedHubCode: target.assignedHubCode || 'GLOBAL',
        outcome: 'SUCCESS',
        detail: `ADMIN ${user?.username || 'admin'} đã mở khóa tài khoản @${target.username}.`
      })
    );
    return updated;
  };

  /**
   * Dành cho ADMIN: Đặt lại mật khẩu mới cho người dùng
   */
  const adminResetUserPassword = async (usernameToReset, newPassword) => {
    if (!demoIdentity) return liveIdentity.resetPassword(usernameToReset, newPassword);
    const clean = (newPassword || '').trim();
    if (clean.length < 3) {
      throw new Error('Mật khẩu mới phải có tối thiểu 3 ký tự.');
    }
    const normalized = (usernameToReset || '').toLowerCase();
    const currentAccounts = loadSystemAccounts();
    const target = currentAccounts.find((a) => a.username.toLowerCase() === normalized);
    if (!target) throw new Error(`Không tìm thấy tài khoản "@${normalized}".`);
    const nowIso = new Date().toISOString();
    const updated = currentAccounts.map((a) =>
      a.username.toLowerCase() === normalized
        ? sanitizeStoredAccount({
            ...a,
            passwordDigest: computeSaltedDigest(clean, a.username),
            passwordChangedAt: nowIso,
            failedLoginAttempts: 0,
            lockedUntil: null,
            status: 'ACTIVE'
          })
        : a
    );
    setAccounts(updated);
    saveSystemAccounts(updated);
    if (target.userId && !String(target.userId).startsWith('iam-')) {
      await api.resetUserPassword(target.userId, clean).catch(() => {});
    }
    setHubAuthAuditLogs(
      appendHubAuthAuditLog({
        eventType: 'ADMIN_RESET_PASSWORD',
        username: target.username,
        assignedHubCode: target.assignedHubCode || 'GLOBAL',
        outcome: 'SUCCESS',
        detail: `ADMIN ${user?.username || 'admin'} đã đặt lại mật khẩu cho @${target.username}.`
      })
    );
    return true;
  };

  /**
   * Dành cho ADMIN: CRUD + KYC + Soft Delete/Restore Hồ Sơ Công Ty Đối Tác (B2B / 3PL)
   */
  const adminCreateCompany = async (payload) => {
    if (!demoIdentity) return liveIdentity.createCompany(payload);
    const code = (payload.companyCode || '').trim().toUpperCase();
    const name = (payload.companyName || '').trim();
    if (!code || !name) {
      throw new Error('Mã công ty và Tên pháp lý không được để trống.');
    }
    const current = loadSystemCompanies();
    if (current.some((c) => c.companyCode.toUpperCase() === code)) {
      throw new Error(`Mã doanh nghiệp "${code}" đã tồn tại.`);
    }
    let created = null;
    try {
      const res = await api.createCompany({ ...payload, companyCode: code, companyName: name });
      created = res?.result || res;
    } catch (_) {
      // Fallback local persistence
    }
    const record = created?.id
      ? created
      : {
          id: `comp-${Date.now()}`,
          companyCode: code,
          companyName: name,
          taxCode: (payload.taxCode || '').trim(),
          businessLicenseNumber: (payload.businessLicenseNumber || '').trim(),
          industry: (payload.industry || '').trim() || 'Chuỗi cung ứng & Logistics B2B',
          companyType: payload.companyType || 'B2B_CUSTOMER',
          companyPhone: (payload.companyPhone || '').trim(),
          companyEmail: (payload.companyEmail || '').trim(),
          headquartersAddress: (payload.headquartersAddress || '').trim(),
          representativeName: (payload.representativeName || '').trim(),
          representativeTitle: (payload.representativeTitle || '').trim(),
          creditTier: payload.creditTier || 'STANDARD',
          creditLimitVnd: Number(payload.creditLimitVnd || 0),
          kycStatus: payload.kycStatus || 'VERIFIED',
          isDeleted: false,
          createdAt: new Date().toISOString().slice(0, 10)
        };
    const next = [record, ...current];
    setCompanies(next);
    saveSystemCompanies(next);
    return record;
  };

  const adminUpdateCompany = async (companyIdOrCode, changes) => {
    if (!demoIdentity) return liveIdentity.updateCompany(companyIdOrCode, changes);
    const current = loadSystemCompanies();
    let updatedCompany = null;
    const nextCompanies = current.map((c) => {
      if (c.id !== companyIdOrCode && c.companyCode !== companyIdOrCode) return c;
      updatedCompany = {
        ...c,
        ...changes,
        companyCode: (changes.companyCode || c.companyCode).trim().toUpperCase(),
        creditLimitVnd:
          changes.creditLimitVnd !== undefined ? Number(changes.creditLimitVnd || 0) : c.creditLimitVnd,
        updatedAt: new Date().toISOString()
      };
      return updatedCompany;
    });
    if (!updatedCompany) {
      throw new Error('Không tìm thấy hồ sơ doanh nghiệp để cập nhật.');
    }
    setCompanies(nextCompanies);
    saveSystemCompanies(nextCompanies);

    // Sync company metadata back to linked user accounts
    const currentAccounts = loadSystemAccounts();
    const syncedAccounts = currentAccounts.map((acc) => {
      if (acc.companyId === updatedCompany.id || acc.companyCode === updatedCompany.companyCode) {
        return hydrateAccountWithRoleVisuals({
          ...acc,
          companyId: updatedCompany.id,
          companyCode: updatedCompany.companyCode,
          companyName: updatedCompany.companyName,
          taxCode: updatedCompany.taxCode,
          creditTier: updatedCompany.creditTier,
          creditLimitVnd: updatedCompany.creditLimitVnd,
          kycStatus: updatedCompany.kycStatus
        });
      }
      return acc;
    });
    setAccounts(syncedAccounts);
    saveSystemAccounts(syncedAccounts);

    if (updatedCompany.id && !String(updatedCompany.id).startsWith('comp-')) {
      await api.updateCompany(updatedCompany.id, updatedCompany).catch(() => {});
    }
    return updatedCompany;
  };

  const adminDeleteCompany = async (companyIdOrCode) => {
    if (!demoIdentity) return liveIdentity.deleteCompany(companyIdOrCode);
    const current = loadSystemCompanies();
    const target = current.find((c) => c.id === companyIdOrCode || c.companyCode === companyIdOrCode);
    if (!target) throw new Error('Không tìm thấy hồ sơ doanh nghiệp.');
    if (target.companyCode === 'CCADRO_INT') {
      throw new Error('Không thể xóa mềm doanh nghiệp chủ quản CCADRO.');
    }
    const next = current.map((c) =>
      c.id === target.id
        ? { ...c, isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: user?.username || 'admin' }
        : c
    );
    setCompanies(next);
    saveSystemCompanies(next);
    if (target.id && !String(target.id).startsWith('comp-')) {
      await api.softDeleteCompany(target.id).catch(() => {});
    }
    return next;
  };

  const adminRestoreCompany = async (companyIdOrCode) => {
    if (!demoIdentity) return liveIdentity.restoreCompany(companyIdOrCode);
    const current = loadSystemCompanies();
    const target = current.find((c) => c.id === companyIdOrCode || c.companyCode === companyIdOrCode);
    if (!target) throw new Error('Không tìm thấy hồ sơ doanh nghiệp.');
    const next = current.map((c) =>
      c.id === target.id ? { ...c, isDeleted: false, deletedAt: null, deletedBy: null } : c
    );
    setCompanies(next);
    saveSystemCompanies(next);
    if (target.id && !String(target.id).startsWith('comp-')) {
      await api.restoreCompany(target.id).catch(() => {});
    }
    return next;
  };

  /**
   * Dành cho ADMIN: Xóa mềm tài khoản khỏi danh sách (chuyển vào Thùng rác, ngoại trừ tài khoản Root Admin).
   */
  const adminDeleteAccount = async (usernameToDelete) => {
    if (!demoIdentity) return liveIdentity.deleteAccount(usernameToDelete);
    const normalized = (usernameToDelete || '').toLowerCase();
    const currentAccounts = loadSystemAccounts();
    const target = currentAccounts.find((a) => a.username.toLowerCase() === normalized);
    if (!target) {
      throw new Error(`Không tìm thấy tài khoản "@${normalized}".`);
    }
    if (normalized === 'admin' || target.isRootAdmin) {
      throw new Error(
        `Không thể xóa tài khoản quản trị hạt nhân cố định "@${normalized}" của hệ thống.`
      );
    }
    const deletedAt = new Date().toISOString();
    const actor = user?.username || 'admin';
    const updated = currentAccounts.map((a) =>
      a.username.toLowerCase() === normalized
        ? sanitizeStoredAccount({
            ...a,
            isDeleted: true,
            deletedAt,
            deletedBy: actor,
            status: 'DELETED'
          })
        : a
    );
    setAccounts(updated);
    saveSystemAccounts(updated);

    if (target.userId || target.username) {
      Promise.resolve(
        SHIPPER_PORTAL_ROLES.includes(target.role)
          ? api.softDeleteHubIamAccount(target.username).catch(() => {})
          : target.userId
            ? api.softDeleteUser(target.userId).catch(() => {})
            : Promise.resolve()
      );
    }
    return updated;
  };

  /**
   * Dành cho ADMIN: Khôi phục tài khoản đã xóa mềm từ Thùng rác.
   */
  const adminRestoreAccount = async (usernameToRestore) => {
    if (!demoIdentity) return liveIdentity.restoreAccount(usernameToRestore);
    const normalized = (usernameToRestore || '').toLowerCase();
    const currentAccounts = loadSystemAccounts();
    const target = currentAccounts.find((a) => a.username.toLowerCase() === normalized);
    if (!target) {
      throw new Error(`Không tìm thấy tài khoản "@${normalized}".`);
    }
    const updated = currentAccounts.map((a) =>
      a.username.toLowerCase() === normalized
        ? sanitizeStoredAccount({
            ...a,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            status: a.status === 'DELETED' ? 'ACTIVE' : a.status || 'ACTIVE'
          })
        : a
    );
    setAccounts(updated);
    saveSystemAccounts(updated);

    if (target.userId || target.username) {
      Promise.resolve(
        SHIPPER_PORTAL_ROLES.includes(target.role)
          ? api.restoreHubIamAccount(target.username).catch(() => {})
          : target.userId
            ? api.restoreUser(target.userId).catch(() => {})
            : Promise.resolve()
      );
    }
    return updated;
  };

  /**
   * Dành cho HUB_MANAGER / ADMIN: Cấp phát tài khoản mới trong khu vực bảo mật `hub_iam`
   * - HUB_MANAGER chỉ được cấp trong cùng Trụ sở (assignedHubCode), chỉ được cấp role HUB_SHIPPER / HUB_AUDITOR.
   * - Bắt buộc mật khẩu >= 8 ký tự có cả chữ cái và chữ số; không bao giờ lưu plaintext.
   */
  const provisionHubAccount = async (payload) => {
    const actorRole = user?.role;
    if (actorRole !== 'ADMIN' && actorRole !== 'HUB_MANAGER') {
      throw new Error('Không có quyền cấp phát tài khoản Trụ sở (yêu cầu ADMIN hoặc HUB_MANAGER).');
    }

    const cleanUsername = (payload.username || '').trim().toLowerCase();
    const password = payload.password || '';
    const fullName = (payload.fullName || '').trim();
    const roleKey = payload.role || 'HUB_SHIPPER';
    const targetHub =
      actorRole === 'HUB_MANAGER'
        ? user.assignedHubCode
        : (payload.assignedHubCode || user?.assignedHubCode || '').trim().toUpperCase();
    const targetShipperCode = (payload.assignedShipperCode || '').trim().toUpperCase();

    if (cleanUsername.length < 4) {
      throw new Error('Tên đăng nhập tài khoản Trụ sở phải có ít nhất 4 ký tự.');
    }
    if (password.length < 3) {
      throw new Error('Mật khẩu phải có từ 3 ký tự trở lên.');
    }
    if (!targetHub) {
      throw new Error('Bắt buộc gán Mã Trụ sở (assignedHubCode) cho tài khoản mới.');
    }
    if (actorRole === 'HUB_MANAGER' && !['HUB_SHIPPER', 'HUB_AUDITOR'].includes(roleKey)) {
      throw new Error('Trưởng Trụ sở chỉ được cấp vai trò HUB_SHIPPER hoặc HUB_AUDITOR trong cùng Trụ sở.');
    }
    if (roleKey === 'HUB_SHIPPER' && !targetShipperCode) {
      throw new Error('Tài khoản HUB_SHIPPER bắt buộc phải gắn Mã Shipper cô lập (vd: SHP-BN-004).');
    }

    const currentAccounts = loadSystemAccounts();
    if (currentAccounts.some((a) => a.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Tài khoản "${cleanUsername}" đã tồn tại trong sổ cái IAM.`);
    }

    try {
      await api.createHubIamAccount({
        username: cleanUsername,
        password,
        email: (payload.email || `${cleanUsername}@ccadro.com`).trim().toLowerCase(),
        fullName: fullName || cleanUsername,
        phone: payload.phone || '0912 000 000',
        functionalRole: roleKey,
        primaryRole: roleKey,
        assignedHubCode: targetHub,
        assignedShipperCode: roleKey === 'HUB_SHIPPER' ? targetShipperCode : null
      });
    } catch (_) {
      // Backend offline fallback: lưu vào sổ cái IAM cục bộ với passwordDigest
    }

    const tpl = ENTERPRISE_ROLES[roleKey] || ENTERPRISE_ROLES.HUB_SHIPPER;
    const newHubAcc = hydrateAccountWithRoleVisuals({
      userId: `hub-iam-${Date.now()}`,
      username: cleanUsername,
      passwordDigest: computeSaltedDigest(password, cleanUsername),
      email: (payload.email || `${cleanUsername}@ccadro.com`).trim().toLowerCase(),
      fullName: fullName || cleanUsername,
      companyName: `Trụ sở ${targetHub}`,
      department: tpl.department,
      customerId: targetHub.replace(/-/g, '_'),
      assignedHubCode: targetHub,
      assignedShipperCode: roleKey === 'HUB_SHIPPER' ? targetShipperCode : null,
      phone: payload.phone || '0912 000 000',
      industry: 'Vận Hành Giao Nhận Trụ Sở (Hub-and-Spoke)',
      role: roleKey,
      portalType: 'SHIPPER',
      permissions: [...tpl.permissions],
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdBy: user?.username || 'hub_manager',
      createdAt: new Date().toISOString().slice(0, 10)
    });

    const updated = [...currentAccounts, newHubAcc];
    setAccounts(updated);
    saveSystemAccounts(updated);
    setHubAuthAuditLogs(
      appendHubAuthAuditLog({
        eventType: 'HUB_ACCOUNT_PROVISIONED',
        username: cleanUsername,
        assignedHubCode: targetHub,
        outcome: 'SUCCESS',
        detail: `${user?.username || 'admin'} cấp phát tài khoản ${roleKey} (${targetHub}${targetShipperCode ? ` • ${targetShipperCode}` : ''}).`
      })
    );
    return newHubAcc;
  };

  /**
   * Khóa / Mở khóa tài khoản Shipper hoặc Kiểm tra viên (theo phạm vi Trụ sở)
   */
  const toggleHubAccountStatus = async (targetUsername, nextStatus) => {
    const actorRole = user?.role;
    if (actorRole !== 'ADMIN' && actorRole !== 'HUB_MANAGER') {
      throw new Error('Không có quyền thay đổi trạng thái tài khoản.');
    }
    const normalized = (targetUsername || '').toLowerCase();
    const currentAccounts = loadSystemAccounts();
    const targetAcc = currentAccounts.find((a) => a.username.toLowerCase() === normalized);
    if (!targetAcc) {
      throw new Error(`Không tìm thấy tài khoản "${targetUsername}".`);
    }
    if (targetAcc.role === 'ADMIN' || targetAcc.username === 'admin') {
      throw new Error('Không thể khóa tài khoản Root Admin.');
    }
    if (actorRole === 'HUB_MANAGER' && targetAcc.assignedHubCode !== user.assignedHubCode) {
      throw new Error('Vi phạm cô lập Trụ sở: Không thể khóa/mở tài khoản thuộc Trụ sở khác.');
    }

    try {
      await api.updateHubIamAccountStatus(normalized, nextStatus);
    } catch (_) {
      // fallback cục bộ
    }

    const updated = currentAccounts.map((acc) =>
      acc.username.toLowerCase() === normalized
        ? {
            ...acc,
            status: nextStatus,
            failedLoginAttempts: nextStatus === 'ACTIVE' ? 0 : acc.failedLoginAttempts,
            lockedUntil: nextStatus === 'ACTIVE' ? null : acc.lockedUntil
          }
        : acc
    );
    setAccounts(updated);
    saveSystemAccounts(updated);
    setHubAuthAuditLogs(
      appendHubAuthAuditLog({
        eventType: nextStatus === 'LOCKED' ? 'HUB_ACCOUNT_LOCKED' : 'HUB_ACCOUNT_UNLOCKED',
        username: normalized,
        assignedHubCode: targetAcc.assignedHubCode || 'GLOBAL',
        outcome: 'SUCCESS',
        detail: `${user?.username || 'admin'} chuyển trạng thái tài khoản sang ${nextStatus}.`
      })
    );
    return updated;
  };

  /**
   * Đổi mật khẩu tài khoản hiện tại ngay trong Cài đặt cá nhân
   */
  const changeOwnPassword = async (currentPassword, newPassword) => {
    if (!demoIdentity) {
      await api.changePassword(currentPassword, newPassword);
      await logout();
      return { success: true };
    }
    if (!user?.username) {
      throw new Error('Bạn chưa đăng nhập hệ thống.');
    }
    if (!currentPassword) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại.');
    }
    if (!newPassword || newPassword.length < 3) {
      throw new Error('Mật khẩu mới phải từ 3 ký tự trở lên.');
    }
    if (currentPassword === newPassword) {
      throw new Error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    }

    const currentAccounts = loadSystemAccounts();
    const matched = currentAccounts.find(
      (a) => a.username.toLowerCase() === user.username.toLowerCase()
    );
    if (!matched) {
      throw new Error('Không tìm thấy hồ sơ tài khoản trong sổ cái IAM.');
    }

    const expectedDigest =
      matched.passwordDigest || computeSaltedDigest('123', matched.username);
    if (computeSaltedDigest(currentPassword, matched.username) !== expectedDigest) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }

    if (token && !token.startsWith('iam-jwt-') && !token.startsWith('customer-jwt-')) {
      try {
        await api.changePassword(currentPassword, newPassword);
      } catch (_) {
        // Fallback đồng bộ cục bộ nếu backend đang tắt
      }
    }

    const nextDigest = computeSaltedDigest(newPassword, matched.username);
    const updatedAt = new Date().toISOString();
    const updated = currentAccounts.map((acc) =>
      acc.username.toLowerCase() === matched.username.toLowerCase()
        ? sanitizeStoredAccount({
            ...acc,
            passwordDigest: nextDigest,
            passwordChangedAt: updatedAt
          })
        : acc
    );
    setAccounts(updated);
    saveSystemAccounts(updated);

    const nextProfile = hydrateAccountWithRoleVisuals({
      ...user,
      passwordDigest: nextDigest,
      passwordChangedAt: updatedAt
    });
    setUser(nextProfile);
    try {
      window.localStorage.setItem('ccadro_user', JSON.stringify(nextProfile));
    } catch (_) {
      // ignore
    }

    setHubAuthAuditLogs(
      appendHubAuthAuditLog({
        eventType: 'PASSWORD_CHANGED',
        username: matched.username,
        assignedHubCode: matched.assignedHubCode || 'GLOBAL',
        outcome: 'SUCCESS',
        detail: 'Người dùng tự cập nhật mật khẩu bảo mật trong Cài đặt Tài khoản.'
      })
    );

    return { success: true, passwordChangedAt: updatedAt };
  };

  const updateOwnProfile = async ({ fullName, email, phone } = {}) => {
    if (!demoIdentity) {
      const parts = String(fullName || user?.fullName || '').trim().split(/\s+/);
      const saved = await liveIdentity.updateOwnProfile({ firstName: parts.at(-1), lastName: parts.slice(0,-1).join(' '), email, phoneNumber: phone });
      return { success: true, user: saved };
    }
    if (!user?.username) {
      throw new Error('Bạn chưa đăng nhập hệ thống.');
    }
    const trimmedName = String(fullName ?? user.fullName ?? '').trim();
    const trimmedEmail = String(email ?? user.email ?? '').trim();
    const trimmedPhone = String(phone ?? user.phone ?? '').trim();
    if (!trimmedName) {
      throw new Error('Họ và tên hiển thị không được để trống.');
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('Định dạng email không hợp lệ.');
    }

    const updatedAt = new Date().toISOString();
    const currentAccounts = loadSystemAccounts();
    const updatedAccounts = currentAccounts.map((acc) =>
      acc.username.toLowerCase() === user.username.toLowerCase()
        ? sanitizeStoredAccount({
            ...acc,
            fullName: trimmedName,
            email: trimmedEmail || acc.email,
            phone: trimmedPhone || acc.phone,
            profileUpdatedAt: updatedAt
          })
        : acc
    );
    setAccounts(updatedAccounts);
    saveSystemAccounts(updatedAccounts);

    const nextProfile = hydrateAccountWithRoleVisuals({
      ...user,
      fullName: trimmedName,
      email: trimmedEmail || user.email,
      phone: trimmedPhone || user.phone,
      profileUpdatedAt: updatedAt
    });
    setUser(nextProfile);
    try {
      window.localStorage.setItem('ccadro_user', JSON.stringify(nextProfile));
    } catch (_) {
      // ignore storage errors
    }

    setHubAuthAuditLogs(
      appendHubAuthAuditLog({
        eventType: 'PROFILE_UPDATED',
        username: user.username,
        assignedHubCode: user.assignedHubCode || 'GLOBAL',
        outcome: 'SUCCESS',
        detail: `Cập nhật hồ sơ cá nhân (${trimmedName}) trong Cài đặt Tài khoản.`
      })
    );

    return { success: true, user: nextProfile };
  };

  const logout = async ({ allDevices = false } = {}) => {
    let storedRefreshToken = null;
    try {
      storedRefreshToken = window.localStorage.getItem('ccadro_refresh_token');
    } catch (_) {
      // ignore
    }
    if (token && !token.startsWith('iam-jwt-') && !token.startsWith('customer-jwt-')) {
      try {
        if (allDevices && typeof api.logoutAll === 'function') {
          await api.logoutAll();
        } else {
          await api.logout(token, storedRefreshToken);
        }
      } catch (_) {
        // ignore
      }
    }
    if (user?.username) {
      setHubAuthAuditLogs(
        appendHubAuthAuditLog({
          eventType: allDevices ? 'LOGOUT_ALL_DEVICES' : 'LOGOUT',
          username: user.username,
          assignedHubCode: user.assignedHubCode || 'GLOBAL',
          outcome: 'SUCCESS',
          detail: allDevices
            ? 'Đăng xuất & thu hồi toàn bộ phiên trên mọi thiết bị.'
            : 'Đăng xuất phiên làm việc.'
        })
      );
    }
    setToken(null);
    setUser(null);
    setAuthMode('IAM_MANAGED');
    try {
      window.localStorage.removeItem('ccadro_token');
      window.localStorage.removeItem('ccadro_refresh_token');
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

  // Tách danh sách Khách hàng B2B (CUSTOMER) và Đối tác / Nhân sự Trụ sở & Shipper
  const registeredUsers = accounts.filter(
    (a) => a.portalType === 'CUSTOMER' || a.role === 'CUSTOMER'
  );

  const shipperPartners = accounts.filter(
    (a) => a.portalType === 'SHIPPER' || SHIPPER_PORTAL_ROLES.includes(a.role)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authMode,
        accounts: demoIdentity ? accounts : liveIdentity.accounts,
        companies: demoIdentity ? companies : liveIdentity.companies,
        identityRoles: demoIdentity ? [] : liveIdentity.roles,
        identityPermissions: demoIdentity ? ALL_SYSTEM_PERMISSIONS : liveIdentity.permissions,
        identityLoading: liveIdentity.loading,
        identityError: liveIdentity.error,
        refreshIdentity: liveIdentity.refresh,
        demoIdentity,
        registeredUsers,
        shipperPartners,
        hubAuthAuditLogs,
        login,
        registerUser,
        adminCreateAccount,
        adminUpdateAccount,
        adminUnlockAccount,
        adminResetUserPassword,
        adminDeleteAccount,
        adminRestoreAccount,
        adminCreateCompany,
        adminUpdateCompany,
        adminDeleteCompany,
        adminRestoreCompany,
        provisionHubAccount,
        toggleHubAccountStatus,
        changeOwnPassword,
        updateOwnProfile,
        logout,
        hasPermission,
        hasRole,
        getDefaultPortalPath,
        getAccessibleWorkspaces,
        SYSTEM_FIXED_ROLES,
        ROOT_SYSTEM_ACCOUNTS,
        HUB_ACCOUNT_DIRECTORY,
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
