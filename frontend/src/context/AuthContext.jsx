import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export const ENTERPRISE_ROLES = {
  ADMIN: {
    role: 'ADMIN',
    username: 'admin',
    fullName: 'Quản Trị Viên Toàn Hệ Thống',
    department: 'Ban Quản Trị Hạ Tầng & Bảo Mật IAM',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Mạng Nội Bộ Vận Hành (Internal Core)',
    color: '#a855f7',
    bgDim: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.45)',
    description:
      'Toàn quyền cấu hình hệ thống, cấp phát tài khoản nội bộ & đối tác B2B, giám sát kiến trúc 8 Microservices.',
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
    username: 'dispatcher',
    fullName: 'Điều Phối Viên Trung Tâm (NOC)',
    department: 'Trung Tâm Điều Hành Vận Tải Xanh',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Mạng Nội Bộ Vận Hành (Internal Core)',
    color: '#38bdf8',
    bgDim: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.45)',
    description:
      'Lập lộ trình đa tiêu chí (UC05), phát lệnh điều xe Saga (UC06), theo dõi GPS (UC09) & duyệt đổi tuyến động (UC10).',
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
    username: 'safety',
    fullName: 'Trưởng Ban An Toàn Đội Xe',
    department: 'Phòng Thanh Tra Kỹ Thuật & An Toàn',
    zone: 'INTERNAL_CORE',
    zoneLabel: 'Mạng Nội Bộ Vận Hành (Internal Core)',
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
    username: 'auditor',
    fullName: 'Kiểm Toán Viên Độc Lập GLEC v3',
    department: 'Tổ Chức Chứng Nhận Phát Thải Xanh',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Cổng Kiểm Toán Độc Lập (B2B Extranet)',
    color: '#eab308',
    bgDim: 'rgba(234, 179, 8, 0.16)',
    border: 'rgba(234, 179, 8, 0.45)',
    description:
      'Truy cập chỉ đọc (Read-only): Kiểm toán phát thải WTW/TTW/WTT (UC12), đối sánh hành lang (UC13) & xác thực báo cáo SHA-256 (UC14).',
    permissions: ['CARBON_READ', 'BENCHMARK_READ', 'REPORT_EXPORT', 'SHIPMENT_READ']
  },
  SHIPPER: {
    role: 'SHIPPER',
    username: 'shipper',
    fullName: 'Đại Diện Chủ Hàng (VINAMILK)',
    department: 'Đối Tác Thuê Vận Chuyển B2B',
    customerId: 'VINAMILK',
    zone: 'B2B_EXTRANET',
    zoneLabel: 'Cổng Khách Hàng Doanh Nghiệp (B2B Portal)',
    color: '#ec4899',
    bgDim: 'rgba(236, 72, 153, 0.16)',
    border: 'rgba(236, 72, 153, 0.45)',
    description:
      'Khởi tạo đơn hàng vận tải (UC04), theo dõi tiến độ đơn hàng của riêng doanh nghiệp mình (Cô lập dữ liệu BRULE-16) & nhận chứng từ ePOD.',
    permissions: ['SHIPMENT_CREATE', 'SHIPMENT_READ_OWN', 'POD_VIEW_OWN', 'CARBON_READ']
  }
};

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

function buildUserProfileFromUsername(username, jwtPayload = null) {
  const normalized = (username || 'admin').toLowerCase().trim();
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
  const [user, setUser] = useState(() => {
    try {
      const saved = window.localStorage.getItem('ccadro_user');
      if (saved) return JSON.parse(saved);
    } catch (_) {
      // ignore
    }
    return buildUserProfileFromUsername('admin');
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
    // Tự động lấy JWT thực tế cho phiên mặc định nếu chưa có token
    if (!token && currentUsername) {
      api
        .login(currentUsername, 'ccadro@123')
        .then((res) => {
          const jwt = res?.result?.token;
          if (jwt) {
            const payload = decodeJwtPayload(jwt);
            const enriched = buildUserProfileFromUsername(currentUsername, payload);
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
  }, [token, currentUsername]);

  const login = async (username, password) => {
    try {
      const res = await api.login(username, password);
      const jwt = res?.result?.token;
      if (jwt) {
        const payload = decodeJwtPayload(jwt);
        const profile = buildUserProfileFromUsername(username, payload);
        setToken(jwt);
        setUser(profile);
        setAuthMode('LIVE_JWT_HS512');
        try {
          window.localStorage.setItem('ccadro_token', jwt);
          window.localStorage.setItem('ccadro_user', JSON.stringify(profile));
        } catch (_) {
          // ignore storage errors
        }
        return { success: true, user: profile, token: jwt };
      }
      throw new Error('Không nhận được JWT token từ Identity Service');
    } catch (err) {
      // Nếu đúng mật khẩu mặc định ccadro@123 của tài khoản nội bộ nhưng service đang khởi động
      const knownAccount = Object.values(ENTERPRISE_ROLES).find(
        (r) => r.username === username.toLowerCase().trim()
      );
      if (knownAccount && password === 'ccadro@123') {
        const profile = buildUserProfileFromUsername(username);
        setUser(profile);
        setAuthMode('FALLBACK_SESSION');
        try {
          window.localStorage.setItem('ccadro_user', JSON.stringify(profile));
        } catch (_) {
          // ignore storage errors
        }
        return { success: true, user: profile, token: 'demo-fallback-jwt' };
      }
      throw err;
    }
  };

  const switchRoleQuick = async (roleKey) => {
    const roleConfig = ENTERPRISE_ROLES[roleKey] || ENTERPRISE_ROLES.ADMIN;
    return login(roleConfig.username, 'ccadro@123');
  };

  const logout = async () => {
    if (token && token !== 'demo-fallback-jwt') {
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
        logout,
        switchRoleQuick,
        hasPermission,
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
