import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Cpu,
  Bell,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Search,
  Zap,
  Megaphone,
  Sun,
  Moon,
  Settings,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { api, gatewayUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import UserAccountMenu from '../components/account/UserAccountMenu';
import AccountSettingsModal from '../components/account/AccountSettingsModal';
import CommandFinder from '../components/search/CommandFinder';
import BroadcastEmergencyModal from '../notifications/BroadcastEmergencyModal';
import MessengerWorkspaceModal from '../chat/MessengerWorkspaceModal';
import { getRoleHeaderMeta } from '../../utils/userSettings';
import {
  getUnreadCountForViewer,
  loadChatThreadsMap,
  subscribeDriverChat
} from '../../utils/driverChatSync';
import {
  getNotificationsForViewer,
  loadStoredRoleNotifications,
  mergeIncomingBackendNotifications,
  publishCrossRoleNotification,
  subscribeRoleNotifications
} from '../../utils/roleNotificationSync';

const INITIAL_DEMO_NOTIFICATIONS = [
  {
    id: 'f0000000-0000-0000-0000-000000000010',
    notificationCode: 'NOTIF-RED-DEV-001',
    eventType: 'DEVIATION_RED',
    severity: 'CRITICAL',
    sourceService: 'tracking-service',
    tripId: 'd0000000-0000-0000-0000-000000000001',
    title: '[CẢNH BÁO NGUY CẤP] Xe V001 lệch hành lang 300m (> 200m)',
    message:
      'Phát hiện 3 điểm GPS hợp lệ liên tiếp vượt ngưỡng an toàn trên tuyến Võ Chí Công -> VSIP 1. Đã kích hoạt đề xuất đổi tuyến đường tránh sự cố.',
    latitude: 10.8525,
    longitude: 106.743,
    status: 'UNREAD'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000011',
    notificationCode: 'NOTIF-INC-CRIT-002',
    eventType: 'INCIDENT_CRITICAL',
    severity: 'HIGH',
    sourceService: 'incident-service',
    tripId: 'd0000000-0000-0000-0000-000000000001',
    title: '[SỰ CỐ KHẨN CẤP] Phong tỏa làn container Vành Đai 2',
    message:
      'Tài xế Nguyễn Văn An báo cáo tai nạn liên hoàn tại cầu Phú Hữu. Chờ Điều phối viên phê duyệt phương án đổi lộ trình.',
    latitude: 10.82,
    longitude: 106.76,
    status: 'UNREAD'
  }
];

export default function Header({
  title = 'Hệ Thống Điều Hành Logistics Xanh CCADRO',
  sidebarCollapsed = false,
  onToggleSidebar
}) {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const { toggleTheme, isDark } = useTheme();
  const [openPanel, setOpenPanel] = useState(false);
  const [openBroadcastModal, setOpenBroadcastModal] = useState(false);
  const [openMessenger, setOpenMessenger] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openFinder, setOpenFinder] = useState(false);
  const [messengerThreads, setMessengerThreads] = useState(() => loadChatThreadsMap());
  const [notifications, setNotifications] = useState(INITIAL_DEMO_NOTIFICATIONS);
  const roleMeta = getRoleHeaderMeta(user?.role || 'ADMIN');

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpenFinder((prev) => !prev);
        return;
      }
      const tag = event.target?.closest?.('input, textarea, select, [contenteditable]');
      if (!tag && !event.metaKey && !event.ctrlKey && !event.altKey && event.key === '/') {
        event.preventDefault();
        setOpenFinder(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const sync = () => setMessengerThreads(loadChatThreadsMap());
    return subscribeDriverChat(sync);
  }, []);

  const unreadMessengerCount = getUnreadCountForViewer(
    messengerThreads,
    user?.role || 'ADMIN'
  );

  useEffect(() => {
    const syncRoleNotifs = () => {
      const busItems = getNotificationsForViewer(user, loadStoredRoleNotifications());
      setNotifications((prev) => {
        const byId = new Map();
        [...busItems, ...prev].forEach((n) => {
          if (n?.id && !byId.has(n.id)) byId.set(n.id, n);
        });
        return Array.from(byId.values());
      });
    };
    syncRoleNotifs();
    return subscribeRoleNotifications(syncRoleNotifs);
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    api
      .getNotifications()
      .then((res) => {
        const list = res?.result || (Array.isArray(res) ? res : null);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          mergeIncomingBackendNotifications(list);
          setNotifications(list);
        }
      })
      .catch(() => {
        // Giữ dữ liệu demo mặc định khi chạy độc lập
      });

    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      const baseStreamUrl =
        gatewayUrl('/api/v1/notifications/stream');
      const jwtToken =
        window.localStorage.getItem('ccadro_token') ||
        window.localStorage.getItem('ccadro_access_token_v1') ||
        window.sessionStorage.getItem('ccadro_access_token_v1');
      const streamUrl = jwtToken
        ? `${baseStreamUrl}?token=${encodeURIComponent(jwtToken)}`
        : baseStreamUrl;
      let es;
      try {
        es = new window.EventSource(streamUrl);
        es.addEventListener('emergency-alert', (e) => {
          try {
            const incoming = JSON.parse(e.data);
            setNotifications((prev) => [incoming, ...prev.filter((n) => n.id !== incoming.id)]);
          } catch (_) {
            // ignore parse error
          }
        });
        es.addEventListener('emergency-acknowledged', (e) => {
          try {
            const updated = JSON.parse(e.data);
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          } catch (_) {
            // ignore parse error
          }
        });
      } catch (_) {
        // ignore EventSource connection error in offline mode
      }
      return () => {
        isMounted = false;
        if (es) es.close();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.status !== 'ACKNOWLEDGED').length;
  const prevUnreadRef = useRef(unreadCount);
  const [bellPulseKey, setBellPulseKey] = useState(0);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBellPulseKey((k) => k + 1);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const handleFlyToIncident = (notif) => {
    setOpenPanel(false);
    const tripId = notif.tripId || 'd0000000-0000-0000-0000-000000000001';
    const lat = notif.latitude ?? 10.8525;
    const lon = notif.longitude ?? 106.743;
    navigate(
      `/trips/${tripId}/tracking?focusLat=${lat}&focusLon=${lon}&incident=${encodeURIComponent(notif.title)}`
    );
  };

  const handleAcknowledge = (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: 'ACKNOWLEDGED', acknowledgedBy: 'DISPATCHER_ADMIN' } : n
      )
    );
    api.acknowledgeNotification(id).catch(() => { });
  };

  const handleSimulateKafkaEmergency = () => {
    const newAlert = {
      id: 'sim-' + Date.now(),
      notificationCode: 'NOTIF-KAFKA-' + Date.now(),
      eventType: 'INCIDENT_CRITICAL',
      severity: 'CRITICAL',
      sourceService: 'Trung Tâm Điều Phối Tuyến',
      tripId: 'd0000000-0000-0000-0000-000000000001',
      title: '[CẢNH BÁO KHẨN CẤP P0] Cảnh báo sự cố kỹ thuật trên Quốc lộ 13',
      message:
        'Xe V001 (51C-888.99) báo sự cố hỏng hệ thống làm mát container tại trạm thu phí Vĩnh Phú. Yêu cầu hỗ trợ khẩn cấp!',
      latitude: 10.88,
      longitude: 106.72,
      status: 'UNREAD'
    };
    setNotifications((prev) => [newAlert, ...prev]);
    publishCrossRoleNotification({
      eventType: newAlert.eventType,
      severity: newAlert.severity,
      senderRole: 'OPERATOR',
      senderName: newAlert.sourceService,
      targetRoles: ['ADMIN', 'OPERATOR', 'DRIVER'],
      tripId: newAlert.tripId,
      title: newAlert.title,
      message: newAlert.message,
      latitude: newAlert.latitude,
      longitude: newAlert.longitude
    });
    api.dispatchEmergencyNotification(newAlert).catch(() => { });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className="topbar-sidebar-btn"
            onClick={onToggleSidebar}
            title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
        <div className="topbar-title-group">
          <div className="topbar-eyebrow">
            <span style={{ color: roleMeta.accentColor }}>{roleMeta.badgeLabel}</span>
          </div>
          <h1 className="topbar-title" title={title}>
            {title}
          </h1>
        </div>
      </div>

      <div className="topbar-actions">
        <div
          className="topbar-status-pill"
          title={`${roleMeta.statusTitle} • ${roleMeta.statusSub}`}
        >
          <span className="radar-dot" aria-hidden="true"></span>
          <ShieldCheck size={14} />
          <span>{roleMeta.statusTitle}</span>
          <span className="topbar-status-sub">
            <Cpu size={13} />
            <span>{roleMeta.statusSub}</span>
          </span>
        </div>

        {roleMeta.canBroadcastAlert && (
          <button
            type="button"
            className="topbar-btn topbar-btn-alert"
            onClick={() => setOpenBroadcastModal(true)}
            title="Phát cảnh báo khẩn cấp tới đội xe & trung tâm điều phối"
          >
            <Megaphone size={14} />
            <span className="topbar-label topbar-label-compact">Phát Cảnh Báo</span>
          </button>
        )}

        {/* Command Finder Trigger (⌘K / /) */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          className="topbar-btn halvi-finder-trigger"
          onClick={() => setOpenFinder(true)}
          title="Tìm nhanh trang & thao tác (Ctrl+K / ⌘K)"
          aria-label="Tìm nhanh chức năng"
        >
          <Search size={14} />
          <kbd className="halvi-kbd">⌘K</kbd>
        </motion.button>

        {/* CCADRO Messenger Launcher */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          className="topbar-btn topbar-btn-messenger"
          onClick={() => setOpenMessenger(true)}
          title="Mở CCADRO Messenger (Chat đa người & nhóm)"
        >
          <MessageCircle size={15} />
          <span className="topbar-label">Messenger</span>
          {unreadMessengerCount > 0 && (
            <span className="topbar-count-pill">{unreadMessengerCount}</span>
          )}
        </motion.button>

        {/* Emergency Notification Bell (Bookteria Notification Service :8087 + Kafka) */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          className="topbar-btn"
          onClick={() => setOpenPanel(!openPanel)}
          title="Trung tâm thông báo & cảnh báo khẩn cấp"
          style={
            unreadCount > 0
              ? {
                  background: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: isDark ? '#fca5a5' : '#dc2626'
                }
              : undefined
          }
        >
          {unreadCount > 0 ? (
            <span className="radar-dot radar-dot-red" aria-hidden="true"></span>
          ) : null}
          <span key={`bell-${bellPulseKey}`} className={bellPulseKey > 0 ? 'halvi-bell-swing' : ''}>
            <Bell size={15} color={unreadCount > 0 ? '#ef4444' : 'var(--text-muted)'} />
          </span>
          <span className="topbar-label">{roleMeta.alertLabel}</span>
          <span
            key={`badge-${bellPulseKey}`}
            className={`topbar-count-pill${bellPulseKey > 0 ? ' halvi-badge-pop' : ''}`}
            style={
              unreadCount > 0
                ? undefined
                : {
                    background: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.1)',
                    color: 'var(--text-muted)'
                  }
            }
          >
            {unreadCount}
          </span>
        </motion.button>

        {/* Theme Toggle Icon Button */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          className="topbar-btn topbar-btn-icon"
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {isDark ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
        </motion.button>

        {/* First-login Temporary Password Reminder */}
        {user?.mustChangePassword && (
          <button
            type="button"
            onClick={() => setOpenSettings(true)}
            title="Tài khoản mới được cấp mật khẩu tạm — nhấp để đổi mật khẩu"
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid #f59e0b',
              background: 'rgba(245, 158, 11, 0.14)',
              color: '#f59e0b',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Cần đổi mật khẩu tạm
          </button>
        )}

        {/* Quick Settings Gear Trigger */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          data-testid="topbar-quick-settings"
          className="topbar-btn topbar-btn-icon"
          onClick={() => setOpenSettings(true)}
          title="Cài đặt tài khoản & nghiệp vụ theo vai trò"
          aria-label="Cài đặt tài khoản & nghiệp vụ"
        >
          <Settings size={16} color="var(--text-main)" />
        </motion.button>

        <span className="topbar-divider" aria-hidden="true" />

        <UserAccountMenu variant="portal" compact />

        <AnimatePresence>
          {openPanel && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '58px',
                right: '24px',
                width: 'min(410px, calc(100vw - 32px))',
                maxHeight: '480px',
                overflowY: 'auto',
                background: isDark ? '#0f172a' : '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.65)' : '0 20px 40px rgba(15,23,42,0.16)',
                padding: '14px',
                zIndex: 1000
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertTriangle size={16} color="#ef4444" />
                  <span>Trung Tâm Điều Phối & Cảnh Báo Khẩn Cấp</span>
                </div>
                {roleMeta.canBroadcastAlert && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setOpenBroadcastModal(true)}
                      style={{
                        background: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        color: isDark ? '#fca5a5' : '#dc2626',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Megaphone size={12} /> Phát Cảnh Báo
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulateKafkaEmergency}
                      style={{
                        background: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid #a855f7',
                        color: isDark ? '#e9d5ff' : '#7e22ce',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Zap size={12} /> Mô Phỏng Cảnh Báo Tuyến
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background:
                        n.status === 'ACKNOWLEDGED'
                          ? isDark
                            ? 'rgba(15, 23, 42, 0.6)'
                            : '#f8fafc'
                          : isDark
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(239, 68, 68, 0.06)',
                      border:
                        n.status === 'ACKNOWLEDGED'
                          ? '1px solid var(--border-color)'
                          : '1px solid rgba(239, 68, 68, 0.45)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: n.severity === 'CRITICAL' ? '#dc2626' : '#d97706'
                          }}
                        >
                          {n.severity}
                        </span>
                        {n.broadcastType === 'MANUAL_BROADCAST' ? (
                          <span
                            style={{
                              background: isDark ? 'rgba(234, 88, 12, 0.2)' : 'rgba(234, 88, 12, 0.1)',
                              border: '1px solid #ea580c',
                              color: isDark ? '#fdba74' : '#c2410c',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            📢 QUẢN LÝ PHÁT ({n.senderRole || 'SAFETY'})
                          </span>
                        ) : (
                          <span
                            style={{
                              background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid #3b82f6',
                              color: isDark ? '#93c5fd' : '#1d4ed8',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            ⚙️ TỰ ĐỘNG ({n.sourceService || 'GPS'})
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: n.status === 'ACKNOWLEDGED' ? '#059669' : '#dc2626',
                          fontWeight: 600
                        }}
                      >
                        {n.status === 'ACKNOWLEDGED' ? '✓ ĐÃ TIẾP NHẬN' : '● CHỜ TIẾP NHẬN'}
                      </span>
                    </div>

                    {n.targetAudience && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        👥 Đối tượng:{' '}
                        <strong style={{ color: 'var(--text-main)' }}>{n.targetAudience}</strong>
                        {n.targetCorridor && (
                          <span>
                            {' '}
                            • Tuyến:{' '}
                            <strong style={{ color: 'var(--text-main)' }}>{n.targetCorridor}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        marginBottom: '4px'
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        marginBottom: '6px',
                        lineHeight: 1.4
                      }}
                    >
                      {n.message}
                    </div>

                    {n.actionDirective && (
                      <div
                        style={{
                          background: isDark ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.14)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          fontSize: '0.76rem',
                          color: isDark ? '#fef08a' : '#92400e',
                          marginBottom: '8px',
                          lineHeight: 1.3
                        }}
                      >
                        <strong>⚡ Chỉ thị:</strong> {n.actionDirective}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleFlyToIncident(n)}
                        style={{
                          background: '#0284c7',
                          border: 'none',
                          color: '#fff',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <MapPin size={12} /> Zoom Tới Tọa Độ
                      </button>
                      {n.status !== 'ACKNOWLEDGED' && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(n.id)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid #10b981',
                            color: isDark ? '#34d399' : '#047857',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle2 size={12} /> Tiếp Nhận (ACK)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BroadcastEmergencyModal
        isOpen={openBroadcastModal}
        onClose={() => setOpenBroadcastModal(false)}
        onBroadcastSuccess={(newAlert) =>
          setNotifications((prev) => [newAlert, ...prev.filter((x) => x.id !== newAlert.id)])
        }
      />

      <MessengerWorkspaceModal
        isOpen={openMessenger}
        onClose={() => setOpenMessenger(false)}
        isDark={isDark}
      />

      <AccountSettingsModal
        isOpen={openSettings}
        onClose={() => setOpenSettings(false)}
      />

      <CommandFinder
        isOpen={openFinder}
        onClose={() => setOpenFinder(false)}
      />
    </header>
  );
}
