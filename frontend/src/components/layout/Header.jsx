import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Cpu,
  Bell,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Zap,
  Megaphone,
  User,
  Sun,
  Moon
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BroadcastEmergencyModal from '../notifications/BroadcastEmergencyModal';

const INITIAL_DEMO_NOTIFICATIONS = [
  {
    id: 'f0000000-0000-0000-0000-000000000010',
    notificationCode: 'NOTIF-RED-DEV-001',
    eventType: 'DEVIATION_RED',
    severity: 'CRITICAL',
    sourceService: 'tracking-service',
    tripId: 'd0000000-0000-0000-0000-000000000001',
    title: '[BÁO ĐỘNG ĐỎ UC09] Xe V001 lệch hành lang 300m (> 200m)',
    message:
      'Phát hiện 3 điểm GPS hợp lệ liên tiếp vượt ngưỡng 200m trên tuyến Võ Chí Công -> VSIP 1. Đã kích hoạt đề xuất đổi tuyến động (UC10).',
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
    title: '[SỰ CỐ KHẨN CẤP UC16] Phong tỏa làn container Vành Đai 2',
    message:
      'Tài xế Nguyễn Văn An báo cáo tai nạn liên hoàn tại cầu Phú Hữu. Chờ Điều phối viên phê duyệt phương án đổi lộ trình.',
    latitude: 10.82,
    longitude: 106.76,
    status: 'UNREAD'
  }
];

export default function Header({ title = 'CCADRO Operations Console' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [openPanel, setOpenPanel] = useState(false);
  const [openBroadcastModal, setOpenBroadcastModal] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_DEMO_NOTIFICATIONS);

  useEffect(() => {
    let isMounted = true;
    api
      .getNotifications()
      .then((res) => {
        const list = res?.result || (Array.isArray(res) ? res : null);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setNotifications(list);
        }
      })
      .catch(() => {
        // Giữ dữ liệu demo mặc định khi chạy độc lập
      });

    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      const streamUrl =
        (import.meta.env.VITE_API_URL || 'http://localhost:8888') + '/api/v1/notifications/stream';
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
    api.acknowledgeNotification(id).catch(() => {});
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
    api.dispatchEmergencyNotification(newAlert).catch(() => {});
  };

  return (
    <header className="topbar" style={{ position: 'relative' }}>
      <div className="topbar-title">{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: user.bgDim || 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${user.color || '#10b981'}`,
              color: user.color || '#34d399',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <User size={13} />
            <span>
              {user.role} • @{user.username}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpenBroadcastModal(true)}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Megaphone size={13} />
          <span>Phát Cảnh Báo</span>
        </button>

        <div className="badge badge-green">
          <span className="radar-dot" style={{ marginRight: '4px' }}></span>
          <ShieldCheck size={14} />
          <span>Vận Hành: Trực Tuyến</span>
        </div>
        <div className="badge badge-blue">
          <span
            className="radar-dot"
            style={{ backgroundColor: '#38bdf8', marginRight: '4px' }}
          ></span>
          <Cpu size={14} />
          <span>Giám Sát Không Gian</span>
        </div>

        {/* Theme Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
          <span>{isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
        </motion.button>

        {/* Emergency Notification Bell (Bookteria Notification Service :8087 + Kafka) */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => setOpenPanel(!openPanel)}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: unreadCount > 0 ? 'rgba(239, 68, 68, 0.16)' : 'rgba(30, 41, 59, 0.9)',
            border: unreadCount > 0 ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid #334155',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          {unreadCount > 0 && (
            <span className="radar-dot radar-dot-red" style={{ marginRight: '2px' }}></span>
          )}
          <Bell size={15} color={unreadCount > 0 ? '#f87171' : '#94a3b8'} />
          <span>Khẩn Cấp ({unreadCount})</span>
        </motion.button>

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
                width: '410px',
                maxHeight: '480px',
                overflowY: 'auto',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.65)',
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
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertTriangle size={16} color="#ef4444" />
                  <span>Trung Tâm Điều Phối & Cảnh Báo Khẩn Cấp</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setOpenBroadcastModal(true)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
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
                      background: 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid #a855f7',
                      color: '#e9d5ff',
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
                          ? 'rgba(15, 23, 42, 0.6)'
                          : 'rgba(239, 68, 68, 0.1)',
                      border:
                        n.status === 'ACKNOWLEDGED'
                          ? '1px solid #1e293b'
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
                            color: n.severity === 'CRITICAL' ? '#f87171' : '#fbbf24'
                          }}
                        >
                          {n.severity}
                        </span>
                        {n.broadcastType === 'MANUAL_BROADCAST' ? (
                          <span
                            style={{
                              background: 'rgba(234, 88, 12, 0.2)',
                              border: '1px solid #ea580c',
                              color: '#fdba74',
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
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid #3b82f6',
                              color: '#93c5fd',
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
                          color: n.status === 'ACKNOWLEDGED' ? '#10b981' : '#fca5a5',
                          fontWeight: 600
                        }}
                      >
                        {n.status === 'ACKNOWLEDGED' ? '✓ ĐÃ TIẾP NHẬN' : '● CHỜ TIẾP NHẬN'}
                      </span>
                    </div>

                    {n.targetAudience && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                        👥 Đối tượng:{' '}
                        <strong style={{ color: '#e2e8f0' }}>{n.targetAudience}</strong>
                        {n.targetCorridor && (
                          <span>
                            {' '}
                            • Tuyến:{' '}
                            <strong style={{ color: '#cbd5e1' }}>{n.targetCorridor}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        color: '#fff',
                        marginBottom: '4px'
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#94a3b8',
                        marginBottom: '6px',
                        lineHeight: 1.4
                      }}
                    >
                      {n.message}
                    </div>

                    {n.actionDirective && (
                      <div
                        style={{
                          background: 'rgba(234, 179, 8, 0.1)',
                          border: '1px solid rgba(234, 179, 8, 0.35)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          fontSize: '0.76rem',
                          color: '#fef08a',
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
                            background: 'rgba(16, 185, 129, 0.18)',
                            border: '1px solid #10b981',
                            color: '#34d399',
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
    </header>
  );
}
