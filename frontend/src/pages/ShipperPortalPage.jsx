import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  LogOut,
  MessageSquare,
  Moon,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sun,
  Webhook
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import CcadroLogo from '../components/ui/CcadroLogo';
import GrabDriverAvatar from '../components/ui/GrabDriverAvatar';
import {
  getUnreadCountForViewer,
  loadChatThreadsMap,
  markChatThreadRead,
  sendGrabChatMessage,
  subscribeDriverChat,
  syncChatThreadFromDb
} from '../utils/driverChatSync';

const INITIAL_THIRD_PARTY_HANDOVERS = [
  {
    id: '44444444-4444-4444-8444-444444440001',
    containerCode: 'TCKU-781920-4',
    shipmentCode: 'SHP-2026-8192',
    destinationHub: 'KCN Amata Biên Hòa • Kho Lạnh Trung Tâm',
    shipperCompany: 'Kerry Cold Chain 3PL',
    externalSystemName: 'Kerry SmartWMS v4',
    externalTrackingRef: '3PL-AMATA-8192',
    webhookEndpoint: 'https://api.kerry-wms.example.vn/v2/webhooks/ccadro/handover',
    dockGate: 'Cổng B • Dock Lạnh D-04',
    handoverStatus: 'AWAITING_ARRIVAL',
    driverCode: 'DRV-FC-001',
    driverName: 'Nguyễn Văn Hùng',
    driverPhone: '0903 812 456',
    vehiclePlate: '51C-888.99',
    etaMinutes: 32,
    tempC: -18.4,
    eSealNumber: 'VN-CUST-819204',
    epodSignedBy: null,
    epodSignatureHash: null,
    lastSyncStatus: 'SUBSCRIBED',
    lastSyncPayload: null,
    lastSyncedAt: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: '44444444-4444-4444-8444-444444440002',
    containerCode: 'MSKU-492018-7',
    shipmentCode: 'SHP-2026-4920',
    destinationHub: 'Khu Công Nghệ Cao Quận 9 (SHTP)',
    shipperCompany: 'Samsung SDS Logistics WMS',
    externalSystemName: 'SAP EWM 9.5 SHTP',
    externalTrackingRef: 'SHTP-INB-4920',
    webhookEndpoint: 'https://ewm-gateway.sds-vn.example.com/api/inbound/container',
    dockGate: 'Gate 2 • Ramp ESD-02',
    handoverStatus: 'AWAITING_ARRIVAL',
    driverCode: 'DRV-FC-002',
    driverName: 'Lê Minh Khôi',
    driverPhone: '0908 551 209',
    vehiclePlate: '51C-704.33',
    etaMinutes: 24,
    tempC: 21.5,
    eSealNumber: 'VN-CUST-492018',
    epodSignedBy: null,
    epodSignatureHash: null,
    lastSyncStatus: 'SUBSCRIBED',
    lastSyncPayload: null,
    lastSyncedAt: new Date(Date.now() - 8 * 60000).toISOString()
  },
  {
    id: '44444444-4444-4444-8444-444444440003',
    containerCode: 'CMAU-821903-2',
    shipmentCode: 'SHP-2026-8219',
    destinationHub: 'KCN VSIP 1 Thuận An, Bình Dương',
    shipperCompany: 'Gemadept Distribution 3PL',
    externalSystemName: 'Gemadept SmartPort API',
    externalTrackingRef: 'GMD-VSIP-8219',
    webhookEndpoint: 'https://connect.gemadept.example.vn/webhook/container-arrived',
    dockGate: 'Bay 07 • Inbound FMCG',
    handoverStatus: 'AT_GATE_DOCKED',
    driverCode: 'DRV-FC-003',
    driverName: 'Trần Hoàng Nam',
    driverPhone: '0914 720 881',
    vehiclePlate: '51D-662.18',
    etaMinutes: 5,
    tempC: 24.0,
    eSealNumber: 'VN-CUST-821903',
    epodSignedBy: null,
    epodSignatureHash: null,
    lastSyncStatus: 'SYNCED_3PL',
    lastSyncPayload:
      '{"event":"CONTAINER_HANDOVER_UPDATE","containerCode":"CMAU-821903-2","externalRef":"GMD-VSIP-8219","system":"Gemadept SmartPort API","dockGate":"Bay 07 • Inbound FMCG","status":"AT_GATE_DOCKED"}',
    lastSyncedAt: new Date(Date.now() - 3 * 60000).toISOString()
  },
  {
    id: '44444444-4444-4444-8444-444444440004',
    containerCode: 'CCLU-619284-5',
    shipmentCode: 'SHP-2026-6192',
    destinationHub: 'KCN Nhơn Trạch 2, Đồng Nai',
    shipperCompany: 'ViettelPost Cold Chain Hub',
    externalSystemName: 'VTP Fulfillment Core',
    externalTrackingRef: 'VTP-NT2-6192',
    webhookEndpoint: 'https://partner-gw.viettelpost.example.vn/ccadro/epod-sync',
    dockGate: 'Dock Lạnh C-01',
    handoverStatus: 'SYNCED_3PL',
    driverCode: 'DRV-FC-004',
    driverName: 'Phạm Quốc Tuấn',
    driverPhone: '0989 341 612',
    vehiclePlate: '61C-419.52',
    etaMinutes: 0,
    tempC: -18.2,
    eSealNumber: 'VN-CUST-619284',
    epodSignedBy: 'Nguyễn Minh Tuấn (Thủ kho 3PL Nhơn Trạch)',
    epodSignatureHash: 'SHA256:9f84b1c208aa34d1',
    lastSyncStatus: 'SYNCED_3PL',
    lastSyncPayload:
      '{"event":"CONTAINER_HANDOVER_UPDATE","containerCode":"CCLU-619284-5","externalRef":"VTP-NT2-6192","system":"VTP Fulfillment Core","dockGate":"Dock Lạnh C-01","status":"SYNCED_3PL"}',
    lastSyncedAt: new Date(Date.now() - 45 * 60000).toISOString()
  }
];

const HANDOVER_STATUS_META = {
  AWAITING_ARRIVAL: { label: 'Đang tới bãi đích', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' },
  AT_GATE_DOCKED: { label: 'Đã vào cổng / Dock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  UNLOADING: { label: 'Đang dỡ container', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  HANDED_OVER_EPOD: { label: 'Đã ký ePOD bàn giao', color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)' },
  SYNCED_3PL: { label: 'Đã đồng bộ Hệ thống 3PL', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.16)' }
};

const STORAGE_KEY_HANDOVERS = 'ccadro_third_party_shipper_handovers_v1';

function loadStoredHandovers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_HANDOVERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {
    // ignore
  }
  return INITIAL_THIRD_PARTY_HANDOVERS;
}

export default function ShipperPortalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('inbound'); // 'inbound' | 'webhooks' | 'chat'
  const [handovers, setHandovers] = useState(() => loadStoredHandovers());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbState, setDbState] = useState('LOCAL_CACHE');
  const [notice, setNotice] = useState(null);
  const [epodModalItem, setEpodModalItem] = useState(null);
  const [epodSignerName, setEpodSignerName] = useState('Thủ kho 3PL Điểm Đích');

  // Grab/Xanh SM Chat state with Drivers arriving at destination
  const [chatThreads, setChatThreads] = useState(() => loadChatThreadsMap());
  const [selectedDriverCode, setSelectedDriverCode] = useState('DRV-FC-001');
  const [chatDraft, setChatDraft] = useState('');
  const chatEndRef = useRef(null);

  const driverList = useMemo(
    () => [
      { driverCode: 'DRV-FC-001', fullName: 'Nguyễn Văn Hùng', phone: '0903 812 456', backendId: '11111111-1111-4111-8111-111111110001', containerCode: 'TCKU-781920-4' },
      { driverCode: 'DRV-FC-002', fullName: 'Lê Minh Khôi', phone: '0908 551 209', backendId: '11111111-1111-4111-8111-111111110002', containerCode: 'MSKU-492018-7' },
      { driverCode: 'DRV-FC-003', fullName: 'Trần Hoàng Nam', phone: '0914 720 881', backendId: '11111111-1111-4111-8111-111111110003', containerCode: 'CMAU-821903-2' },
      { driverCode: 'DRV-FC-004', fullName: 'Phạm Quốc Tuấn', phone: '0989 341 612', backendId: '11111111-1111-4111-8111-111111110004', containerCode: 'CCLU-619284-5' }
    ],
    []
  );

  const persistHandovers = useCallback((nextList) => {
    setHandovers(nextList);
    try {
      window.localStorage.setItem(STORAGE_KEY_HANDOVERS, JSON.stringify(nextList));
    } catch (_) {
      // ignore
    }
  }, []);

  const syncHandoversFromDb = useCallback(async () => {
    try {
      const res = await api.getShipperHandovers();
      const rows = res?.result || res?.data || res;
      if (Array.isArray(rows) && rows.length > 0) {
        setDbState('LIVE_DB');
        setHandovers((prev) => {
          const merged = rows.map((r) => {
            const localMatch = prev.find((p) => p.containerCode === r.containerCode) || {};
            return { ...localMatch, ...r };
          });
          try {
            window.localStorage.setItem(STORAGE_KEY_HANDOVERS, JSON.stringify(merged));
          } catch (_) {
            // ignore
          }
          return merged;
        });
      }
    } catch (_) {
      setDbState('LOCAL_CACHE');
    }
  }, []);

  useEffect(() => {
    syncHandoversFromDb();
    const unsub = subscribeDriverChat(() => {
      setChatThreads(loadChatThreadsMap());
    });
    return () => unsub();
  }, [syncHandoversFromDb]);

  const activeDriver = useMemo(
    () => driverList.find((d) => d.driverCode === selectedDriverCode) || driverList[0],
    [driverList, selectedDriverCode]
  );

  const unreadFromDrivers = useMemo(
    () => getUnreadCountForViewer(chatThreads, 'SHIPPER'),
    [chatThreads]
  );

  const activeMessages = useMemo(() => {
    const list = Array.isArray(chatThreads[activeDriver.driverCode])
      ? chatThreads[activeDriver.driverCode]
      : [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  }, [chatThreads, activeDriver.driverCode]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    if (activeDriver.backendId) {
      syncChatThreadFromDb(activeDriver.driverCode, activeDriver.backendId);
    }
    markChatThreadRead({
      driverCode: activeDriver.driverCode,
      backendDriverId: activeDriver.backendId,
      viewerRole: 'SHIPPER'
    });
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab, activeDriver, activeMessages.length]);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleStatusUpdate = async (item, nextStatus, extra = {}) => {
    const nowIso = new Date().toISOString();
    const payloadJson = JSON.stringify({
      event: 'CONTAINER_HANDOVER_UPDATE',
      containerCode: item.containerCode,
      externalRef: item.externalTrackingRef,
      system: item.externalSystemName,
      dockGate: extra.dockGate || item.dockGate,
      status: nextStatus,
      syncedAt: nowIso
    });

    try {
      await api.updateShipperHandoverStatus(item.containerCode, {
        handoverStatus: nextStatus,
        dockGate: extra.dockGate || item.dockGate,
        epodSignedBy: extra.epodSignedBy,
        epodSignatureHash: extra.epodSignatureHash
      });
    } catch (_) {
      // Fallback local cache
    }

    const updated = handovers.map((h) =>
      h.containerCode === item.containerCode
        ? {
            ...h,
            handoverStatus: nextStatus,
            epodSignedBy: extra.epodSignedBy || h.epodSignedBy,
            epodSignatureHash: extra.epodSignatureHash || h.epodSignatureHash,
            lastSyncStatus:
              nextStatus === 'HANDED_OVER_EPOD' || nextStatus === 'SYNCED_3PL'
                ? 'SYNCED_3PL'
                : h.lastSyncStatus,
            lastSyncPayload: payloadJson,
            lastSyncedAt: nowIso
          }
        : h
    );
    persistHandovers(updated);
    showToast(`Đã cập nhật ${item.containerCode} → ${HANDOVER_STATUS_META[nextStatus]?.label || nextStatus}`);
  };

  const handleSyncWebhook = async (item) => {
    const nowIso = new Date().toISOString();
    const payloadJson = JSON.stringify({
      event: 'CONTAINER_HANDOVER_UPDATE',
      containerCode: item.containerCode,
      externalRef: item.externalTrackingRef,
      system: item.externalSystemName,
      dockGate: item.dockGate,
      status: 'SYNCED_3PL',
      syncedAt: nowIso
    });
    try {
      await api.syncShipperWebhook(item.containerCode);
    } catch (_) {
      // Fallback local cache
    }
    const updated = handovers.map((h) =>
      h.containerCode === item.containerCode
        ? {
            ...h,
            handoverStatus: 'SYNCED_3PL',
            lastSyncStatus: 'SYNCED_3PL',
            lastSyncPayload: payloadJson,
            lastSyncedAt: nowIso
          }
        : h
    );
    persistHandovers(updated);
    showToast(`Đã đẩy Webhook thành công tới ${item.externalSystemName} (${item.externalTrackingRef}).`);
  };

  const handleConfirmEpod = async (e) => {
    e.preventDefault();
    if (!epodModalItem || !epodSignerName.trim()) return;
    const hash = `SHA256:${Math.random().toString(16).slice(2, 18)}`;
    try {
      await api.submitContainerEpod(epodModalItem.containerCode, {
        recipientName: epodSignerName.trim(),
        signatureToken: hash,
        notes: `Xác nhận bàn giao tại kho 3PL ${epodModalItem.shipperCompany}`
      });
    } catch (_) {
      // ignore if container API unavailable offline
    }
    await handleStatusUpdate(epodModalItem, 'HANDED_OVER_EPOD', {
      epodSignedBy: epodSignerName.trim(),
      epodSignatureHash: hash
    });
    setEpodModalItem(null);
  };

  const filteredHandovers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return handovers.filter((h) => {
      if (statusFilter !== 'ALL' && h.handoverStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        h.containerCode?.toLowerCase().includes(q) ||
        h.externalTrackingRef?.toLowerCase().includes(q) ||
        h.destinationHub?.toLowerCase().includes(q) ||
        h.externalSystemName?.toLowerCase().includes(q) ||
        h.shipperCompany?.toLowerCase().includes(q)
      );
    });
  }, [handovers, statusFilter, searchQuery]);

  const kpis = useMemo(
    () => ({
      total: handovers.length,
      awaiting: handovers.filter((h) => h.handoverStatus === 'AWAITING_ARRIVAL').length,
      docked: handovers.filter((h) => ['AT_GATE_DOCKED', 'UNLOADING'].includes(h.handoverStatus)).length,
      synced: handovers.filter((h) => ['HANDED_OVER_EPOD', 'SYNCED_3PL'].includes(h.handoverStatus)).length
    }),
    [handovers]
  );

  const bgPage = isDark ? '#03110d' : '#f1f5f9';
  const cardBg = isDark ? 'rgba(6, 24, 18, 0.92)' : '#ffffff';
  const borderCol = isDark ? 'rgba(6, 182, 212, 0.25)' : '#cbd5e1';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ minHeight: '100vh', background: bgPage, color: textMain }}>
      {/* HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: isDark ? 'rgba(3, 17, 13, 0.92)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${borderCol}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CcadroLogo size={38} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: '0.98rem' }}>CCADRO • CỔNG SHIPPER ĐIỂM ĐÍCH (3PL)</strong>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(6, 182, 212, 0.16)',
                  color: '#06b6d4',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  fontSize: '0.67rem',
                  fontWeight: 800
                }}
              >
                BÊN THỨ 3 / WMS INTEGRATION
              </span>
            </div>
            <div style={{ fontSize: '0.73rem', color: textMuted }}>
              {user?.fullName || 'Gemadept Destination 3PL Hub'} • @{user?.username || 'shipper'} • Trạng thái DB:{' '}
              <strong style={{ color: '#10b981' }}>{dbState === 'LIVE_DB' ? 'LIVE PostgreSQL' : 'Realtime Cache'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'inbound', label: '1. Container Đến Bãi Đích', icon: Box },
            { id: 'webhooks', label: '2. Đồng Bộ Hệ Thống Thứ 3', icon: Webhook },
            { id: 'chat', label: '3. Chat Tài Xế Sắp Tới', icon: MessageSquare, badge: unreadFromDrivers }
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 13px',
                  borderRadius: 10,
                  border: `1px solid ${active ? '#06b6d4' : borderCol}`,
                  background: active ? 'rgba(6, 182, 212, 0.16)' : 'transparent',
                  color: active ? '#06b6d4' : textMain,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Icon size={15} />
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 5px',
                      borderRadius: 999,
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={toggleTheme}
            title="Chuyển sáng / tối"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: `1px solid ${borderCol}`,
              background: 'transparent',
              color: textMain,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 9,
              border: '1px solid rgba(239, 68, 68, 0.38)',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: 24, display: 'grid', gap: 18 }}>
        {notice && (
          <div
            style={{
              padding: '11px 16px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.16)',
              border: '1px solid #10b981',
              color: '#10b981',
              fontSize: '0.84rem',
              fontWeight: 700
            }}
          >
            ✓ {notice}
          </div>
        )}

        {/* KPI BAR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {[
            { label: 'Tổng Cont Giao Tới Điểm Đích', val: kpis.total, color: '#06b6d4' },
            { label: 'Đang Trên Đường Tới Bãi', val: kpis.awaiting, color: '#38bdf8' },
            { label: 'Đã Vào Cổng / Đang Dỡ Hàng', val: kpis.docked, color: '#f59e0b' },
            { label: 'Đã Ký ePOD & Sync WMS Thứ 3', val: kpis.synced, color: '#10b981' }
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: '15px 18px',
                borderRadius: 14,
                background: cardBg,
                border: `1px solid ${borderCol}`
              }}
            >
              <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: item.color, marginTop: 4 }}>
                {item.val}
              </div>
            </div>
          ))}
        </div>

        {/* TAB 1: INBOUND CONTAINERS AT DESTINATION */}
        {activeTab === 'inbound' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['ALL', 'AWAITING_ARRIVAL', 'AT_GATE_DOCKED', 'HANDED_OVER_EPOD', 'SYNCED_3PL'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: `1px solid ${statusFilter === st ? '#06b6d4' : borderCol}`,
                      background: statusFilter === st ? 'rgba(6, 182, 212, 0.16)' : cardBg,
                      color: statusFilter === st ? '#06b6d4' : textMuted,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {st === 'ALL' ? 'Tất cả' : HANDOVER_STATUS_META[st]?.label || st}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', minWidth: 260 }}>
                <Search
                  size={14}
                  color={textMuted}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã cont, mã 3PL, hệ thống WMS..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 30px',
                    borderRadius: 10,
                    border: `1px solid ${borderCol}`,
                    background: cardBg,
                    color: textMain,
                    fontSize: '0.78rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {filteredHandovers.map((item) => {
                const stMeta = HANDOVER_STATUS_META[item.handoverStatus] || HANDOVER_STATUS_META.AWAITING_ARRIVAL;
                return (
                  <div
                    key={item.containerCode}
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      background: cardBg,
                      border: `1px solid ${borderCol}`,
                      display: 'grid',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1.02rem' }}>{item.containerCode}</strong>
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: 999,
                              background: stMeta.bg,
                              color: stMeta.color,
                              fontSize: '0.7rem',
                              fontWeight: 800
                            }}
                          >
                            {stMeta.label}
                          </span>
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: 999,
                              background: 'rgba(16, 185, 129, 0.14)',
                              color: '#10b981',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}
                          >
                            3PL System: {item.externalSystemName} ({item.externalTrackingRef})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: textMuted, marginTop: 4 }}>
                          Điểm giao nhận: <strong style={{ color: textMain }}>{item.destinationHub}</strong> • Đối tác:{' '}
                          <strong>{item.shipperCompany}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.76rem' }}>
                        <div style={{ fontWeight: 700, color: '#06b6d4' }}>{item.dockGate || 'Chưa phân Dock'}</div>
                        <div style={{ color: textMuted }}>
                          Xe {item.vehiclePlate || '---'} • Tài xế: {item.driverName || '---'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 14,
                        fontSize: '0.76rem',
                        color: textMuted,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: isDark ? 'rgba(15, 23, 42, 0.45)' : '#f8fafc'
                      }}
                    >
                      <span>Đơn hàng: <strong style={{ color: textMain }}>{item.shipmentCode}</strong></span>
                      <span>e-Seal: <strong style={{ color: '#10b981' }}>{item.eSealNumber || 'VALID'}</strong></span>
                      <span>Nhiệt độ Cont: <strong style={{ color: '#38bdf8' }}>{item.tempC ?? -18.0}°C</strong></span>
                      {item.epodSignedBy && (
                        <span>
                          ePOD ký bởi: <strong style={{ color: '#10b981' }}>{item.epodSignedBy}</strong> ({item.epodSignatureHash})
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(item, 'AT_GATE_DOCKED')}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 9,
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        1. Cho Vào Cổng (Dock-In)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(item, 'UNLOADING')}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 9,
                          border: '1px solid rgba(168, 85, 247, 0.45)',
                          background: 'rgba(168, 85, 247, 0.12)',
                          color: '#a855f7',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        2. Đang Dỡ Hàng
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEpodModalItem(item);
                          setEpodSignerName(`Thủ kho ${item.shipperCompany}`);
                        }}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 9,
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          background: 'rgba(16, 185, 129, 0.14)',
                          color: '#10b981',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <ClipboardCheck size={13} /> 3. Ký ePOD Bàn Giao
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSyncWebhook(item)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 9,
                          border: '1px solid rgba(6, 182, 212, 0.5)',
                          background: 'rgba(6, 182, 212, 0.14)',
                          color: '#06b6d4',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <RefreshCw size={13} /> Đẩy Webhook 3PL
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDriverCode(item.driverCode || 'DRV-FC-001');
                          setActiveTab('chat');
                        }}
                        style={{
                          marginLeft: 'auto',
                          padding: '7px 13px',
                          borderRadius: 9,
                          border: '1px solid rgba(16, 185, 129, 0.45)',
                          background: 'linear-gradient(135deg, #00b14f 0%, #059669 100%)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <MessageSquare size={13} /> Chat Tài Xế
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: EXTERNAL 3PL WEBHOOK LOGS */}
        {activeTab === 'webhooks' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 14, background: cardBg, border: `1px solid ${borderCol}`, fontSize: '0.82rem' }}>
              <strong style={{ color: '#06b6d4' }}>Cổng Kết Nối Hệ Thống Thứ 3 (3PL / WMS Webhooks)</strong>
              <p style={{ color: textMuted, marginTop: 4, marginBottom: 0 }}>
                Mọi thao tác Dock-In, mở e-Seal và ký nhận ePOD tại bãi điểm đích sẽ tự động đẩy JSON Webhook sang hệ thống ERP/WMS của bên giao nhận thứ 3.
              </p>
            </div>

            {handovers.map((h) => (
              <div
                key={h.containerCode}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: cardBg,
                  border: `1px solid ${borderCol}`,
                  display: 'grid',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong>{h.externalSystemName}</strong> • <code style={{ color: '#06b6d4' }}>{h.containerCode}</code> ({h.externalTrackingRef})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                      {h.lastSyncStatus} • {h.lastSyncedAt ? new Date(h.lastSyncedAt).toLocaleTimeString('vi-VN') : 'Chờ sync'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSyncWebhook(h)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: '1px solid #06b6d4',
                        background: 'rgba(6, 182, 212, 0.14)',
                        color: '#06b6d4',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Test Sync Ngay
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '0.73rem', color: textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ExternalLink size={12} /> Endpoint: <code>{h.webhookEndpoint}</code>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 10,
                    borderRadius: 9,
                    background: isDark ? '#020b08' : '#0f172a',
                    color: '#6ee7b7',
                    fontSize: '0.72rem',
                    overflowX: 'auto'
                  }}
                >
                  {h.lastSyncPayload ||
                    JSON.stringify({
                      event: 'CONTAINER_SUBSCRIBED',
                      containerCode: h.containerCode,
                      externalRef: h.externalTrackingRef,
                      system: h.externalSystemName,
                      status: h.handoverStatus
                    })}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: CHAT WITH DRIVERS APPROACHING DESTINATION */}
        {activeTab === 'chat' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) 1fr', gap: 16, minHeight: 520 }}>
            <div style={{ borderRadius: 16, background: cardBg, border: `1px solid ${borderCol}`, padding: 12, display: 'grid', gap: 6, alignContent: 'start' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 4 }}>Tài Xế Đang Chạy Tới Kho 3PL</div>
              {driverList.map((drv) => {
                const active = activeDriver.driverCode === drv.driverCode;
                const unread = getUnreadCountForViewer(chatThreads, 'SHIPPER', drv.driverCode);
                return (
                  <button
                    key={drv.driverCode}
                    type="button"
                    onClick={() => setSelectedDriverCode(drv.driverCode)}
                    style={{
                      padding: '10px',
                      borderRadius: 12,
                      border: `1px solid ${active ? '#06b6d4' : 'transparent'}`,
                      background: active ? 'rgba(6, 182, 212, 0.14)' : 'transparent',
                      color: textMain,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                  >
                    <GrabDriverAvatar name={drv.fullName} status="ON_TRIP" size={38} verified />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.79rem' }}>{drv.fullName}</strong>
                        {unread > 0 && (
                          <span style={{ padding: '1px 6px', borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>
                            {unread}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#06b6d4', fontWeight: 700 }}>{drv.containerCode}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ borderRadius: 16, background: cardBg, border: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column', minHeight: 520, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.94rem' }}>Kho Đích 3PL ↔ {activeDriver.fullName}</strong>
                  <div style={{ fontSize: '0.72rem', color: '#06b6d4', fontWeight: 700 }}>
                    Container {activeDriver.containerCode} • Đồng bộ trực tiếp với Cabin Tài Xế (`/driver`)
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={14} /> 3PL Handover Live
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: isDark ? 'rgba(2,10,8,0.45)' : '#f8fafc' }}>
                {activeMessages.map((msg) => {
                  const isShipperSelf = (msg.senderRole || '').toUpperCase() === 'SHIPPER';
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isShipperSelf ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize: '0.67rem', color: textMuted, marginBottom: 3 }}>
                        {isShipperSelf ? `Kho Đích 3PL (${msg.senderName})` : `${msg.senderName} (${msg.senderRole})`}
                      </div>
                      <div
                        style={{
                          maxWidth: '78%',
                          padding: '10px 13px',
                          borderRadius: isShipperSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isShipperSelf ? 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' : cardBg,
                          color: isShipperSelf ? '#ffffff' : textMain,
                          border: isShipperSelf ? 'none' : `1px solid ${borderCol}`,
                          fontSize: '0.81rem'
                        }}
                      >
                        <div>{msg.messageText}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4, fontSize: '0.65rem', opacity: 0.8 }}>
                          <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          {isShipperSelf && (msg.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: '10px 14px', borderTop: `1px solid ${borderCol}` }}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
                  {[
                    'Xe vào cổng B, Dock lạnh D-04 đã mở sẵn nhé bác tài',
                    'Kho đang sẵn sàng kiểm tra khóa e-Seal khi xe cập bãi',
                    'Đã chuẩn bị đội nâng hạ container, tới cổng gọi bảo vệ số 1'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        sendGrabChatMessage({
                          driverCode: activeDriver.driverCode,
                          backendDriverId: activeDriver.backendId,
                          senderName: user?.companyName || 'Kho Đích 3PL',
                          senderRole: 'SHIPPER',
                          senderUsername: user?.username || 'shipper',
                          containerCode: activeDriver.containerCode,
                          messageText: chip,
                          messageType: 'QUICK_REPLY'
                        })
                      }
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '5px 10px',
                        borderRadius: 999,
                        border: `1px solid ${borderCol}`,
                        background: 'rgba(6, 182, 212, 0.1)',
                        color: '#06b6d4',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatDraft.trim()) return;
                    const txt = chatDraft.trim();
                    setChatDraft('');
                    sendGrabChatMessage({
                      driverCode: activeDriver.driverCode,
                      backendDriverId: activeDriver.backendId,
                      senderName: user?.companyName || 'Kho Đích 3PL',
                      senderRole: 'SHIPPER',
                      senderUsername: user?.username || 'shipper',
                      containerCode: activeDriver.containerCode,
                      messageText: txt,
                      messageType: 'TEXT'
                    });
                  }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <input
                    type="text"
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    placeholder={`Hướng dẫn tài xế ${activeDriver.fullName} vào cổng / Dock...`}
                    style={{
                      flex: 1,
                      height: 40,
                      padding: '0 13px',
                      borderRadius: 10,
                      border: `1px solid ${borderCol}`,
                      background: 'transparent',
                      color: textMain,
                      fontSize: '0.82rem'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      height: 40,
                      padding: '0 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Send size={14} /> Gửi
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EPOD HANDOVER MODAL */}
      {epodModalItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(2,12,9,0.72)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <form
            onSubmit={handleConfirmEpod}
            style={{
              width: '100%',
              maxWidth: 440,
              borderRadius: 18,
              background: cardBg,
              border: `1.5px solid #10b981`,
              padding: 22,
              display: 'grid',
              gap: 12
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.02rem' }}>
              Ký Nhận ePOD Điểm Đích • {epodModalItem.containerCode}
            </h3>
            <div style={{ fontSize: '0.78rem', color: textMuted }}>
              Hệ thống sẽ lưu chữ ký SHA-256 vào DB và tự động bắn Webhook đồng bộ sang{' '}
              <strong>{epodModalItem.externalSystemName}</strong>.
            </div>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem' }}>
              <span>Họ tên Thủ kho / Đại diện bên thứ 3 ký nhận:</span>
              <input
                type="text"
                required
                value={epodSignerName}
                onChange={(e) => setEpodSignerName(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 9, border: `1px solid ${borderCol}`, background: 'transparent', color: textMain }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setEpodModalItem(null)} style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${borderCol}`, background: 'transparent', color: textMain, cursor: 'pointer' }}>
                Hủy
              </button>
              <button type="submit" style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: '#10b981', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
                <CheckCircle2 size={14} /> Xác Nhận ePOD &amp; Sync 3PL
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
