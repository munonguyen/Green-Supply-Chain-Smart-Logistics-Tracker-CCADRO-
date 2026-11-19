import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldAlert, Lock } from 'lucide-react';
import { useAuth, getDefaultPortalPath } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CcadroLogo from './CcadroLogo';

/**
 * Cảnh báo 404 Xác thực Phân hệ khi tài khoản của một hệ thống (vd: ADMIN)
 * truy cập trái phân vùng URL/API thuộc hệ thống của Role khác (vd: /driver, /customer, /shipper).
 * Không tự động chuyển hướng ngược về cổng cũ mà yêu cầu xác thực rõ ràng.
 */
export default function RoleIsolation404Page({ allowedRoles = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const fallbackPath = getDefaultPortalPath(user);

  const handleLogoutAndRelogin = async () => {
    setSigningOut(true);
    try {
      if (logout) {
        await logout();
      }
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div
      data-testid="role-isolation-404"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: isDark
          ? 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.14) 0%, #070a13 55%, #030712 100%)'
          : 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.1) 0%, #f8fafc 60%, #f1f5f9 100%)',
        color: isDark ? '#f8fafc' : '#0f172a'
      }}
    >
      <div
        className="card glass-card-interactive"
        style={{
          width: '100%',
          maxWidth: 580,
          padding: '30px 26px',
          borderRadius: 20,
          border: '1px solid rgba(239, 68, 68, 0.42)',
          boxShadow: isDark
            ? '0 24px 60px rgba(0, 0, 0, 0.55)'
            : '0 20px 44px rgba(15, 23, 42, 0.08)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <CcadroLogo size={36} />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', letterSpacing: '0.07em' }}>
                CCADRO IAM • SECURITY GATEWAY
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, opacity: 0.85 }}>
                Kiểm Soát Truy Cập Phân Hệ Theo Vai Trò
              </div>
            </div>
          </div>

          <span
            className="badge badge-red"
            style={{ fontSize: '0.78rem', fontWeight: 800, padding: '6px 12px' }}
          >
            <Lock size={14} /> HTTP 404 • AUTH ERROR
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            padding: '16px 18px',
            borderRadius: 14,
            background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.07)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: 18
          }}
        >
          <ShieldAlert size={28} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h1 style={{ fontSize: '1.28rem', fontWeight: 900, margin: '0 0 6px', color: '#ef4444' }}>
              404 — Không Tìm Thấy Phiên Xác Thực Phù Hợp
            </h1>
            <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.55, opacity: 0.92 }}>
              Bạn đang đăng nhập bằng tài khoản <code>@{user?.username || 'unknown'}</code> (vai trò{' '}
              <strong>{user?.role || 'UNKNOWN'}</strong>) nên không có quyền xác thực để truy cập phân hệ{' '}
              <code>{location.pathname}</code>.
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: isDark ? 'rgba(15, 23, 42, 0.72)' : '#f8fafc',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(15, 23, 42, 0.08)',
            fontSize: '0.82rem',
            display: 'grid',
            gap: 8,
            marginBottom: 22
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ opacity: 0.72 }}>Đường dẫn yêu cầu:</span>
            <code>{location.pathname}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ opacity: 0.72 }}>Vai trò được phép truy cập:</span>
            <strong style={{ color: '#10b981' }}>
              {Array.isArray(allowedRoles) && allowedRoles.length > 0 ? allowedRoles.join(', ') : 'ROLE_SPECIFIC'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ opacity: 0.72 }}>Phiên đang giữ hiện tại:</span>
            <span>
              <code>@{user?.username}</code> ({user?.role})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            data-testid="btn-404-logout-relogin"
            disabled={signingOut}
            onClick={handleLogoutAndRelogin}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 18px', fontSize: '0.9rem' }}
          >
            <LogOut size={16} />
            <span>
              {signingOut
                ? 'Đang đưa Token vào Blacklist...'
                : 'Đăng Xuất (Blacklist Token Cũ) & Đăng Nhập Tài Khoản Khác'}
            </span>
          </button>

          <button
            type="button"
            data-testid="btn-404-back-own-portal"
            onClick={() => navigate(fallbackPath)}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '11px 18px', fontSize: '0.86rem' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại hệ thống của tôi ({fallbackPath})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
