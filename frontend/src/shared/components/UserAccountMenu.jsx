import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronDown,
  Globe,
  LayoutGrid,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Truck
} from 'lucide-react';
import { useAuth, getAccessibleWorkspaces } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AccountSettingsModal from './AccountSettingsModal';

const WORKSPACE_ICONS = {
  internal: LayoutGrid,
  shipper: Building2,
  customer: Globe,
  driver: Truck
};

function getUserInitials(user) {
  const source = (user?.fullName || user?.username || 'U').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

export default function UserAccountMenu({
  variant = 'portal',
  onDarkSurface = false,
  compact = false
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const containerRef = useRef(null);

  const workspaces = useMemo(() => getAccessibleWorkspaces(user), [user]);
  const initials = useMemo(() => getUserInitials(user), [user]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  if (!user) return null;

  const useDarkChrome = isDark || onDarkSurface;
  const triggerBg = onDarkSurface
    ? 'rgba(15, 23, 42, 0.58)'
    : isDark
      ? 'rgba(15, 23, 42, 0.78)'
      : '#f8fafc';
  const triggerBorder = onDarkSurface
    ? '1px solid rgba(255, 255, 255, 0.22)'
    : isDark
      ? '1px solid rgba(148, 163, 184, 0.24)'
      : '1px solid rgba(15, 23, 42, 0.12)';
  const triggerTextColor = onDarkSurface ? '#f8fafc' : isDark ? '#f8fafc' : '#0f172a';
  const menuBg = useDarkChrome ? '#0f172a' : '#ffffff';
  const menuSubtleBg = useDarkChrome ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc';
  const menuBorder = useDarkChrome
    ? '1px solid rgba(148, 163, 184, 0.22)'
    : '1px solid rgba(15, 23, 42, 0.1)';
  const menuText = useDarkChrome ? '#f8fafc' : '#0f172a';
  const menuMuted = useDarkChrome ? '#94a3b8' : '#64748b';

  const handleSelectWorkspace = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    setSettingsOpen(false);
    if (logout) {
      await logout();
    }
    navigate('/');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Production Avatar Trigger */}
      <button
        type="button"
        data-testid="user-avatar-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Menu tài khoản ${user.fullName || user.username}`}
        onClick={() => setMenuOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          padding: variant === 'navbar' ? '4px 10px 4px 4px' : '4px 10px 4px 5px',
          borderRadius: 999,
          border: menuOpen ? '1px solid #10b981' : triggerBorder,
          background: triggerBg,
          color: triggerTextColor,
          backdropFilter: onDarkSurface ? 'blur(12px)' : undefined,
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          flexShrink: 0
        }}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.03em',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
            }}
          >
            {initials}
          </span>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -1,
              bottom: -1,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#22c55e',
              border: `2px solid ${useDarkChrome ? '#0f172a' : '#ffffff'}`
            }}
          />
        </span>

        {!compact && (
          <span style={{ textAlign: 'left', lineHeight: 1.15, maxWidth: 138 }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user.username}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.62rem',
                fontWeight: 800,
                color: '#10b981',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user.role}
              {user.assignedHubCode ? ` • ${user.assignedHubCode.replace('HUB-', '')}` : ''}
            </span>
          </span>
        )}

        <ChevronDown
          size={14}
          style={{
            opacity: 0.72,
            transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease'
          }}
        />
      </button>

      {/* Dropdown Option Menu: Workspace Switcher + Settings + Logout */}
      {menuOpen && (
        <div
          role="menu"
          data-testid="user-account-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 316,
            maxWidth: 'calc(100vw - 24px)',
            borderRadius: 16,
            background: menuBg,
            border: menuBorder,
            boxShadow: '0 22px 48px -12px rgba(2, 6, 23, 0.45)',
            zIndex: 250,
            overflow: 'hidden',
            color: menuText
          }}
        >
          {/* Identity Summary Header */}
          <div
            style={{
              padding: '14px 16px',
              background: menuSubtleBg,
              borderBottom: menuBorder,
              display: 'flex',
              alignItems: 'center',
              gap: 11
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {user.fullName || user.username}
              </div>
              <div
                style={{
                  fontSize: '0.71rem',
                  color: menuMuted,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                @{user.username} {user.email ? `• ${user.email}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#10b981'
                  }}
                >
                  {user.role}
                </span>
                {user.assignedHubCode && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'rgba(2, 132, 199, 0.16)',
                      color: '#0284c7'
                    }}
                  >
                    {user.assignedHubCode}
                  </span>
                )}
                {user.assignedShipperCode && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'rgba(139, 92, 246, 0.16)',
                      color: '#7c3aed'
                    }}
                  >
                    {user.assignedShipperCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* System / Authorized Portal */}
          <div style={{ padding: '10px 10px 6px' }}>
            <div
              style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                letterSpacing: '0.07em',
                color: menuMuted,
                padding: '0 8px 6px',
                textTransform: 'uppercase'
              }}
            >
              Cổng Truy Cập Được Phân Quyền
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {workspaces.map((ws) => {
                const Icon = WORKSPACE_ICONS[ws.id] || LayoutGrid;
                const isCurrent = location.pathname === ws.path;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    role="menuitem"
                    data-testid={`switch-system-${ws.id}`}
                    onClick={() => handleSelectWorkspace(ws.path)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: isCurrent
                        ? '1px solid rgba(16, 185, 129, 0.45)'
                        : '1px solid transparent',
                      background: isCurrent ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      color: menuText,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: isCurrent
                          ? 'rgba(16, 185, 129, 0.2)'
                          : menuSubtleBg,
                        color: isCurrent ? '#10b981' : menuMuted,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: isCurrent ? '#10b981' : menuText
                        }}
                      >
                        {ws.name}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.67rem',
                          color: menuMuted,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {ws.subtitle}
                      </span>
                    </span>
                    {isCurrent && <Check size={14} color="#10b981" />}
                  </button>
                );
              })}

              {user.role === 'ADMIN' && (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="btn-menu-admin-users"
                  onClick={() => handleSelectWorkspace('/admin/users')}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 10,
                    border:
                      location.pathname === '/admin/users' || location.pathname === '/governance'
                        ? '1px solid rgba(56, 189, 248, 0.45)'
                        : '1px solid transparent',
                    background:
                      location.pathname === '/admin/users' || location.pathname === '/governance'
                        ? 'rgba(56, 189, 248, 0.12)'
                        : 'transparent',
                    color: '#38bdf8',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Quản Lý User &amp; Công Ty (/admin/users)</span>
                </button>
              )}

              {location.pathname !== '/' && (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="switch-system-landing"
                  onClick={() => handleSelectWorkspace('/')}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 10,
                    border: '1px solid transparent',
                    background: 'transparent',
                    color: menuMuted,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <Globe size={14} />
                  <span>Trang Chủ Giới Thiệu &amp; Tra Cứu CCADRO</span>
                </button>
              )}
            </div>
          </div>

          {/* Settings & Session Actions */}
          <div style={{ borderTop: menuBorder, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              role="menuitem"
              data-testid="btn-menu-theme-toggle"
              onClick={toggleTheme}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: menuText,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#64748b" />}
                <span>Giao diện {isDark ? 'Tối (Dark)' : 'Sáng (Light)'}</span>
              </span>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: menuSubtleBg,
                  color: menuMuted
                }}
              >
                Chuyển đổi
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              data-testid="btn-open-account-settings"
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: menuText,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 9
              }}
            >
              <Settings size={15} color="#10b981" />
              <span>Cài Đặt Tài Khoản &amp; Bảo Mật</span>
            </button>

            <button
              type="button"
              role="menuitem"
              data-testid="btn-menu-logout"
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 10,
                border: 'none',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                marginTop: 2
              }}
            >
              <LogOut size={15} />
              <span>Đăng Xuất Hệ Thống</span>
            </button>
          </div>
        </div>
      )}

      {/* Account & Security Settings Modal */}
      <AccountSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDarkSurface={onDarkSurface}
      />
    </div>
  );
}

