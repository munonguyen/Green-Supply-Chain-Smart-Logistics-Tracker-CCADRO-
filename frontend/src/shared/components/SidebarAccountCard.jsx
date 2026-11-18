import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AccountSettingsModal from './AccountSettingsModal';

function getInitials(user) {
  const source = (user?.fullName || user?.username || 'U').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] || 'U').slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

/**
 * Thẻ thông tin tài khoản thống nhất (kèm nút Cài đặt & Đăng xuất) dùng cho mọi role ở Sidebar hoặc Header.
 */
export default function SidebarAccountCard({
  collapsed = false,
  variant = 'sidebar', // 'sidebar' | 'header-pill'
  subtitle = null,
  onAfterLogout = null
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!user) return null;

  const initials = getInitials(user);
  const roleColor = user.color || '#10b981';
  const cardBg = isDark ? 'rgba(15, 23, 42, 0.72)' : '#f8fafc';
  const cardBorder = isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(15, 23, 42, 0.1)';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  const handleLogout = async () => {
    if (onAfterLogout) {
      await onAfterLogout();
      return;
    }
    if (logout) await logout();
    navigate('/login');
  };

  if (variant === 'header-pill') {
    return (
      <>
        <div
          data-testid="account-info-card"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 6px 4px 10px',
            borderRadius: 999,
            background: cardBg,
            border: `1px solid ${cardBorder}`
          }}
        >
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Mở cài đặt tài khoản"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              color: textMain
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #0284c7)',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {initials}
            </span>
            <span style={{ lineHeight: 1.2 }}>
              <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800 }}>
                {user.fullName || user.username}
              </span>
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>
                {subtitle || `@${user.username} • ${user.role}`}
              </span>
            </span>
          </button>

          <button
            type="button"
            data-testid="sidebar-account-settings"
            aria-label="Cài đặt tài khoản"
            title="Cài đặt tài khoản & hệ thống"
            onClick={() => setSettingsOpen(true)}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: `1px solid ${cardBorder}`,
              background: isDark ? 'rgba(30, 41, 59, 0.8)' : '#ffffff',
              color: textMain,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Settings size={14} />
          </button>

          <button
            type="button"
            data-testid="sidebar-account-logout"
            aria-label="Đăng xuất tài khoản"
            title="Đăng xuất"
            onClick={handleLogout}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} />
          </button>
        </div>

        <AccountSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div
        data-testid="account-info-card"
        style={{
          padding: collapsed ? '10px 8px' : '10px',
          borderTop: `1px solid ${cardBorder}`,
          flexShrink: 0
        }}
      >
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title={`${user.fullName || user.username} (@${user.username})`}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #0284c7)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {initials}
            </button>
            <button
              type="button"
              data-testid="sidebar-account-settings"
              aria-label="Cài đặt tài khoản"
              title="Cài đặt tài khoản"
              onClick={() => setSettingsOpen(true)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textMain,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              data-testid="sidebar-account-logout"
              aria-label="Đăng xuất tài khoản"
              title="Đăng xuất"
              onClick={handleLogout}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '9px 10px',
              borderRadius: 13,
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              boxSizing: 'border-box'
            }}
          >
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Xem hồ sơ & cài đặt tài khoản"
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                textAlign: 'left',
                color: textMain
              }}
            >
              <span style={{ position: 'relative', flexShrink: 0 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #0284c7)',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {initials}
                </span>
                <span
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: '#10b981',
                    border: `2px solid ${isDark ? '#0f172a' : '#ffffff'}`
                  }}
                />
              </span>

              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: textMain,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user.fullName || user.username}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 1,
                    fontSize: '0.67rem',
                    color: textMuted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <span style={{ fontWeight: 700, color: roleColor }}>{user.role}</span>
                  <span>• @{user.username}</span>
                </span>
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <button
                type="button"
                data-testid="sidebar-account-settings"
                aria-label="Cài đặt tài khoản"
                title="Cài đặt tài khoản & hệ thống"
                onClick={() => setSettingsOpen(true)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: isDark ? 'rgba(30, 41, 59, 0.85)' : '#ffffff',
                  color: textMain,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Settings size={14} />
              </button>

              <button
                type="button"
                data-testid="sidebar-account-logout"
                aria-label="Đăng xuất tài khoản"
                title="Đăng xuất"
                onClick={handleLogout}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AccountSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

