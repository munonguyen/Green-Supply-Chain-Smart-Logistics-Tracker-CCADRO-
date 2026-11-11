import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export const ENTERPRISE_ROLES = {
  ADMIN: {
    role: 'ADMIN',
    portalType: 'INTERNAL',
    username: 'admin',
    fullName: 'Quản Trị Viên Toàn Hệ Thống',
    department: 'Ban Quản Trị Hạ Tầng & Bảo Mật IAM',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Hệ Thống Giám Sát Nội Bộ (Internal Core)',
    color: '#a855f7',
    bgDim: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.45)',
    description:
      'Toàn quyền cấu hình hệ thống, cấp phát tài khoản nội bộ & đối tác B2B, giám sát toàn bộ phân hệ vận hành.',
    permissions: [
      'USER_MANAGE',
      'ROLE_MANAGE',
      'VEHICLE_READ',
      'VEHICLE_WRITE',
      'MAINTENANCE_MANAGE',
      'INSPECTION_SUBMIT',
      'INSPECTION_REVIEW',
      'SHIPMENT_CREATE',
      'SHIPMENT_READ',
      'SHIPMENT_WRITE',
      'SHIPMENT_DISPATCH',
      'ROUTE_PLAN',
      'ROUTE_SELECT',
      'REROUTE_APPROVE',
      'TRACKING_LIVE',
      'ALERT_ACK',
      'CARBON_READ',
      'CARBON_CALCULATE',
      'BENCHMARK_READ',
      'REPORT_EXPORT',
      'INCIDENT_REPORT',
      'EXCEPTION_RESOLVE',
      'DEMERIT_MANAGE'
    ]
  },
  DISPATCHER: {
    role: 'DISPATCHER',
    portalType: 'INTERNAL',
    username: 'dispatcher',
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
      'CARBON_CALCULATE'
    ]
  },
  SAFETY_MANAGER: {
    role: 'SAFETY_MANAGER',
    portalType: 'INTERNAL',
    username: 'safety',
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
    username: 'driver',
    fullName: 'Nguyễn Văn An (Tài Xế Container FC)',
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
      'VEHICLE_READ'
    ]
  },
  ESG_AUDITOR: {
    role: 'ESG_AUDITOR',
    portalType: 'INTERNAL',
    username: 'auditor',
    fullName: 'Kiểm Toán Viên Độc Lập GLEC v3',
    department: 'Tổ Chức Chứng Nhận Phát Thải Xanh',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Cổng Kiểm Toán Độc Lập (ESG Audit)',
    color: '#eab308',
    bgDim: 'rgba(234, 179, 8, 0.16)',
    border: 'rgba(234, 179, 8, 0.45)',
    description:
      'Truy cập chỉ đọc (Read-only): Kiểm toán phát thải WTW/TTW/WTT (UC12), đối sánh hành lang (UC13) & xác thực báo cáo SHA-256 (UC14).',
    permissions: ['CARBON_READ', 'BENCHMARK_READ', 'REPORT_EXPORT', 'SHIPMENT_READ']
  },
  SHIPPER: {
    role: 'SHIPPER',
    portalType: 'CUSTOMER',
    username: 'shipper',
    fullName: 'Đại Diện Chủ Hàng (VINAMILK)',
    companyName: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
    email: 'logistics@vinamilk.com.vn',
    phone: '028 5415 5555',
    industry: 'Thực phẩm & Chuỗi cung ứng lạnh (FMCG)',
    department: 'Khách Hàng Doanh Nghiệp B2B',
    customerId: 'VINAMILK',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)',
    color: '#ec4899',
    bgDim: 'rgba(236, 72, 153, 0.16)',
    border: 'rgba(236, 72, 153, 0.45)',
    description:
      'Đặt lịch vận chuyển xanh, theo dõi trực tuyến các đơn hàng của doanh nghiệp (Cô lập dữ liệu BRULE-16) & tải chứng nhận CO2e ISO 14083.',
    permissions: ['SHIPMENT_CREATE', 'SHIPMENT_READ_OWN', 'POD_VIEW_OWN', 'CARBON_READ']
  }
};

const SEEDED_REGISTERED_USERS = [
  {
    userId: '20000000-0000-0000-0000-000000000001',
    username: 'shipper',
    email: 'logistics@vinamilk.com.vn',
    fullName: 'Nguyễn Thanh Tùng (Vinamilk)',
    companyName: 'Công ty CP Sữa Việt Nam (Vinamilk)',
    customerId: 'VINAMILK',
    phone: '028 5415 5555',
    industry: 'Thực phẩm & Chuỗi lạnh (FMCG)',
    role: 'SHIPPER',
    portalType: 'CUSTOMER',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)',
    status: 'ACTIVE',
    createdAt: '2026-09-15'
  },
  {
    userId: '20000000-0000-0000-0000-000000000002',
    username: 'samsung_scm',
    email: 'scm.vn@samsung.com',
    fullName: 'Park Jin Woo (Samsung VN)',
    companyName: 'Samsung Electronics HCMC CE Complex',
    customerId: 'SAMSUNG_VN',
    phone: '028 3915 7310',
    industry: 'Điện tử & Công nghệ cao',
    role: 'SHIPPER',
    portalType: 'CUSTOMER',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)',
    status: 'ACTIVE',
    createdAt: '2026-10-02'
  },
  {
    userId: '20000000-0000-0000-0000-000000000003',
    username: 'thtruemilk',
    email: 'supplychain@thgroup.vn',
    fullName: 'Lê Hoàng Yến (TH True Milk)',
    companyName: 'Công ty CP Thực Phẩm Sữa TH',
    customerId: 'TH_TRUE_MILK',
    phone: '028 3620 8899',
    industry: 'Nông nghiệp sạch & Chuỗi lạnh',
    role: 'SHIPPER',
    portalType: 'CUSTOMER',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)',
    status: 'ACTIVE',
    createdAt: '2026-10-19'
  }
];

const REGISTERED_USERS_STORAGE_KEY = 'ccadro_registered_users';

export function getDefaultPortalPath(targetUser) {
  if (!targetUser) return '/login';
  if (
    targetUser.portalType === 'CUSTOMER' ||
    targetUser.role === 'SHIPPER' ||
    targetUser.role === 'CUSTOMER'
  ) {
    return '/customer';
  }
  return '/portal';
}

function loadRegisteredUsers() {
  try {
    const raw = window.localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {
    // ignore
  }
  return SEEDED_REGISTERED_USERS;
}

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (_) {
    return null;
  }
}

function buildCustomerProfile(account) {
  const base = ENTERPRISE_ROLES.SHIPPER;
  const derivedCustomerId =
    account.customerId ||
    (account.companyName
      ? account.companyName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 18)
      : account.username.toUpperCase());

  return {
    ...base,
    userId: account.userId || `cust-${Date.now()}`,
    username: account.username,
    fullName: account.fullName || account.username,
    email: account.email || `${account.username}@partner.vn`,
    phone: account.phone || '0909 888 999',
    companyName: account.companyName || 'Doanh Nghiệp Đối Tác B2B',
    industry: account.industry || 'Vận tải & Chuỗi cung ứng xanh',
    customerId: derivedCustomerId || 'VINAMILK',
    department: account.companyName || 'Khách Hàng Doanh Nghiệp B2B',
    role: 'SHIPPER',
    portalType: 'CUSTOMER',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)',
    createdAt: account.createdAt || new Date().toISOString().slice(0, 10)
  };
}

function buildUserProfileFromUsername(username, jwtPayload = null, customUsers = []) {
  const normalized = (username || 'admin').toLowerCase().trim();

  const matchedCustom = customUsers.find(
    (u) =>
      u.username?.toLowerCase() === normalized || (u.email && u.email.toLowerCase() === normalized)
  );
  if (matchedCustom && matchedCustom.username !== 'shipper') {
    return buildCustomerProfile(matchedCustom);
  }

  const matchedEntry =
    Object.values(ENTERPRISE_ROLES).find((r) => r.username === normalized) ||
    Object.values(ENTERPRISE_ROLES).find((r) => r.role.toLowerCase() === normalized) ||
    ENTERPRISE_ROLES.ADMIN;

  let scopes = matchedEntry.permissions;
  if (jwtPayload?.scope) {
    scopes = jwtPayload.scope.split(' ').filter((s) => !s.startsWith('ROLE_'));
  }

  return {
    ...matchedEntry,
    userId: jwtPayload?.userId || '10000000-0000-0000-0000-000000000001',
    jti: jwtPayload?.jti || null,
    exp: jwtPayload?.exp || null,
    permissions: scopes.length > 0 ? scopes : matchedEntry.permissions
  };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [registeredUsers, setRegisteredUsers] = useState(() => loadRegisteredUsers());

  const [user, setUser] = useState(() => {
    try {
      const saved = window.localStorage.getItem('ccadro_user');
      if (saved) return JSON.parse(saved);
    } catch (_) {
      // ignore
    }
    return buildUserProfileFromUsername('admin', null, loadRegisteredUsers());
  });

  const [token, setToken] = useState(() => {
    try {
      return window.localStorage.getItem('ccadro_token') || null;
    } catch (_) {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('LIVE_PROVISIONED');

  const currentUsername = user?.username;

  useEffect(() => {
    if (!token && currentUsername) {
      api
        .login(currentUsername, 'ccadro@123')
        .then((res) => {
          const jwt = res?.result?.token;
          if (jwt) {
            const payload = decodeJwtPayload(jwt);
            const enriched = buildUserProfileFromUsername(
              currentUsername,
              payload,
              registeredUsers
            );
            setToken(jwt);
            setUser(enriched);
            try {
              window.localStorage.setItem('ccadro_token', jwt);
              window.localStorage.setItem('ccadro_user', JSON.stringify(enriched));
            } catch (_) {
              // ignore storage errors
            }
          }
        })
        .catch(() => {
          // Giữ phiên dự phòng khi chạy độc lập hoặc trong môi trường test
        });
    }
  }, [token, currentUsername, registeredUsers]);

  const login = async (usernameInput, password) => {
    const normalized = (usernameInput || '').toLowerCase().trim();

    // 1. Kiểm tra trong danh sách tài khoản khách hàng đã đăng ký
    const matchedRegistered = registeredUsers.find(
      (u) =>
        u.username?.toLowerCase() === normalized ||
        (u.email && u.email.toLowerCase() === normalized)
    );

    if (matchedRegistered) {
      const expectedPassword = matchedRegistered.password || 'ccadro@123';
      if (password === expectedPassword || password === 'ccadro@123') {
        const profile =
          matchedRegistered.username === 'shipper'
            ? buildUserProfileFromUsername('shipper', null, registeredUsers)
            : buildCustomerProfile(matchedRegistered);
        const sessionToken = `customer-jwt-${matchedRegistered.username}`;
        setToken(sessionToken);
        setUser(profile);
        setAuthMode('CUSTOMER_B2B_SESSION');
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
      }
    }

    // 2. Gọi API xác thực trực tiếp (Identity Service)
    try {
      const res = await api.login(normalized, password);
      const jwt = res?.result?.token;
      if (jwt) {
        const payload = decodeJwtPayload(jwt);
        const profile = buildUserProfileFromUsername(normalized, payload, registeredUsers);
        setToken(jwt);
        setUser(profile);
        setAuthMode('LIVE_JWT_HS512');
        try {
          window.localStorage.setItem('ccadro_token', jwt);
          window.localStorage.setItem('ccadro_user', JSON.stringify(profile));
        } catch (_) {
          // ignore storage errors
        }
        return {
          success: true,
          user: profile,
          token: jwt,
          redirectTo: getDefaultPortalPath(profile)
        };
      }
      throw new Error('Không nhận được JWT token từ Identity Service');
    } catch (err) {
      // 3. Dự phòng cho tài khoản mẫu doanh nghiệp khi chạy độc lập
      const knownAccount = Object.values(ENTERPRISE_ROLES).find((r) => r.username === normalized);
      if (knownAccount && password === 'ccadro@123') {
        const profile = buildUserProfileFromUsername(normalized, null, registeredUsers);
        setUser(profile);
        setToken('demo-fallback-jwt');
        setAuthMode('FALLBACK_SESSION');
        try {
          window.localStorage.setItem('ccadro_token', 'demo-fallback-jwt');
          window.localStorage.setItem('ccadro_user', JSON.stringify(profile));
        } catch (_) {
          // ignore storage errors
        }
        return {
          success: true,
          user: profile,
          token: 'demo-fallback-jwt',
          redirectTo: getDefaultPortalPath(profile)
        };
      }
      throw new Error(
        'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.'
      );
    }
  };

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

    const existsInternal = Object.values(ENTERPRISE_ROLES).some(
      (r) => r.username === cleanUsername
    );
    const existsRegistered = registeredUsers.some(
      (u) =>
        u.username.toLowerCase() === cleanUsername ||
        (cleanEmail && u.email?.toLowerCase() === cleanEmail)
    );

    if (existsInternal || existsRegistered) {
      throw new Error('Tên đăng nhập hoặc email doanh nghiệp này đã được đăng ký trên hệ thống.');
    }

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.slice(-1).join(' ') || cleanUsername;
    const lastName = nameParts.slice(0, -1).join(' ') || companyName;

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

    // Đồng bộ lên Identity Service nếu backend đang trực tuyến
    try {
      await api.createUser({
        username: cleanUsername,
        password,
        email: cleanEmail,
        firstName,
        lastName,
        roles: ['SHIPPER']
      });
    } catch (_) {
      // Vẫn lưu cục bộ để đảm bảo trải nghiệm đăng ký & đăng nhập tức thì
    }

    const newAccount = {
      userId: `cust-${Date.now()}`,
      username: cleanUsername,
      password,
      email: cleanEmail,
      fullName: fullName || cleanUsername,
      companyName: companyName || 'Doanh Nghiệp Đối Tác B2B',
      customerId: customerCode,
      phone: phone || '0909 888 999',
      industry,
      role: 'SHIPPER',
      portalType: 'CUSTOMER',
      zone: 'B2B_EXTRANET',
      zoneLabel: 'Hệ Thống Khách Hàng & Chủ Hàng (Customer Portal)',
      status: 'ACTIVE',
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const updatedList = [newAccount, ...registeredUsers];
    setRegisteredUsers(updatedList);
    try {
      window.localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (_) {
      // ignore
    }

    const profile = buildCustomerProfile(newAccount);
    const sessionToken = `customer-jwt-${cleanUsername}`;
    setToken(sessionToken);
    setUser(profile);
    setAuthMode('CUSTOMER_B2B_REGISTERED');

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
      redirectTo: '/customer'
    };
  };

  const switchRoleQuick = async (roleKey) => {
    const roleConfig = ENTERPRISE_ROLES[roleKey] || ENTERPRISE_ROLES.ADMIN;
    return login(roleConfig.username, 'ccadro@123');
  };

  const logout = async () => {
    if (token && !token.startsWith('demo-') && !token.startsWith('customer-jwt-')) {
      try {
        await api.logout(token);
      } catch (_) {
        // ignore
      }
    }
    setToken(null);
    try {
      window.localStorage.removeItem('ccadro_token');
      window.localStorage.removeItem('ccadro_user');
    } catch (_) {
      // ignore storage errors
    }
  };

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authMode,
        login,
        registerUser,
        registeredUsers,
        logout,
        switchRoleQuick,
        hasPermission,
        getDefaultPortalPath,
        ENTERPRISE_ROLES
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
