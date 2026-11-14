import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  X
} from 'lucide-react';
import GrabDriverAvatar from '../ui/GrabDriverAvatar';
import {
  getUnreadCountForViewer,
  markChatThreadRead,
  sendGrabChatMessage,
  syncChatThreadFromDb
} from '../../utils/driverChatSync';

const CUSTOMER_QUICK_REPLIES = [
  'Anh tới đâu rồi ạ?',
  'Gửi giúp em tọa độ GPS hiện tại nhé',
  'Nhớ giữ nhiệt độ cont -18°C ổn định giúp em',
  'Tới cổng kho gọi số bảo vệ mở cổng giúp em nhé',
  'Cảm ơn bác tài nhiều 🌿'
];

export default function GrabDriverChatModal({
  isOpen,
  onClose,
  isDark = false,
  drivers = [],
  shipments = [],
  chatThreads = {},
  initialDriverCode = null,
  user
}) {
  const [selectedDriverCode, setSelectedDriverCode] = useState(
    initialDriverCode || drivers[0]?.driverCode || 'DRV-FC-001'
  );
  const [threadSearch, setThreadSearch] = useState('');
  const [threadFilter, setThreadFilter] = useState('ALL'); // 'ALL' | 'ON_TRIP' | 'AVAILABLE' | 'UNREAD'
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialDriverCode) {
      setSelectedDriverCode(initialDriverCode);
    }
  }, [isOpen, initialDriverCode]);

  const selectedDriver = useMemo(() => {
    return (
      drivers.find((d) => d.driverCode === selectedDriverCode) ||
      drivers[0] ||
      null
    );
  }, [drivers, selectedDriverCode]);

  const activeContainerForDriver = useMemo(() => {
    if (!selectedDriver) return null;
    return (
      shipments.find(
        (s) =>
          (selectedDriver.assignedContainerCode &&
            s.containerCode === selectedDriver.assignedContainerCode) ||
          s.driverName === selectedDriver.fullName
      ) || null
    );
  }, [selectedDriver, shipments]);

  const currentMessages = useMemo(() => {
    if (!selectedDriver) return [];
    const list = Array.isArray(chatThreads[selectedDriver.driverCode])
      ? chatThreads[selectedDriver.driverCode]
      : [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  }, [chatThreads, selectedDriver]);

  useEffect(() => {
    if (!isOpen || !selectedDriver) return;
    if (selectedDriver.backendId) {
      syncChatThreadFromDb(selectedDriver.driverCode, selectedDriver.backendId);
    }
    markChatThreadRead({
      driverCode: selectedDriver.driverCode,
      backendDriverId: selectedDriver.backendId,
      viewerRole: 'CUSTOMER'
    });
  }, [isOpen, selectedDriver, currentMessages.length]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, selectedDriver?.driverCode, currentMessages.length]);

  const filteredDrivers = useMemo(() => {
    const q = threadSearch.toLowerCase().trim();
    return drivers.filter((drv) => {
      if (threadFilter === 'ON_TRIP' && drv.liveStatus !== 'ON_TRIP') return false;
      if (threadFilter === 'AVAILABLE' && drv.liveStatus !== 'AVAILABLE') return false;
      if (threadFilter === 'UNREAD') {
        const unread = getUnreadCountForViewer(chatThreads, 'CUSTOMER', drv.driverCode);
        if (unread === 0) return false;
      }
      if (!q) return true;
      return (
        drv.fullName?.toLowerCase().includes(q) ||
        drv.driverCode?.toLowerCase().includes(q) ||
        drv.assignedVehiclePlate?.toLowerCase().includes(q) ||
        drv.assignedContainerCode?.toLowerCase().includes(q)
      );
    });
  }, [drivers, threadSearch, threadFilter, chatThreads]);

  if (!isOpen) return null;

  const panelBg = isDark ? '#061611' : '#ffffff';
  const sidebarBg = isDark ? 'rgba(4, 15, 11, 0.96)' : '#f8fafc';
  const borderColor = isDark ? 'rgba(16, 185, 129, 0.25)' : '#e2e8f0';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  const handleSend = async (customText = null, messageType = 'TEXT') => {
    if (!selectedDriver || sending) return;
    const textToSend = (customText ?? draft).trim();
    if (!textToSend) return;

    setSending(true);
    try {
      await sendGrabChatMessage({
        driverCode: selectedDriver.driverCode,
        backendDriverId: selectedDriver.backendId,
        senderName: user?.companyName || user?.fullName || 'Khách hàng B2B',
        senderRole: 'CUSTOMER',
        senderUsername: user?.username || 'shipper',
        containerCode:
          activeContainerForDriver?.containerCode || selectedDriver.assignedContainerCode || null,
        shipmentCode:
          activeContainerForDriver?.shipmentCode || selectedDriver.assignedShipmentCode || null,
        messageText: textToSend,
        messageType
      });
      if (!customText) setDraft('');
    } finally {
      setSending(false);
    }
  };

  const handleShareWarehousePin = () => {
    const dest =
      activeContainerForDriver?.destinationName ||
      user?.department ||
      'Kho nhận hàng Doanh nghiệp B2B';
    handleSend(
      `📍 Điểm giao nhận: ${dest} (10.9462°N, 106.8674°E) — Anh tới cổng liên hệ bảo vệ cổng B nhé.`,
      'LOCATION'
    );
  };

  const formatMsgTime = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Kênh chat trực tiếp Khách hàng và Tài xế"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 130,
        background: 'rgba(2, 12, 9, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          height: 'min(680px, 90vh)',
          borderRadius: 22,
          background: panelBg,
          border: `1.5px solid ${borderColor}`,
          boxShadow: '0 28px 64px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(250px, 310px) 1fr',
          color: textMain
        }}
      >
        {/* LEFT PANE: DRIVER CONVERSATIONS LIST (ALL FLEET DRIVERS) */}
        <div
          style={{
            background: sidebarBg,
            borderRight: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: 'linear-gradient(135deg, #00b14f 0%, #059669 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff'
                  }}
                >
                  <MessageSquare size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>Grab / Xanh SM Chat</div>
                  <div style={{ fontSize: '0.67rem', color: '#10b981', fontWeight: 700 }}>
                    ● Kết nối trực tiếp {drivers.length} tài xế
                  </div>
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search
                size={14}
                color={textMuted}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="Tìm tài xế, cont, biển số..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: 9,
                  border: `1px solid ${borderColor}`,
                  background: isDark ? 'rgba(15, 23, 42, 0.55)' : '#ffffff',
                  color: textMain,
                  fontSize: '0.76rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'ON_TRIP', label: 'Đang chạy' },
                { id: 'AVAILABLE', label: 'Sẵn sàng' },
                { id: 'UNREAD', label: 'Chưa đọc' }
              ].map((tab) => {
                const active = threadFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setThreadFilter(tab.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 999,
                      border: `1px solid ${active ? '#10b981' : borderColor}`,
                      background: active ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                      color: active ? '#10b981' : textMuted,
                      fontSize: '0.67rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'grid', gap: 4, alignContent: 'start' }}>
            {filteredDrivers.map((drv) => {
              const active = selectedDriver?.driverCode === drv.driverCode;
              const list = Array.isArray(chatThreads[drv.driverCode]) ? chatThreads[drv.driverCode] : [];
              const lastMsg = list[list.length - 1];
              const unread = getUnreadCountForViewer(chatThreads, 'CUSTOMER', drv.driverCode);
              return (
                <button
                  key={drv.driverCode}
                  type="button"
                  onClick={() => setSelectedDriverCode(drv.driverCode)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 10px',
                    borderRadius: 12,
                    border: `1px solid ${active ? '#10b981' : 'transparent'}`,
                    background: active
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : 'rgba(16, 185, 129, 0.1)'
                      : 'transparent',
                    color: textMain,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                >
                  <GrabDriverAvatar
                    name={drv.fullName}
                    status={drv.liveStatus || 'AVAILABLE'}
                    size={42}
                    verified
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {drv.fullName}
                      </span>
                      {unread > 0 && (
                        <span
                          style={{
                            minWidth: 18,
                            height: 18,
                            padding: '0 5px',
                            borderRadius: 999,
                            background: '#00b14f',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {unread}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, marginTop: 1 }}>
                      {drv.assignedContainerCode || drv.assignedVehiclePlate || drv.driverCode}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: textMuted,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2
                      }}
                    >
                      {lastMsg ? lastMsg.messageText : 'Bấm để nhắn tin với tài xế này...'}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredDrivers.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: '0.76rem', color: textMuted }}>
                Không tìm thấy tài xế phù hợp.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: ACTIVE CONVERSATION */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {selectedDriver ? (
            <>
              {/* Header */}
              <div
                style={{
                  padding: '13px 18px',
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <GrabDriverAvatar
                    name={selectedDriver.fullName}
                    status={selectedDriver.liveStatus || 'AVAILABLE'}
                    size={44}
                    verified
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.94rem' }}>{selectedDriver.fullName}</strong>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: 'rgba(245, 158, 11, 0.14)',
                          color: '#f59e0b',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}
                      >
                        ★ {Number(selectedDriver.rating || 4.95).toFixed(2)}
                      </span>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: 'rgba(16, 185, 129, 0.14)',
                          color: '#10b981',
                          fontSize: '0.68rem',
                          fontWeight: 700
                        }}
                      >
                        {selectedDriver.liveStatus === 'ON_TRIP' ? 'Đang chạy tuyến' : 'Sẵn sàng'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: textMuted, marginTop: 2 }}>
                      Xe {selectedDriver.assignedVehiclePlate || 'Đang cập nhật'} • {selectedDriver.phone}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a
                    href={`tel:${(selectedDriver.phone || '').replace(/\s+/g, '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 11px',
                      borderRadius: 9,
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <Phone size={13} /> Gọi tài xế
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng khung chat"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      border: `1px solid ${borderColor}`,
                      background: 'transparent',
                      color: textMain,
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Grab/Xanh SM Context Strip */}
              <div
                style={{
                  padding: '8px 18px',
                  background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  fontSize: '0.73rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, color: '#059669' }}>
                  <Truck size={14} />
                  {activeContainerForDriver ? (
                    <span>
                      Cont {activeContainerForDriver.containerCode} • {activeContainerForDriver.originName} →{' '}
                      {activeContainerForDriver.destinationName}
                    </span>
                  ) : (
                    <span>
                      {selectedDriver.currentRoute || 'Tài xế đang trực sẵn sàng nhận điều phối tại Depot'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: textMuted, fontWeight: 600 }}>
                  {activeContainerForDriver && (
                    <>
                      <span>Nhiệt độ: {activeContainerForDriver.supplyAirTempC ?? -18.4}°C</span>
                      <span>• ETA: {activeContainerForDriver.etaMinutes || 25}p</span>
                    </>
                  )}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#10b981' }}>
                    <ShieldCheck size={13} /> Cabin OS Live
                  </span>
                </div>
              </div>

              {/* Messages Feed */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: isDark ? 'rgba(2, 10, 8, 0.55)' : '#f8fafc'
                }}
              >
                {currentMessages.length === 0 ? (
                  <div
                    style={{
                      margin: 'auto',
                      textAlign: 'center',
                      maxWidth: 340,
                      padding: 20,
                      borderRadius: 16,
                      border: `1px dashed ${borderColor}`,
                      color: textMuted,
                      fontSize: '0.79rem'
                    }}
                  >
                    <Sparkles size={20} color="#10b981" style={{ marginBottom: 6 }} />
                    <div style={{ fontWeight: 700, color: textMain, marginBottom: 4 }}>
                      Bắt đầu trò chuyện với {selectedDriver.fullName}
                    </div>
                    Tin nhắn gửi đi sẽ hiển thị ngay trên thiết bị Cabin OS (`/driver`) và lưu xuống PostgreSQL.
                  </div>
                ) : (
                  currentMessages.map((msg) => {
                    const isCustomer = (msg.senderRole || 'CUSTOMER').toUpperCase() !== 'DRIVER';
                    const isLocation = msg.messageType === 'LOCATION';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isCustomer ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{ fontSize: '0.67rem', color: textMuted, marginBottom: 3, paddingInline: 4 }}>
                          {isCustomer ? `Bạn (${msg.senderName})` : `${msg.senderName} • Tài xế`}
                        </div>
                        <div
                          style={{
                            maxWidth: '78%',
                            padding: '10px 13px',
                            borderRadius: isCustomer ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isCustomer
                              ? 'linear-gradient(135deg, #00b14f 0%, #059669 100%)'
                              : isDark
                                ? '#0f2920'
                                : '#ffffff',
                            color: isCustomer ? '#ffffff' : textMain,
                            border: isCustomer ? 'none' : `1px solid ${borderColor}`,
                            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
                            fontSize: '0.82rem',
                            lineHeight: 1.45
                          }}
                        >
                          {isLocation && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.69rem',
                                fontWeight: 800,
                                marginBottom: 4,
                                opacity: 0.92
                              }}
                            >
                              <MapPin size={12} /> GHIM VỊ TRÍ TRỰC TIẾP
                            </div>
                          )}
                          <div>{msg.messageText}</div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 4,
                              marginTop: 5,
                              fontSize: '0.65rem',
                              opacity: isCustomer ? 0.85 : 0.68
                            }}
                          >
                            <span>{formatMsgTime(msg.createdAt)}</span>
                            {isCustomer &&
                              (msg.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies + Composer */}
              <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${borderColor}`, background: panelBg }}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
                  {CUSTOMER_QUICK_REPLIES.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSend(chip, 'QUICK_REPLY')}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '5px 10px',
                        borderRadius: 999,
                        border: `1px solid ${borderColor}`,
                        background: isDark ? 'rgba(16, 185, 129, 0.09)' : '#f0fdf4',
                        color: isDark ? '#6ee7b7' : '#047857',
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
                    handleSend();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <button
                    type="button"
                    onClick={handleShareWarehousePin}
                    title="Gửi ghim tọa độ kho cho tài xế"
                    style={{
                      height: 40,
                      padding: '0 11px',
                      borderRadius: 11,
                      border: `1px solid ${borderColor}`,
                      background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
                      color: '#10b981',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MapPin size={14} /> Ghim Kho
                  </button>

                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Nhắn tin tới tài xế ${selectedDriver.fullName}...`}
                    style={{
                      flex: 1,
                      height: 40,
                      padding: '0 14px',
                      borderRadius: 11,
                      border: `1px solid ${borderColor}`,
                      background: isDark ? 'rgba(15, 23, 42, 0.55)' : '#ffffff',
                      color: textMain,
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    style={{
                      height: 40,
                      padding: '0 16px',
                      borderRadius: 11,
                      border: 'none',
                      background: 'linear-gradient(135deg, #00b14f 0%, #059669 100%)',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                      opacity: sending || !draft.trim() ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Send size={14} /> Gửi
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ margin: 'auto', color: textMuted, fontSize: '0.85rem' }}>
              Chọn một tài xế để bắt đầu trò chuyện.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

