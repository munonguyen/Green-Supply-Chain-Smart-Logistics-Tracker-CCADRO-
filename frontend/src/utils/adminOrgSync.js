import { readJsonStore, writeJsonStore } from './storage';

export const STAFF_ROLE_COLORS = {
  ADMIN: '#a855f7',
  DISPATCHER: '#38bdf8',
  SAFETY_MANAGER: '#f59e0b',
  ESG_AUDITOR: '#10b981',
  DRIVER: '#22c55e',
  HUB_MANAGER: '#6366f1',
  HUB_SHIPPER: '#ec4899',
  HUB_AUDITOR: '#14b8a6'
};

export const BRANCHES_STORAGE_KEY = 'ccadro_branches_v1';
export const STAFF_STORAGE_KEY = 'ccadro_staff_v2';

export const DRIVER_ROLE_CODES = ['DRIVER', 'HUB_SHIPPER'];
export const CONTROLLER_ROLE_CODES = ['SAFETY_MANAGER', 'ESG_AUDITOR', 'HUB_AUDITOR'];

export const VERIFICATION_STATUS_META = {
  APPROVED: {
    code: 'APPROVED',
    label: 'Đã kiểm duyệt đạt chuẩn',
    shortLabel: 'Đã kiểm duyệt',
    badgeClass: 'badge-green',
    color: '#10b981'
  },
  PENDING_REVIEW: {
    code: 'PENDING_REVIEW',
    label: 'Chờ kiểm duyệt nghiệp vụ',
    shortLabel: 'Chờ duyệt',
    badgeClass: 'badge-amber',
    color: '#f59e0b'
  },
  REVISION_REQUIRED: {
    code: 'REVISION_REQUIRED',
    label: 'Yêu cầu bổ sung hồ sơ',
    shortLabel: 'Cần bổ sung',
    badgeClass: 'badge-amber',
    color: '#f97316'
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'Không đạt nghiệp vụ',
    shortLabel: 'Từ chối',
    badgeClass: 'badge-red',
    color: '#ef4444'
  },
  EXPIRED: {
    code: 'EXPIRED',
    label: 'Hết hạn chứng từ/GPLX',
    shortLabel: 'Hết hạn',
    badgeClass: 'badge-red',
    color: '#ef4444'
  }
};

export function resolveStaffCategory(roleCode) {
  const role = String(roleCode || '').toUpperCase();
  if (DRIVER_ROLE_CODES.includes(role)) return 'DRIVER_FLEET';
  if (CONTROLLER_ROLE_CODES.includes(role)) return 'CONTROL_AUDIT';
  if (role === 'ADMIN') return 'MANAGEMENT';
  return 'OPS_DISPATCH';
}

export function validateComplianceForApproval(staff) {
  const missing = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!staff?.backgroundCheckPassed) {
    missing.push('Xác minh lý lịch / CCCD');
  }
  const role = String(staff?.roleCode || '').toUpperCase();
  if (DRIVER_ROLE_CODES.includes(role)) {
    if (!String(staff?.licenseNumber || '').trim()) missing.push('Số Giấy phép lái xe (GPLX)');
    if (!String(staff?.licenseClass || '').trim()) missing.push('Hạng GPLX');
    if (!staff?.licenseExpiryDate || String(staff.licenseExpiryDate) < todayStr) {
      missing.push('Hạn GPLX còn hiệu lực');
    }
    if (role === 'DRIVER') {
      if (!staff.dateOfBirth) missing.push('Ngày sinh');
      if (!staff.licenseIssueDate || staff.licenseIssueDate > todayStr) missing.push('Ngày cấp GPLX hợp lệ');
      if (!['CE', 'FC'].includes(staff.licenseClass)) missing.push('Hạng CE hoặc FC chuyển tiếp');
      if (staff.licenseClass === 'FC' && staff.licenseIssueDate >= '2025-01-01') missing.push('FC phải được cấp trước 01/01/2025');
      if (staff.licenseIssueDate && staff.licenseExpiryDate && staff.licenseIssueDate >= staff.licenseExpiryDate) missing.push('Ngày hết hạn phải sau ngày cấp');
      if (staff.licenseClass === 'CE' && staff.dateOfBirth && staff.licenseIssueDate) {
        const birth = new Date(staff.dateOfBirth + 'T00:00:00');
        birth.setFullYear(birth.getFullYear() + 24);
        if (birth > new Date(staff.licenseIssueDate + 'T00:00:00')) missing.push('Đủ 24 tuổi tại ngày cấp hạng CE');
      }
    }
    if (!staff?.healthCheckPassed) missing.push('Giấy khám sức khỏe đạt chuẩn');
    if (!staff?.safetyTrainingCertified) missing.push('Chứng chỉ tập huấn an toàn EV/PCCC');
  } else if (CONTROLLER_ROLE_CODES.includes(role)) {
    if (!String(staff?.certificationCode || '').trim()) {
      missing.push('Mã chứng chỉ kiểm định / kiểm toán');
    }
    if (!String(staff?.inspectionScope || '').trim()) {
      missing.push('Phạm vi kiểm soát nghiệp vụ');
    }
    if (!staff?.certificateExpiryDate || String(staff.certificateExpiryDate) < todayStr) {
      missing.push('Hiệu lực chứng chỉ hành nghề');
    }
    if (!staff?.canSignOffCompliance) {
      missing.push('Cấp quyền ký duyệt chứng từ nghiệp vụ');
    }
  }
  return missing;
}

export const STAFF_ROLE_ORDER = [
  'ADMIN',
  'DISPATCHER',
  'SAFETY_MANAGER',
  'ESG_AUDITOR',
  'DRIVER',
  'HUB_MANAGER',
  'HUB_SHIPPER',
  'HUB_AUDITOR'
];

export const STAFF_ROLE_LABELS = {
  ADMIN: 'Quản Trị Hệ Thống (ADMIN)',
  DISPATCHER: 'Điều Phối Viên NOC (DISPATCHER)',
  SAFETY_MANAGER: 'Quản Lý An Toàn (SAFETY_MANAGER)',
  ESG_AUDITOR: 'Kiểm Định ESG Carbon (ESG_AUDITOR)',
  DRIVER: 'Tài Xế Đường Dài (DRIVER)',
  HUB_MANAGER: 'Trưởng Trạm Hub (HUB_MANAGER)',
  HUB_SHIPPER: 'Shipper Last-Mile (HUB_SHIPPER)',
  HUB_AUDITOR: 'Kiểm Toán Hub (HUB_AUDITOR)'
};

export const STAFF_ROLE_SHORT = {
  ADMIN: 'ADMIN',
  DISPATCHER: 'Điều phối NOC',
  SAFETY_MANAGER: 'An toàn & HSE',
  ESG_AUDITOR: 'Kiểm định ESG',
  DRIVER: 'Tài xế Cont/EV',
  HUB_MANAGER: 'Trưởng trạm Hub',
  HUB_SHIPPER: 'Shipper Giao hàng',
  HUB_AUDITOR: 'Kiểm toán Hub'
};

export const INITIAL_BRANCH_SEED = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    branchCode: 'BR-HCM-HQ',
    branchName: 'Trụ Sở Chính & Cảng Cát Lái (HCM HQ)',
    region: 'MIEN_NAM',
    branchType: 'HEADQUARTERS',
    city: 'TP. Hồ Chí Minh',
    address: 'Đường Nguyễn Thị Định, Cảng Cát Lái, TP. Thủ Đức, TP.HCM',
    phone: '028-3897-8888',
    email: 'hq.catlai@ccadro.vn',
    managerUsername: 'admin',
    managerName: 'Nguyễn Minh Quân',
    vehicleCapacity: 85,
    monthlyRevenueTargetVnd: 1850000000,
    status: 'ACTIVE',
    activeStaffCount: 2,
    isDeleted: false
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    branchCode: 'BR-BN-DB',
    branchName: 'Chi Nhánh Hub Đình Bảng — Bắc Ninh',
    region: 'MIEN_BAC',
    branchType: 'HUB_GATEWAY',
    city: 'Bắc Ninh',
    address: 'KCN VSIP Bắc Ninh, Phường Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    phone: '0222-3740-668',
    email: 'bacninh.hub@ccadro.vn',
    managerUsername: 'hubmanager',
    managerName: 'Đặng Quốc Bảo',
    vehicleCapacity: 50,
    monthlyRevenueTargetVnd: 1200000000,
    status: 'ACTIVE',
    activeStaffCount: 2,
    isDeleted: false
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    branchCode: 'BR-BD-VSIP',
    branchName: 'Chi Nhánh Depot KCN VSIP II — Bình Dương',
    region: 'MIEN_NAM',
    branchType: 'DEPOT_EV',
    city: 'Bình Dương',
    address: 'Đại lộ Hữu Nghị, KCN VSIP II, TP. Thủ Dầu Một, Bình Dương',
    phone: '0274-3812-909',
    email: 'vsip.bd@ccadro.vn',
    managerUsername: 'dispatcher',
    managerName: 'Phạm Thảo Vy',
    vehicleCapacity: 65,
    monthlyRevenueTargetVnd: 1450000000,
    status: 'ACTIVE',
    activeStaffCount: 2,
    isDeleted: false
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    branchCode: 'BR-DN-AMATA',
    branchName: 'Chi Nhánh Trạm Trung Chuyển Amata — Đồng Nai',
    region: 'MIEN_NAM',
    branchType: 'REGIONAL_HUB',
    city: 'Đồng Nai',
    address: 'Lô A5, KCN Amata, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
    phone: '0251-3992-456',
    email: 'amata.dn@ccadro.vn',
    managerUsername: 'safety',
    managerName: 'Vũ Gia Huy',
    vehicleCapacity: 45,
    monthlyRevenueTargetVnd: 980000000,
    status: 'ACTIVE',
    activeStaffCount: 1,
    isDeleted: false
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    branchCode: 'BR-HN-LB',
    branchName: 'Chi Nhánh Cảng Cạn ICD Long Biên — Hà Nội',
    region: 'MIEN_BAC',
    branchType: 'REGIONAL_HUB',
    city: 'Hà Nội',
    address: 'KCN Sài Đồng B, Quận Long Biên, TP. Hà Nội',
    phone: '024-3875-3321',
    email: 'longbien.hn@ccadro.vn',
    managerUsername: 'esg',
    managerName: 'Trần Khánh Linh',
    vehicleCapacity: 40,
    monthlyRevenueTargetVnd: 920000000,
    status: 'ACTIVE',
    activeStaffCount: 1,
    isDeleted: false
  }
];

export const INITIAL_STAFF_SEED = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    employeeCode: 'NV-ADM-001',
    fullName: 'Nguyễn Minh Quân',
    username: 'admin',
    email: 'admin@ccadro.vn',
    phone: '0909-100-001',
    nationalId: '079085000001',
    roleCode: 'ADMIN',
    staffCategory: 'MANAGEMENT',
    department: 'Ban Điều Hành & CNTT',
    jobTitle: 'Giám Đốc Hệ Thống (Root Admin)',
    branchId: '20000000-0000-0000-0000-000000000001',
    branchCode: 'BR-HCM-HQ',
    branchName: 'Trụ Sở Chính & Cảng Cát Lái (HCM HQ)',
    contractType: 'FULL_TIME',
    shiftName: 'CA_HANH_CHINH',
    baseSalaryVnd: 45000000,
    hireDate: '2023-03-01',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'SYSTEM_BOOTSTRAP',
    verifiedAt: '2026-11-01T08:00:00Z',
    verificationNotes: 'Root Administrator ủy quyền toàn hệ thống.',
    backgroundCheckPassed: true,
    safetyTrainingCertified: true,
    canSignOffCompliance: true,
    notes: 'Quản trị toàn hệ thống IAM, chi nhánh và ngân sách.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    employeeCode: 'NV-DSP-002',
    fullName: 'Phạm Thảo Vy',
    username: 'dispatcher',
    email: 'dispatcher@ccadro.vn',
    phone: '0909-100-002',
    nationalId: '074192002211',
    roleCode: 'DISPATCHER',
    staffCategory: 'OPS_DISPATCH',
    department: 'Trung Tâm Điều Hành NOC',
    jobTitle: 'Trưởng Ca Điều Phối Tuyến Pareto',
    branchId: '20000000-0000-0000-0000-000000000003',
    branchCode: 'BR-BD-VSIP',
    branchName: 'Chi Nhánh Depot KCN VSIP II — Bình Dương',
    contractType: 'FULL_TIME',
    shiftName: 'CA_DEM_NOC',
    baseSalaryVnd: 26000000,
    hireDate: '2023-07-15',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'admin',
    verifiedAt: '2026-11-02T09:15:00Z',
    verificationNotes: 'Đạt chuẩn chứng chỉ điều độ Pareto NOC 24/7.',
    backgroundCheckPassed: true,
    safetyTrainingCertified: true,
    notes: 'Điều phối trực tiếp cụm xe tải EV Bình Dương - Amata - Cát Lái.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    employeeCode: 'NV-SAF-003',
    fullName: 'Vũ Gia Huy',
    username: 'safety',
    email: 'safety@ccadro.vn',
    phone: '0909-100-003',
    nationalId: '075087003399',
    roleCode: 'SAFETY_MANAGER',
    staffCategory: 'CONTROL_AUDIT',
    department: 'An Toàn Vận Hành & HSE',
    jobTitle: 'Trưởng Phòng An Toàn & Kiểm Định Pre-Trip',
    branchId: '20000000-0000-0000-0000-000000000004',
    branchCode: 'BR-DN-AMATA',
    branchName: 'Chi Nhánh Trạm Trung Chuyển Amata — Đồng Nai',
    contractType: 'FULL_TIME',
    shiftName: 'CA_HANH_CHINH',
    baseSalaryVnd: 32000000,
    hireDate: '2023-05-10',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'admin',
    verifiedAt: '2026-11-03T10:00:00Z',
    verificationNotes: 'Đã kiểm duyệt chứng chỉ thanh tra kỹ thuật & thẩm quyền ký duyệt an toàn / sự cố.',
    backgroundCheckPassed: true,
    safetyTrainingCertified: true,
    certificationCode: 'HSE-AN-TOAN-2026-003',
    certificateExpiryDate: '2028-12-31',
    issuingAuthority: 'Cục Đăng Kiểm & An Toàn Lao Động',
    inspectionScope: 'AN_TOAN_KY_THUAT, DIEM_TRU_AN_TOAN, XU_LY_SU_CO',
    canSignOffCompliance: true,
    notes: 'Phê duyệt biên bản Pre-trip & xử lý cảnh báo khẩn cấp.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    employeeCode: 'NV-ESG-004',
    fullName: 'Trần Khánh Linh',
    username: 'auditor',
    email: 'esg@ccadro.vn',
    phone: '0909-100-004',
    nationalId: '001190008811',
    roleCode: 'ESG_AUDITOR',
    staffCategory: 'CONTROL_AUDIT',
    department: 'Phát Triển Bền Vững ESG',
    jobTitle: 'Chuyên Viên Kiểm Toán Carbon Scope 3',
    branchId: '20000000-0000-0000-0000-000000000005',
    branchCode: 'BR-HN-LB',
    branchName: 'Chi Nhánh Cảng Cạn ICD Long Biên — Hà Nội',
    contractType: 'FULL_TIME',
    shiftName: 'CA_HANH_CHINH',
    baseSalaryVnd: 28500000,
    hireDate: '2024-01-08',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'admin',
    verifiedAt: '2026-11-04T11:20:00Z',
    verificationNotes: 'Kiểm toán viên độc lập Scope 3 đạt chứng nhận ISO 14083.',
    backgroundCheckPassed: true,
    safetyTrainingCertified: true,
    certificationCode: 'GLEC-ISO14083-VN-042',
    certificateExpiryDate: '2028-09-30',
    issuingAuthority: 'Smart Freight Centre / GLEC v3 Accredited',
    inspectionScope: 'KIEM_TOAN_CARBON_GLEC, DOI_SANH_HANH_LANG, SHA256_REPORT',
    canSignOffCompliance: true,
    notes: 'Phát hành chứng chỉ Carbon Credit và báo cáo ISO 14083.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    employeeCode: 'NV-DRV-005',
    fullName: 'Nguyễn Văn Hùng',
    username: 'driver',
    email: 'driver1@ccadro.vn',
    phone: '0909-100-005',
    nationalId: '079092001234',
    roleCode: 'DRIVER',
    staffCategory: 'DRIVER_FLEET',
    department: 'Đội Xe Đầu Kéo Đường Dài',
    jobTitle: 'Tài Xế Hạng FC — Tuyến Cát Lái / Amata',
    branchId: '20000000-0000-0000-0000-000000000001',
    branchCode: 'BR-HCM-HQ',
    branchName: 'Trụ Sở Chính & Cảng Cát Lái (HCM HQ)',
    contractType: 'FULL_TIME',
    shiftName: 'CA_TUYEN_BAC_NAM',
    baseSalaryVnd: 22000000,
    hireDate: '2023-09-20',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'safety',
    verifiedAt: '2026-11-05T14:30:00Z',
    verificationNotes: 'Đạt chuẩn bằng FC, khám sức khỏe định kỳ & chứng chỉ lái xe điện an toàn.',
    backgroundCheckPassed: true,
    licenseNumber: '790145889201',
    dateOfBirth: '1980-01-01',
    licenseIssueDate: '2020-01-01',
    licenseClass: 'FC',
    licenseExpiryDate: '2029-12-31',
    healthCheckPassed: true,
    healthCheckDate: '2026-08-15',
    safetyTrainingCertified: true,
    assignedVehiclePlate: '51C-888.99',
    demeritPoints: 0,
    notes: 'Phụ trách đầu kéo 51C-888.99.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000006',
    employeeCode: 'NV-DRV-006',
    fullName: 'Lê Minh Khôi',
    username: 'driver2',
    email: 'driver2@ccadro.vn',
    phone: '0909-100-006',
    nationalId: '074094007812',
    roleCode: 'DRIVER',
    staffCategory: 'DRIVER_FLEET',
    department: 'Đội Xe Đầu Kéo Điện EV',
    jobTitle: 'Tài Xế Xe Tải Điện EV 51D-686.88',
    branchId: '20000000-0000-0000-0000-000000000003',
    branchCode: 'BR-BD-VSIP',
    branchName: 'Chi Nhánh Depot KCN VSIP II — Bình Dương',
    contractType: 'FULL_TIME',
    shiftName: 'CA_SANG',
    baseSalaryVnd: 23500000,
    hireDate: '2024-02-12',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'safety',
    verifiedAt: '2026-11-06T08:40:00Z',
    verificationNotes: 'Đạt bằng FC & chứng chỉ vận hành đầu kéo điện cao áp EV.',
    backgroundCheckPassed: true,
    licenseNumber: '740194881120',
    dateOfBirth: '1980-01-01',
    licenseIssueDate: '2020-01-01',
    licenseClass: 'FC',
    licenseExpiryDate: '2029-06-30',
    healthCheckPassed: true,
    healthCheckDate: '2026-09-10',
    safetyTrainingCertified: true,
    assignedVehiclePlate: '51D-686.88',
    demeritPoints: 1,
    notes: 'Lái chính đội xe điện VSIP II giảm phát thải.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000007',
    employeeCode: 'NV-HBM-007',
    fullName: 'Đặng Quốc Bảo',
    username: 'hub_mgr_dinhbang',
    email: 'hubmanager@ccadro.vn',
    phone: '0909-100-007',
    nationalId: '027086009912',
    roleCode: 'HUB_MANAGER',
    staffCategory: 'OPS_DISPATCH',
    department: 'Mạng Lưới Kho Hub',
    jobTitle: 'Trưởng Trạm Hub Đình Bảng',
    branchId: '20000000-0000-0000-0000-000000000002',
    branchCode: 'BR-BN-DB',
    branchName: 'Chi Nhánh Hub Đình Bảng — Bắc Ninh',
    contractType: 'FULL_TIME',
    shiftName: 'CA_HANH_CHINH',
    baseSalaryVnd: 27000000,
    hireDate: '2023-11-01',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'admin',
    verifiedAt: '2026-11-03T16:10:00Z',
    verificationNotes: 'Trưởng trạm được ủy quyền phân dải mã & quản trị tài khoản Hub.',
    backgroundCheckPassed: true,
    safetyTrainingCertified: true,
    assignedHubCode: 'HUB-DINHBANG-BN',
    notes: 'Phân bổ kiện hàng và chỉ đạo shipper nội thành.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000008',
    employeeCode: 'NV-HBS-008',
    fullName: 'Trần Hoàng Nam',
    username: 'hub_shipper_db01',
    email: 'shipper.db01@ccadro.vn',
    phone: '0909-100-008',
    nationalId: '027098004512',
    roleCode: 'HUB_SHIPPER',
    staffCategory: 'DRIVER_FLEET',
    department: 'Giao Nhận Chặng Cuối Hub Đình Bảng',
    jobTitle: 'Nhân Viên Giao Hàng Xe Máy Điện EV',
    branchId: '20000000-0000-0000-0000-000000000002',
    branchCode: 'BR-BN-DB',
    branchName: 'Chi Nhánh Hub Đình Bảng — Bắc Ninh',
    contractType: 'CONTRACT',
    shiftName: 'CA_CHIEU',
    baseSalaryVnd: 16500000,
    hireDate: '2024-06-05',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'admin',
    verifiedAt: '2026-11-05T11:00:00Z',
    verificationNotes: 'Shipper nội khu HUB-DINHBANG-BN đạt kiểm duyệt Photo POD & PCCC.',
    backgroundCheckPassed: true,
    licenseNumber: '270198002314',
    licenseClass: 'A1',
    licenseExpiryDate: '2030-06-30',
    healthCheckPassed: true,
    healthCheckDate: '2026-09-01',
    safetyTrainingCertified: true,
    assignedVehiclePlate: '99B1-EV08',
    assignedHubCode: 'HUB-DINHBANG-BN',
    demeritPoints: 0,
    notes: 'Chuyên tuyến giao nhanh khu vực Từ Sơn - Yên Phong.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000009',
    employeeCode: 'NV-AUD-008',
    fullName: 'Đặng Thị Minh Châu',
    username: 'hub_auditor_dinhbang',
    email: 'audit.dinhbang@ccadro.vn',
    phone: '0945-909-101',
    nationalId: '027193007722',
    roleCode: 'HUB_AUDITOR',
    staffCategory: 'CONTROL_AUDIT',
    department: 'Kiểm Toán & Đối Soát 3PL',
    jobTitle: 'Kiểm Tra Viên Ảnh POD & SLA Trụ Sở',
    branchId: '20000000-0000-0000-0000-000000000002',
    branchCode: 'BR-BN-DB',
    branchName: 'Chi Nhánh Hub Đình Bảng — Bắc Ninh',
    contractType: 'FULL_TIME',
    shiftName: 'CA_HANH_CHINH',
    baseSalaryVnd: 19500000,
    hireDate: '2024-04-18',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    verifiedBy: 'admin',
    verifiedAt: '2026-11-06T09:30:00Z',
    verificationNotes: 'Kiểm tra viên đối soát chứng từ ePOD độc lập tại Hub Đình Bảng.',
    backgroundCheckPassed: true,
    safetyTrainingCertified: true,
    certificationCode: 'HUB-QA-3PL-2026-019',
    certificateExpiryDate: '2028-05-15',
    issuingAuthority: 'Ban Kiểm Soát Chất Lượng CCADRO',
    inspectionScope: 'HUB_POD_PHOTO, COLD_CHAIN_TEMP, HUB_SLA_READONLY',
    assignedHubCode: 'HUB-DINHBANG-BN',
    canSignOffCompliance: true,
    notes: 'Đối soát chứng từ giao nhận đọc-duy-nhất.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000010',
    employeeCode: 'NV-DRV-009',
    fullName: 'Trần Quốc Tuấn',
    username: 'driver_tuan',
    email: 'tuan.driver@ccadro.vn',
    phone: '0904-556-778',
    nationalId: '074091009988',
    roleCode: 'DRIVER',
    staffCategory: 'DRIVER_FLEET',
    department: 'Đội Xe Đầu Kéo Điện VSIP',
    jobTitle: 'Tài Xế Xe Tải Điện 15T',
    branchId: '20000000-0000-0000-0000-000000000003',
    branchCode: 'BR-BD-VSIP',
    branchName: 'Chi Nhánh Depot KCN VSIP II — Bình Dương',
    contractType: 'FULL_TIME',
    shiftName: 'CA_SANG',
    baseSalaryVnd: 20500000,
    hireDate: '2026-10-12',
    status: 'ACTIVE',
    verificationStatus: 'PENDING_REVIEW',
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: 'Đang chờ Admin/Safety thẩm định phiếu khám sức khỏe định kỳ Q4.',
    backgroundCheckPassed: true,
    licenseNumber: '740182993412',
    licenseClass: 'C',
    licenseExpiryDate: '2028-11-20',
    healthCheckPassed: false,
    healthCheckDate: '',
    safetyTrainingCertified: true,
    assignedVehiclePlate: '61C-339.79',
    demeritPoints: 2,
    notes: 'Tài xế mới điều chuyển sang tuyến VSIP 1 - Cát Lái.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000011',
    employeeCode: 'NV-SHP-010',
    fullName: 'Hoàng Đức Thịnh',
    username: 'shipper_thinh',
    email: 'thinh.shipper@ccadro.vn',
    phone: '0972-881-220',
    nationalId: '027099006655',
    roleCode: 'HUB_SHIPPER',
    staffCategory: 'DRIVER_FLEET',
    department: 'Đội Giao Nhận Last-Mile 3PL',
    jobTitle: 'Nhân Viên Giao Hàng Nội Khu',
    branchId: '20000000-0000-0000-0000-000000000002',
    branchCode: 'BR-BN-DB',
    branchName: 'Chi Nhánh Hub Đình Bảng — Bắc Ninh',
    contractType: 'CONTRACT',
    shiftName: 'CA_CHIEU',
    baseSalaryVnd: 15500000,
    hireDate: '2026-09-05',
    status: 'ACTIVE',
    verificationStatus: 'REVISION_REQUIRED',
    verifiedBy: 'safety',
    verifiedAt: '2026-11-10T10:15:00Z',
    verificationNotes: 'Yêu cầu bổ sung chứng chỉ tập huấn an toàn PCCC & cập nhật hạn GPLX.',
    backgroundCheckPassed: true,
    licenseNumber: '270201009911',
    licenseClass: 'A1',
    licenseExpiryDate: '2029-04-10',
    healthCheckPassed: true,
    healthCheckDate: '2026-09-12',
    safetyTrainingCertified: false,
    assignedVehiclePlate: '99G1-EV12',
    assignedHubCode: 'HUB-DINHBANG-BN',
    demeritPoints: 0,
    notes: 'Cần hoàn tất lớp PCCC trước khi giao đơn giá trị cao.',
    isDeleted: false
  },
  {
    id: '30000000-0000-0000-0000-000000000012',
    employeeCode: 'NV-SAF-011',
    fullName: 'Nguyễn Thanh Tùng',
    username: 'safety_tung',
    email: 'tung.safety@ccadro.vn',
    phone: '0918-332-449',
    nationalId: '079088005432',
    roleCode: 'SAFETY_MANAGER',
    staffCategory: 'CONTROL_AUDIT',
    department: 'Ban Kiểm Soát An Toàn Miền Nam',
    jobTitle: 'Chuyên Viên Kiểm Định Pre-Trip & Camera AI',
    branchId: '20000000-0000-0000-0000-000000000001',
    branchCode: 'BR-HCM-HQ',
    branchName: 'Trụ Sở Chính & Cảng Cát Lái (HCM HQ)',
    contractType: 'FULL_TIME',
    shiftName: 'CA_24_7',
    baseSalaryVnd: 24500000,
    hireDate: '2026-10-01',
    status: 'ACTIVE',
    verificationStatus: 'PENDING_REVIEW',
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: 'Chờ Admin xác nhận cấp quyền ký duyệt đình chỉ xe (canSignOffCompliance).',
    backgroundCheckPassed: true,
    safetyTrainingCertified: true,
    certificationCode: 'HSE-DRV-2026-088',
    certificateExpiryDate: '2028-08-31',
    issuingAuthority: 'Sở LĐTBXH TP.HCM',
    inspectionScope: 'AN_TOAN_KY_THUAT, CAMERA_AI_VIOLATION',
    canSignOffCompliance: false,
    notes: 'Phụ trách giám sát hành trình cảng Cát Lái.',
    isDeleted: false
  }
];

function readStore(key, fallback) {
  return readJsonStore(key, fallback);
}

function writeStore(key, list) {
  writeJsonStore(key, list);
}

export function getLocalBranches(includeDeleted = false) {
  const branches = readStore(BRANCHES_STORAGE_KEY, INITIAL_BRANCH_SEED);
  const staff = readStore(STAFF_STORAGE_KEY, INITIAL_STAFF_SEED).filter((s) => !s.isDeleted);
  const enriched = branches.map((b) => ({
    ...b,
    activeStaffCount: staff.filter((s) => s.branchId === b.id || s.branchCode === b.branchCode).length
  }));
  return includeDeleted ? enriched : enriched.filter((b) => !b.isDeleted);
}

export function saveLocalBranches(list) {
  writeStore(BRANCHES_STORAGE_KEY, list);
  return getLocalBranches(true);
}

export function getLocalStaff(includeDeleted = false) {
  const branches = readStore(BRANCHES_STORAGE_KEY, INITIAL_BRANCH_SEED);
  const branchNameById = new Map(branches.map((b) => [b.id, b.branchName]));
  const staff = readStore(STAFF_STORAGE_KEY, INITIAL_STAFF_SEED).map((s) => ({
    ...s,
    branchName: s.branchId ? branchNameById.get(s.branchId) || s.branchName : s.branchName
  }));
  return includeDeleted ? staff : staff.filter((s) => !s.isDeleted);
}

export function saveLocalStaff(list) {
  writeStore(STAFF_STORAGE_KEY, list);
  return getLocalStaff(true);
}

export function buildRoleBreakdown(staffList = []) {
  const active = staffList.filter((s) => !s.isDeleted);
  const roles = new Set([...STAFF_ROLE_ORDER, ...active.map((s) => s.roleCode).filter(Boolean)]);
  return Array.from(roles)
    .filter((roleCode) => STAFF_ROLE_ORDER.includes(roleCode) || active.some((s) => s.roleCode === roleCode))
    .map((roleCode) => {
      const members = active.filter((s) => s.roleCode === roleCode);
      return {
        roleCode,
        roleLabel: STAFF_ROLE_LABELS[roleCode] || roleCode,
        shortLabel: STAFF_ROLE_SHORT[roleCode] || roleCode,
        color: STAFF_ROLE_COLORS[roleCode] || '#38bdf8',
        totalCount: members.length,
        activeCount: members.filter((m) => m.status === 'ACTIVE').length,
        onLeaveCount: members.filter((m) => m.status === 'ON_LEAVE').length,
        suspendedCount: members.filter((m) => m.status === 'SUSPENDED').length,
        monthlyPayrollVnd: members.reduce((acc, m) => acc + Number(m.baseSalaryVnd || 0), 0)
      };
    });
}

export const APPLICATIONS_STORAGE_KEY = 'ccadro_applications_v1';

export const PUBLIC_CAREER_ROLE_CODES = [
  'DRIVER',
  'HUB_SHIPPER',
  'SAFETY_MANAGER',
  'ESG_AUDITOR',
  'HUB_AUDITOR',
  'DISPATCHER',
  'HUB_MANAGER'
];

export const APPLICATION_STATUS_META = {
  SUBMITTED: {
    code: 'SUBMITTED',
    label: 'Đã Nộp Hồ Sơ',
    shortLabel: 'Mới nộp',
    badgeClass: 'badge-blue',
    color: '#2563eb'
  },
  SCREENING: {
    code: 'SCREENING',
    label: 'Đang Sơ Loại HR',
    shortLabel: 'Sơ loại',
    badgeClass: 'badge-sky',
    color: '#0284c7'
  },
  INTERVIEW_OR_DRIVE_TEST: {
    code: 'INTERVIEW_OR_DRIVE_TEST',
    label: 'Phỏng Vấn / Lái Thử',
    shortLabel: 'Lái thử / PV',
    badgeClass: 'badge-amber',
    color: '#d97706'
  },
  COMPLIANCE_CHECKING: {
    code: 'COMPLIANCE_CHECKING',
    label: 'Chờ Thẩm Định Compliance',
    shortLabel: 'Thẩm định',
    badgeClass: 'badge-purple',
    color: '#9333ea'
  },
  APPROVED_ONBOARDED: {
    code: 'APPROVED_ONBOARDED',
    label: 'Đã Tiếp Nhận (Onboarded)',
    shortLabel: 'Đã tiếp nhận',
    badgeClass: 'badge-green',
    color: '#059669'
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'Từ Chối Hồ Sơ',
    shortLabel: 'Từ chối',
    badgeClass: 'badge-red',
    color: '#dc2626'
  }
};

export const PUBLIC_CAREER_OPENINGS = [
  {
    roleCode: 'DRIVER',
    title: 'Tài Xế Đầu Kéo & Xe Tải Điện EV Đường Dài',
    department: 'Đội Xe Đường Dài & Vận Tải Xanh',
    salaryRangeVnd: '20.000.000 – 28.000.000 ₫/tháng',
    badge: 'Đang tuyển gấp',
    requirementsSummary: 'Bắt buộc GPLX hạng FC/C/C1/CE còn hiệu lực, khám sức khỏe định kỳ & sẵn sàng tập huấn an toàn Pin EV / PCCC.'
  },
  {
    roleCode: 'HUB_SHIPPER',
    title: 'Shipper Giao Hàng Chặng Cuối (Last-Mile EV)',
    department: 'Giao Nhận Chặng Cuối Hub',
    salaryRangeVnd: '13.500.000 – 18.000.000 ₫/tháng',
    badge: 'Tuyển liên tục',
    requirementsSummary: 'GPLX A1/A2/B1/B2 còn hạn, rành tuyến nội đô và chụp ảnh ePOD chuẩn SLA Hub.'
  },
  {
    roleCode: 'SAFETY_MANAGER',
    title: 'Chuyên Viên / Trưởng Nhóm Kiểm Soát An Toàn HSE',
    department: 'An Toàn Vận Hành & HSE',
    salaryRangeVnd: '26.000.000 – 36.000.000 ₫/tháng',
    badge: 'Kiểm soát trọng yếu',
    requirementsSummary: 'Chứng chỉ An toàn lao động / PCCC / HSE còn hạn & kinh nghiệm thẩm định an toàn trước chuyến.'
  },
  {
    roleCode: 'ESG_AUDITOR',
    title: 'Chuyên Viên Kiểm Toán Phát Thải Carbon (Scope 3)',
    department: 'Phát Triển Bền Vững ESG',
    salaryRangeVnd: '24.000.000 – 33.000.000 ₫/tháng',
    badge: 'Chuẩn GLEC v3',
    requirementsSummary: 'Chứng chỉ ISO 14083 / GLEC v3 / GHG Protocol & kinh nghiệm ký duyệt chứng từ phát thải.'
  },
  {
    roleCode: 'HUB_AUDITOR',
    title: 'Kiểm Toán Viên Vận Hành Kho Trung Chuyển Hub',
    department: 'Kiểm Soát Nội Bộ Hub',
    salaryRangeVnd: '19.000.000 – 26.000.000 ₫/tháng',
    badge: 'Toàn quốc',
    requirementsSummary: 'Chứng chỉ kiểm soát nội bộ / QA logistics, đối soát tồn kho Hub-to-Hub & audit SLA.'
  },
  {
    roleCode: 'DISPATCHER',
    title: 'Điều Phối Viên Trung Tâm Vận Hành NOC',
    department: 'Trung Tâm Điều Hành NOC',
    salaryRangeVnd: '21.000.000 – 29.000.000 ₫/tháng',
    badge: 'Tuyển 24/7',
    requirementsSummary: 'Kinh nghiệm điều phối tuyến đường dài, xử lý tái định tuyến & giám sát đội xe.'
  },
  {
    roleCode: 'HUB_MANAGER',
    title: 'Trưởng Trạm Trung Chuyển Khu Vực (Hub Manager)',
    department: 'Quản Lý Trạm Trung Chuyển',
    salaryRangeVnd: '27.000.000 – 38.000.000 ₫/tháng',
    badge: 'Quản lý trạm',
    requirementsSummary: 'Kinh nghiệm vận hành trạm trung chuyển >= 3 năm, quản lý Shipper & chỉ tiêu SLA.'
  }
];

export const INITIAL_APPLICATIONS_SEED = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    applicationCode: 'APP-2026-0001',
    lookupPin: '482910',
    fullName: 'Đỗ Văn Khải',
    email: 'khai.do.driver@gmail.com',
    phone: '0912-345-678',
    nationalId: '079092004512',
    dateOfBirth: '1992-05-14',
    address: 'Phường Cát Lái, TP. Thủ Đức, TP.HCM',
    roleCode: 'DRIVER',
    preferredBranchId: '20000000-0000-0000-0000-000000000001',
    preferredBranchCode: 'BR-HCM-HQ',
    preferredBranchName: 'Trụ Sở Chính & Cảng Cát Lái (HCM HQ)',
    experienceYears: 7,
    expectedSalaryVnd: 23000000,
    licenseNumber: '790192004512',
    licenseIssueDate: '2020-01-01',
    licenseClass: 'FC',
    licenseExpiryDate: '2029-12-31',
    healthCheckDeclared: true,
    safetyTrainingDeclared: true,
    candidateNotes: 'Có 7 năm chạy đầu kéo container cảng Cát Lái - Cái Mép, sẵn sàng nhận xe tải điện.',
    applicationStatus: 'COMPLIANCE_CHECKING',
    screeningNotes: 'HR sơ loại đạt; Lái thử đầu kéo điện tại Depot đạt 94/100 điểm.',
    interviewScheduledAt: '2026-11-16T09:00:00Z',
    interviewScore: 94,
    driveTestPassed: true,
    reviewedBy: 'safety',
    submittedAt: '2026-11-14T08:00:00Z',
    updatedAt: '2026-11-16T10:30:00Z'
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    applicationCode: 'APP-2026-0002',
    lookupPin: '619304',
    fullName: 'Lê Minh Tú',
    email: 'tu.le.shipper@gmail.com',
    phone: '0938-221-889',
    nationalId: '027097001122',
    dateOfBirth: '1997-08-22',
    address: 'TP. Từ Sơn, Bắc Ninh',
    roleCode: 'HUB_SHIPPER',
    preferredBranchId: '20000000-0000-0000-0000-000000000002',
    preferredBranchCode: 'BR-BN-DB',
    preferredBranchName: 'Chi Nhánh Hub Đình Bảng — Bắc Ninh',
    experienceYears: 3,
    expectedSalaryVnd: 15500000,
    licenseNumber: '270197001122',
    licenseClass: 'B2',
    licenseExpiryDate: '2030-06-30',
    healthCheckDeclared: true,
    safetyTrainingDeclared: false,
    candidateNotes: 'Rành tuyến KCN VSIP Bắc Ninh - Long Biên, đã chạy xe van điện 2 năm.',
    applicationStatus: 'INTERVIEW_OR_DRIVE_TEST',
    screeningNotes: 'Đã lên lịch kiểm tra tay lái và thực hành scan ePOD tại Hub Đình Bảng.',
    interviewScheduledAt: '2026-11-20T14:00:00Z',
    interviewScore: null,
    driveTestPassed: false,
    reviewedBy: 'dispatcher',
    submittedAt: '2026-11-15T10:15:00Z',
    updatedAt: '2026-11-16T11:00:00Z'
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    applicationCode: 'APP-2026-0003',
    lookupPin: '753190',
    fullName: 'Nguyễn Thị Thu Hà',
    email: 'ha.nguyen.hse@gmail.com',
    phone: '0904-556-772',
    nationalId: '075191008833',
    dateOfBirth: '1991-03-19',
    address: 'TP. Biên Hòa, Đồng Nai',
    roleCode: 'SAFETY_MANAGER',
    preferredBranchId: '20000000-0000-0000-0000-000000000004',
    preferredBranchCode: 'BR-DN-AMATA',
    preferredBranchName: 'Chi Nhánh Trạm Trung Chuyển Amata — Đồng Nai',
    experienceYears: 6,
    expectedSalaryVnd: 29000000,
    certificationCode: 'HSE-VN-2026-309',
    certificateExpiryDate: '2028-11-30',
    issuingAuthority: 'Cục An Toàn Lao Động — Bộ LĐTBXH',
    inspectionScope: 'AN_TOAN_KY_THUAT, XU_LY_SU_CO',
    healthCheckDeclared: true,
    safetyTrainingDeclared: true,
    candidateNotes: 'Có chứng chỉ HSE hạng A và kinh nghiệm giám sát an toàn đội xe lạnh Amata.',
    applicationStatus: 'SUBMITTED',
    screeningNotes: null,
    interviewScheduledAt: null,
    interviewScore: null,
    driveTestPassed: false,
    reviewedBy: null,
    submittedAt: '2026-11-17T07:45:00Z',
    updatedAt: '2026-11-17T07:45:00Z'
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    applicationCode: 'APP-2026-0004',
    lookupPin: '882415',
    fullName: 'Hoàng Trung Kiên',
    email: 'kien.hoang.esg@gmail.com',
    phone: '0987-331-209',
    nationalId: '001093007744',
    dateOfBirth: '1993-11-05',
    address: 'Quận Long Biên, Hà Nội',
    roleCode: 'ESG_AUDITOR',
    preferredBranchId: '20000000-0000-0000-0000-000000000005',
    preferredBranchCode: 'BR-HN-LB',
    preferredBranchName: 'Chi Nhánh Cảng Cạn ICD Long Biên — Hà Nội',
    experienceYears: 5,
    expectedSalaryVnd: 27000000,
    certificationCode: 'ISO14083-ESG-511',
    certificateExpiryDate: '2029-05-31',
    issuingAuthority: 'Smart Freight Centre / GLEC v3',
    inspectionScope: 'KIEM_TOAN_CARBON_GLEC, SHA256_REPORT',
    healthCheckDeclared: true,
    safetyTrainingDeclared: true,
    candidateNotes: 'Chuyên gia kiểm toán phát thải GHG Scope 3 chuỗi cung ứng lạnh.',
    applicationStatus: 'SCREENING',
    screeningNotes: 'Đã kiểm tra bằng cấp & mã chứng chỉ ISO 14083 hợp lệ.',
    interviewScheduledAt: null,
    interviewScore: null,
    driveTestPassed: false,
    reviewedBy: 'admin',
    submittedAt: '2026-11-16T09:30:00Z',
    updatedAt: '2026-11-17T09:00:00Z'
  }
];

export function getLocalApplications() {
  const branches = readStore(BRANCHES_STORAGE_KEY, INITIAL_BRANCH_SEED);
  const branchNameById = new Map(branches.map((b) => [b.id, b.branchName]));
  return readStore(APPLICATIONS_STORAGE_KEY, INITIAL_APPLICATIONS_SEED).map((app) => ({
    ...app,
    preferredBranchName: app.preferredBranchId
      ? branchNameById.get(app.preferredBranchId) || app.preferredBranchName || app.preferredBranchCode
      : app.preferredBranchName || app.preferredBranchCode
  }));
}

export function saveLocalApplications(list) {
  writeStore(APPLICATIONS_STORAGE_KEY, list);
  return getLocalApplications();
}

export function submitLocalApplication(payload) {
  const list = getLocalApplications();
  const roleCode = String(payload?.roleCode || '').trim().toUpperCase();
  if (!PUBLIC_CAREER_ROLE_CODES.includes(roleCode)) {
    throw new Error('Vai trò này không cho phép nộp đơn ứng tuyển công khai.');
  }
  const branches = getLocalBranches(false);
  const matchedBranch =
    branches.find((b) => b.id === payload?.preferredBranchId) ||
    branches.find((b) => b.branchCode === payload?.preferredBranchCode) ||
    null;
  const seq = 10 + list.length;
  const applicationCode = `APP-2026-${String(seq).padStart(4, '0')}`;
  const lookupPin = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date().toISOString();
  const created = {
    id: `app-${Date.now()}`,
    applicationCode,
    lookupPin,
    fullName: String(payload?.fullName || '').trim(),
    email: String(payload?.email || '').trim().toLowerCase(),
    phone: String(payload?.phone || '').trim(),
    nationalId: String(payload?.nationalId || '').trim(),
    dateOfBirth: payload?.dateOfBirth || null,
    address: payload?.address || '',
    roleCode,
    preferredBranchId: matchedBranch?.id || payload?.preferredBranchId || null,
    preferredBranchCode: matchedBranch?.branchCode || payload?.preferredBranchCode || '',
    preferredBranchName: matchedBranch?.branchName || payload?.preferredBranchCode || '',
    experienceYears: Number(payload?.experienceYears || 0),
    expectedSalaryVnd: Number(payload?.expectedSalaryVnd || 0),
    licenseNumber: payload?.licenseNumber || '',
    licenseClass: payload?.licenseClass || '',
    licenseIssueDate: payload?.licenseIssueDate || '',
    licenseExpiryDate: payload?.licenseExpiryDate || '',
    certificationCode: payload?.certificationCode || '',
    certificateExpiryDate: payload?.certificateExpiryDate || '',
    issuingAuthority: payload?.issuingAuthority || '',
    inspectionScope: payload?.inspectionScope || '',
    healthCheckDeclared: Boolean(payload?.healthCheckDeclared),
    safetyTrainingDeclared: Boolean(payload?.safetyTrainingDeclared),
    candidateNotes: payload?.candidateNotes || '',
    applicationStatus: 'SUBMITTED',
    screeningNotes: null,
    interviewScheduledAt: null,
    interviewScore: null,
    driveTestPassed: false,
    reviewedBy: null,
    submittedAt: now,
    updatedAt: now
  };
  saveLocalApplications([created, ...list]);
  return {
    application: created,
    lookupPin,
    message: `Đã tiếp nhận hồ sơ ${applicationCode}. Lưu mã PIN ${lookupPin} để tra cứu tiến độ.`
  };
}

export function lookupLocalCareerStatus(applicationCode, credential) {
  const code = String(applicationCode || '').trim().toUpperCase();
  const secret = String(credential || '').trim().toLowerCase();
  const found = getLocalApplications().find(
    (app) =>
      app.applicationCode?.toUpperCase() === code &&
      (String(app.lookupPin || '').toLowerCase() === secret ||
        String(app.email || '').toLowerCase() === secret)
  );
  if (!found) {
    throw new Error('Không tìm thấy hồ sơ hoặc mã PIN / Email xác thực không khớp.');
  }
  return found;
}

export function advanceLocalApplicationStage(appId, patch, actor = 'admin') {
  const list = getLocalApplications();
  const idx = list.findIndex((a) => a.id === appId);
  if (idx === -1) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');
  const updated = {
    ...list[idx],
    ...patch,
    reviewedBy: actor,
    updatedAt: new Date().toISOString()
  };
  const next = [...list];
  next[idx] = updated;
  saveLocalApplications(next);
  return updated;
}

export function approveLocalApplication(appId, decision = {}, actor = 'admin') {
  const list = getLocalApplications();
  const idx = list.findIndex((a) => a.id === appId);
  if (idx === -1) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');
  const app = list[idx];
  if (app.applicationStatus === 'APPROVED_ONBOARDED' || app.applicationStatus === 'REJECTED') {
    throw new Error('Hồ sơ đã đóng, không thể xác nhận lại.');
  }
  const roleCode = String(app.roleCode || '').toUpperCase();
  if (DRIVER_ROLE_CODES.includes(roleCode) && !app.driveTestPassed && !decision.bypassDriveTest) {
    throw new Error('Ứng viên nhóm Lái xe / Shipper phải hoàn thành kiểm tra tay lái (Lái thử đạt chuẩn) trước khi tiếp nhận.');
  }

  const branches = getLocalBranches(false);
  const resolvedBranch =
    branches.find((b) => b.id === (decision.branchId || app.preferredBranchId)) ||
    branches.find((b) => b.branchCode === (decision.branchCode || app.preferredBranchCode)) ||
    null;

  const approveComplianceNow = Boolean(decision.approveComplianceNow);
  const draftStaff = {
    roleCode,
    backgroundCheckPassed: decision.backgroundCheckPassed ?? true,
    licenseNumber: decision.licenseNumber ?? app.licenseNumber,
    licenseClass: decision.licenseClass ?? app.licenseClass,
    dateOfBirth: app.dateOfBirth,
    licenseIssueDate: app.licenseIssueDate,
    licenseExpiryDate: decision.licenseExpiryDate ?? app.licenseExpiryDate,
    healthCheckPassed: decision.healthCheckPassed ?? Boolean(app.healthCheckDeclared),
    healthCheckDate: decision.healthCheckDate || new Date().toISOString().slice(0, 10),
    safetyTrainingCertified: decision.safetyTrainingCertified ?? Boolean(app.safetyTrainingDeclared),
    certificationCode: decision.certificationCode ?? app.certificationCode,
    certificateExpiryDate: decision.certificateExpiryDate ?? app.certificateExpiryDate,
    issuingAuthority: decision.issuingAuthority ?? app.issuingAuthority,
    inspectionScope: decision.inspectionScope ?? app.inspectionScope,
    canSignOffCompliance: Boolean(decision.canSignOffCompliance ?? approveComplianceNow)
  };

  if (approveComplianceNow) {
    const missing = validateComplianceForApproval(draftStaff);
    if (missing.length > 0) {
      throw new Error(`Chưa đủ điều kiện phê duyệt nghiệp vụ (${missing.join(', ')}).`);
    }
  }

  const currentStaff = getLocalStaff(true);
  const rawBaseUsername =
    decision.username ||
    app.email?.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() ||
    `staff${currentStaff.length + 1}`;
  let username = rawBaseUsername;
  let suffix = 1;
  while (currentStaff.some((s) => String(s.username || '').toLowerCase() === username.toLowerCase())) {
    suffix += 1;
    username = `${rawBaseUsername}${suffix}`;
  }

  const rolePrefixMap = {
    DRIVER: 'DRV',
    HUB_SHIPPER: 'HSH',
    SAFETY_MANAGER: 'SAF',
    ESG_AUDITOR: 'ESG',
    HUB_AUDITOR: 'HAU',
    DISPATCHER: 'DSP',
    HUB_MANAGER: 'HMG'
  };
  const prefix = rolePrefixMap[roleCode] || 'NV';
  const employeeCode = `NV-${prefix}-${String(currentStaff.length + 101).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const createdStaff = {
    id: `staff-${Date.now()}`,
    employeeCode,
    fullName: app.fullName,
    username,
    email: app.email,
    phone: app.phone,
    nationalId: app.nationalId,
    roleCode,
    staffCategory: resolveStaffCategory(roleCode),
    department: decision.department || (DRIVER_ROLE_CODES.includes(roleCode) ? 'Đội Xe Vận Tải Xanh' : 'Phòng Nghiệp Vụ CCADRO'),
    jobTitle: decision.jobTitle || STAFF_ROLE_LABELS[roleCode] || roleCode,
    branchId: resolvedBranch?.id || app.preferredBranchId || null,
    branchCode: resolvedBranch?.branchCode || app.preferredBranchCode || '',
    branchName: resolvedBranch?.branchName || app.preferredBranchName || '',
    assignedHubCode: decision.assignedHubCode || (roleCode.startsWith('HUB_') ? resolvedBranch?.branchCode || 'HUB-CATLAI' : ''),
    assignedShipperCode: decision.assignedShipperCode || '',
    assignedVehiclePlate: decision.assignedVehiclePlate || '',
    contractType: decision.contractType || 'PROBATION_60D',
    shiftName: decision.shiftName || 'CA_HANH_CHINH',
    baseSalaryVnd: Number(decision.approvedSalaryVnd || app.expectedSalaryVnd || 18000000),
    hireDate: now.slice(0, 10),
    status: 'ACTIVE',
    verificationStatus: approveComplianceNow ? 'APPROVED' : 'PENDING_REVIEW',
    verifiedBy: approveComplianceNow ? actor : null,
    verifiedAt: approveComplianceNow ? now : null,
    verificationNotes:
      decision.approvalNotes || `Tiếp nhận từ hồ sơ tuyển dụng ${app.applicationCode}`,
    ...draftStaff,
    notes: `Onboard từ đơn ${app.applicationCode}`,
    isDeleted: false
  };

  saveLocalStaff([createdStaff, ...currentStaff]);

  const updatedApp = {
    ...app,
    applicationStatus: 'APPROVED_ONBOARDED',
    createdStaffId: createdStaff.id,
    createdUsername: username,
    reviewedBy: actor,
    screeningNotes: decision.approvalNotes || app.screeningNotes,
    updatedAt: now
  };
  const nextApps = [...list];
  nextApps[idx] = updatedApp;
  saveLocalApplications(nextApps);

  return {
    application: updatedApp,
    createdStaff,
    onboardedUsername: username,
    generatedEmployeeCode: employeeCode,
    mustChangePassword: true,
    assetDriverSyncStatus: roleCode === 'DRIVER' ? 'LOCAL_SANDBOX_SYNCED' : 'NOT_APPLICABLE'
  };
}

export function rejectLocalApplication(appId, reason, actor = 'admin') {
  const list = getLocalApplications();
  const idx = list.findIndex((a) => a.id === appId);
  if (idx === -1) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');
  const updated = {
    ...list[idx],
    applicationStatus: 'REJECTED',
    rejectionReason: String(reason || '').trim() || 'Hồ sơ chưa đáp ứng tiêu chuẩn tuyển dụng của vị trí.',
    reviewedBy: actor,
    updatedAt: new Date().toISOString()
  };
  const next = [...list];
  next[idx] = updated;
  saveLocalApplications(next);
  return updated;
}
