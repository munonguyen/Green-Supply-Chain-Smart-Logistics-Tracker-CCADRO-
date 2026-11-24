import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, Megaphone } from 'lucide-react';
import { api } from '../../services/api';
import {
  ROLE_SENDER_LABEL,
  connectRoleNotificationStream,
  getNotificationsForViewer,
  isNotificationUnreadForViewer,
  loadStoredRoleNotifications,
  markAllNotificationsReadForViewer,
  markNotificationReadForViewer,
  mergeIncomingBackendNotifications,
  subscribeRoleNotifications
} from '../../utils/roleNotificationSync';

function formatNotifClock(iso) {
  if (!iso) return '';
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

export default function RoleNotificationBell({
  user,
  isDark = false,
  compactLabel = 'Thông báo',
  panelTitle = 'Thông báo & Điều phối Thời gian thực'
}) {
  const [open, setOpen] = useState(false);
  const [allItems, setAllItems] = useState(() => loadStoredRoleNotifications());
  const wrapRef = useRef(null);

  useEffect(() => {
    const sync = () => setAllItems(loadStoredRoleNotifications());
    const unsubLocal = subscribeRoleNotifications(sync);

    const roleUpper = String(user?.role || '').toUpperCase();
    const canStreamGlobalAlerts =
      ['ADMIN', 'OPERATOR', 'DISPATCHER', 'SAFETY_MANAGER', 'DRIVER'].includes(roleUpper) &&
      !user?.assignedShipperCode;

    let unsubStream = () => {};
    if (canStreamGlobalAlerts) {
      api
        .getNotifications?.()
        .then((res) => {
          const list = res?.result || (Array.isArray(res) ? res : null);
          if (Array.isArray(list) && list.length > 0) {
            setAllItems(mergeIncomingBackendNotifications(list));
          }
        })
        .catch(() => {});

      unsubStream = connectRoleNotificationStream(() => {
        setAllItems(loadStoredRoleNotifications());
      });
    }

    return () => {
      unsubLocal();
      unsubStream();
    };
  }, [user?.assignedShipperCode, user?.role]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const visibleNotifications = useMemo(
    () => getNotificationsForViewer(user, allItems),
    [user, allItems]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => isNotificationUnreadForViewer(n, user)).length,
    [visibleNotifications, user]
  );

  const hasCriticalUnread = useMemo(
    () =>
      visibleNotifications.some(
        (n) =>
          isNotificationUnreadForViewer(n, user) &&
          (n.severity === 'CRITICAL' || n.severity === 'HIGH')
      ),
    [visibleNotifications, user]
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        data-testid="role-notification-bell"
        className="topbar-btn"
        onClick={() => setOpen((v) => !v)}
        title={panelTitle}
        aria-label={panelTitle}
        style={
          hasCriticalUnread
            ? {
                background: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.48)',
                color: isDark ? '#fca5a5' : '#dc2626'
              }
            : undefined
        }
      >
        <Bell
          size={15}
          color={hasCriticalUnread ? '#ef4444' : unreadCount > 0 ? '#10b981' : 'currentColor'}
        />
        {compactLabel && (
          <span className="topbar-label topbar-label-compact">{compactLabel}</span>
        )}
        {unreadCount > 0 && (
          <span
            className="topbar-count-pill"
            style={{
              background: hasCriticalUnread ? '#ef4444' : '#10b981',
              color: '#ffffff'
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label={panelTitle}
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            width: 'min(390px, calc(100vw - 28px))',
            maxHeight: 460,
            overflowY: 'auto',
            borderRadius: 14,
            padding: 14,
            background: isDark ? '#0b1915' : '#ffffff',
            border: isDark
              ? '1px solid rgba(16, 185, 129, 0.28)'
              : '1px solid rgba(15, 23, 42, 0.12)',
            boxShadow: isDark
              ? '0 22px 44px rgba(0, 0, 0, 0.65)'
              : '0 18px 38px rgba(15, 23, 42, 0.16)',
            zIndex: 1200,
            color: isDark ? '#f8fafc' : '#0f172a'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: isDark
                ? '1px solid rgba(148, 163, 184, 0.14)'
                : '1px solid rgba(15, 23, 42, 0.08)'
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>{panelTitle}</div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsReadForViewer(user)}
                style={{
                  border: 'none',
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#10b981',
                  padding: '4px 8px',
                  borderRadius: 7,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <CheckCheck size={12} /> Đã đọc tất cả
              </button>
            )}
          </div>

          {visibleNotifications.length === 0 ? (
            <div style={{ fontSize: '0.78rem', opacity: 0.72, padding: '14px 4px', textAlign: 'center' }}>
              Chưa có thông báo điều phối mới cho ca trực hiện tại.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {visibleNotifications.slice(0, 15).map((n) => {
                const unread = isNotificationUnreadForViewer(n, user);
                const isCrit = n.severity === 'CRITICAL' || n.severity === 'HIGH';
                const senderLabel =
                  n.senderName ||
                  ROLE_SENDER_LABEL[String(n.senderRole || '').toUpperCase()] ||
                  'Điều hành vận tải';
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: unread
                        ? isCrit
                          ? isDark
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(239, 68, 68, 0.06)'
                          : isDark
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'rgba(16, 185, 129, 0.06)'
                        : isDark
                          ? 'rgba(15, 23, 42, 0.55)'
                          : '#f8fafc',
                      border: unread
                        ? isCrit
                          ? '1px solid rgba(239, 68, 68, 0.42)'
                          : '1px solid rgba(16, 185, 129, 0.35)'
                        : isDark
                          ? '1px solid rgba(148, 163, 184, 0.14)'
                          : '1px solid rgba(15, 23, 42, 0.08)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 4,
                        fontSize: '0.68rem'
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 800,
                          color: isCrit ? '#ef4444' : '#10b981'
                        }}
                      >
                        {n.broadcastType === 'MANUAL_BROADCAST' ? (
                          <Megaphone size={12} />
                        ) : isCrit ? (
                          <AlertTriangle size={12} />
                        ) : (
                          <Info size={12} />
                        )}
                        {senderLabel}
                      </span>
                      <span style={{ opacity: 0.68 }}>{formatNotifClock(n.createdAt)}</span>
                    </div>

                    <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 3 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.84, lineHeight: 1.4 }}>
                      {n.message}
                    </div>

                    {n.actionDirective && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '5px 8px',
                          borderRadius: 7,
                          background: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          color: isDark ? '#fde68a' : '#92400e',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        Chỉ thị: {n.actionDirective}
                      </div>
                    )}

                    {unread && (
                      <div style={{ marginTop: 7, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => markNotificationReadForViewer(n.id, user)}
                          style={{
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            background: 'rgba(16, 185, 129, 0.14)',
                            color: '#10b981',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.69rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <CheckCircle2 size={11} /> Đã tiếp nhận
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
