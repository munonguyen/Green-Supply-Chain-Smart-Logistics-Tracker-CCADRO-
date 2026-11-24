import SearchField from '../components/search/SearchField';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Info,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Pin,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Smile,
  SquarePen,
  ThumbsUp,
  Truck,
  Users,
  WifiOff,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { elasticSearchMatch } from '../../utils/elasticSearch';
import {
  refreshRemoteChat,
  startRemoteChatSocket,
  setRemoteActiveConversation,
  reconnectRemoteChat,
  remoteStatus,
  remoteStatusKind,
  remoteHasOlder,
  syncRemoteThread
} from '../../utils/remoteChat';
import {
  MESSENGER_REACTIONS,
  isChatDemoMode,
  isChatSandboxOverride,
  setChatSandboxOverride,
  addMembersToMessengerThread,
  buildMessengerConversations,
  createMessengerThread,
  loadChatThreadsMap,
  loadMessengerMeta,
  markChatThreadRead,
  sendGrabChatMessage,
  subscribeDriverChat,
  syncChatThreadFromDb,
  toggleMessengerMute,
  toggleMessengerPin,
  toggleMessengerReaction
} from '../../utils/driverChatSync';
import {
  MessengerAvatar,
  MessengerComposePanel,
  MessengerInfoSidebar
} from './MessengerSubComponents';

const QUICK_REPLIES = [
  'Anh tới đâu rồi ạ?',
  'Gửi giúp tọa độ GPS hiện tại nhé',
  'Nhớ giữ nhiệt độ cont -18°C ổn định',
  'Tới cổng kho gọi số bảo vệ mở cổng nhé',
  'Đã xác nhận ePOD hoàn tất 🌿'
];

const QUICK_EMOJIS = ['👍', '🌿', '🚚', '📦', '📍', '✅', '❤️', '🙏', '🔥', '❄️'];

const FILTER_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'UNREAD', label: 'Chưa đọc' },
  { id: 'GROUP', label: 'Nhóm' },
  { id: 'DRIVER', label: 'Tài xế' },
  { id: 'OPS', label: 'Điều phối' },
  { id: 'HUB_CUST', label: 'Khách / Hub' }
];

function formatRelativeTime(iso) {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin}p`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatClockTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

function formatChatError(rawError) {
  if (!rawError) return '';
  const msg = String(rawError).trim();
  const lower = msg.toLowerCase();
  if (
    lower === 'load failed' ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('err_connection_refused') ||
    lower.includes('status 502') ||
    lower.includes('status 503') ||
    lower.includes('service unavailable')
  ) {
    return 'Đang tạm gián đoạn kết nối máy chủ tin nhắn. Bạn có thể bấm Kết nối lại hoặc bật Trò chuyện Nội bộ để tiếp tục trao đổi.';
  }
  return msg;
}

export default function MessengerWorkspaceModal({
  isOpen = true,
  inline = false,
  onClose,
  isDark = false,
  drivers = [],
  shipments = [],
  chatThreads: externalChatThreads = null,
  initialThreadId = null,
  initialDriverCode = null,
  user: propUser = null,
  viewerRoleOverride = null
}) {
  const authCtx = useAuth() || {};
  const user = propUser || authCtx.user || null;
  const authAccounts = useMemo(() => authCtx.accounts || [], [authCtx.accounts]);

  const [localThreadsMap, setLocalThreadsMap] = useState(() => loadChatThreadsMap());
  const [cachedMeta, setMeta] = useState(() => loadMessengerMeta());
  const [, setSyncRevision] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 820
  );
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const sandboxActive = isChatSandboxOverride();
  const demoModeActive = isChatDemoMode();
  const meta = demoModeActive ? cachedMeta : loadMessengerMeta();
  const threadsMap = demoModeActive ? externalChatThreads || localThreadsMap : loadChatThreadsMap();

  const [selectedId, setSelectedId] = useState(
    initialThreadId || initialDriverCode || 'GRP-TCKU-781920-4'
  );
  const [threadSearch, setThreadSearch] = useState('');
  const [threadFilter, setThreadFilter] = useState('ALL');
  const [inThreadSearch, setInThreadSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1060
  );
  const [minimized, setMinimized] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const pendingSend = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const refresh = () => {
      setLocalThreadsMap(loadChatThreadsMap());
      setMeta(loadMessengerMeta());
      setSyncRevision((r) => r + 1);
      if (!isChatDemoMode()) setChatError(remoteStatus());
      else setChatError('');
    };
    refresh();
    return subscribeDriverChat(refresh);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => setIsNarrow(window.innerWidth < 820);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (inline || !isOpen || !onClose || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inline, isOpen, onClose]);

  useEffect(() => {
    if (isOpen && (initialThreadId || initialDriverCode)) {
      setSelectedId(initialThreadId || initialDriverCode);
      setMinimized(false);
      setComposeOpen(false);
    }
  }, [isOpen, initialThreadId, initialDriverCode]);

  const effectiveUser = useMemo(() => {
    if (!viewerRoleOverride) return user;
    return { ...(user || {}), role: viewerRoleOverride };
  }, [user, viewerRoleOverride]);

  const { contacts, conversations } = useMemo(
    () =>
      buildMessengerConversations({
        drivers,
        accounts: authAccounts,
        currentUser: effectiveUser,
        threadsMap,
        meta
      }),
    [drivers, authAccounts, effectiveUser, threadsMap, meta]
  );

  const selectedThread = useMemo(
    () => conversations.find((c) => c.id === selectedId) || conversations[0] || null,
    [conversations, selectedId]
  );

  const activeShipment = useMemo(() => {
    if (!selectedThread) return null;
    const code = selectedThread.containerCode || selectedThread.assignedContainerCode;
    return (
      shipments.find(
        (s) =>
          (code && s.containerCode === code) ||
          (selectedThread.fullName && s.driverName === selectedThread.fullName)
      ) || null
    );
  }, [selectedThread, shipments]);

  const currentMessages = useMemo(() => {
    if (!selectedThread) return [];
    const list = Array.isArray(threadsMap[selectedThread.id]) ? threadsMap[selectedThread.id] : [];
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    if (!inThreadSearch.trim()) return sorted;
    const q = inThreadSearch.trim().toLowerCase();
    return sorted.filter(
      (m) =>
        (m.messageText || '').toLowerCase().includes(q) ||
        (m.senderName || '').toLowerCase().includes(q)
    );
  }, [threadsMap, selectedThread, inThreadSearch]);

  const viewerRole = (effectiveUser?.role || 'CUSTOMER').toUpperCase();
  const viewerUsername = effectiveUser?.username || 'user';

  const activeThreadId = selectedThread?.id;
  const connectionStatus = demoModeActive ? '' : remoteStatus();
  useEffect(() => {
    if (demoModeActive || (!isOpen && !inline)) return undefined;
    return startRemoteChatSocket();
  }, [isOpen, inline, user?.username, authCtx.token, demoModeActive]);

  useEffect(() => {
    if (!demoModeActive) setRemoteActiveConversation(activeThreadId);
  }, [activeThreadId, demoModeActive]);

  useEffect(() => {
    if ((!isOpen && !inline) || minimized || !activeThreadId) return;
    if (!demoModeActive && connectionStatus) return;
    if (isChatDemoMode() && selectedThread.backendId) {
      syncChatThreadFromDb(activeThreadId, selectedThread.backendId);
    }
    markChatThreadRead({
      driverCode: activeThreadId,
      backendDriverId: selectedThread?.backendId,
      viewerRole,
      viewerUsername
    }).catch((error) => setChatError(error.message));
  }, [
    isOpen,
    inline,
    minimized,
    activeThreadId,
    selectedThread?.backendId,
    viewerRole,
    viewerUsername,
    demoModeActive,
    connectionStatus,
    currentMessages.length
  ]);

  useEffect(() => {
    if ((isOpen || inline) && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, inline, minimized, selectedThread?.id, currentMessages.length]);

  const filteredConversations = useMemo(() => {
    const byTab = conversations.filter((conv) => {
      if (threadFilter === 'UNREAD') return conv.unreadCount > 0;
      if (threadFilter === 'GROUP') return conv.type === 'GROUP';
      if (threadFilter === 'DRIVER') return conv.category === 'DRIVER';
      if (threadFilter === 'OPS') return conv.category === 'OPS';
      if (threadFilter === 'HUB_CUST')
        return conv.category === 'HUB' || conv.category === 'CUSTOMER';
      return true;
    });
    if (!threadSearch.trim()) return byTab;
    return elasticSearchMatch(byTab, threadSearch, [
      'title',
      'fullName',
      'roleLabel',
      'companyName',
      'containerCode',
      'assignedContainerCode',
      'assignedVehiclePlate'
    ]).items;
  }, [conversations, threadFilter, threadSearch]);

  const onlineContacts = useMemo(() => contacts.filter((c) => c.online).slice(0, 10), [contacts]);

  if (!isOpen && !inline) return null;

  const panelBg = isDark ? '#0b1120' : '#ffffff';
  const sidebarBg = isDark ? '#090e1a' : '#f8fafc';
  const feedBg = isDark ? '#060a14' : '#ffffff';
  const borderColor = isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const incomingBubbleBg = isDark ? '#1e293b' : '#f0f2f5';
  const inputBg = isDark ? 'rgba(30, 41, 59, 0.85)' : '#f0f2f5';

  const formattedChatError = formatChatError(chatError);
  const chatAuthRequired = !demoModeActive && remoteStatusKind() === 'AUTH_REQUIRED';
  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      setChatSandboxOverride(false);
      reconnectRemoteChat();
      await refreshRemoteChat(activeThreadId);
    } finally {
      setReconnecting(false);
    }
  };
  const handleChatRecovery = () => {
    if (chatAuthRequired) {
      window.location.assign('/login?backend=required');
      return;
    }
    return handleReconnect();
  };
  const renderInPortal = (node) =>
    !inline && typeof document !== 'undefined' ? createPortal(node, document.body) : node;

  // Minimized Facebook Messenger Chat Heads Dock
  if (!inline && minimized) {
    const chatHeads = conversations.slice(0, 4);
    return renderInPortal(
      <div
        aria-label="Thanh bong bóng chat Messenger thu nhỏ"
        style={{
          position: 'fixed',
          right: 22,
          bottom: 22,
          zIndex: 3500,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        {chatHeads.map((head) => (
          <button
            key={head.id}
            type="button"
            title={`${head.title} (${head.roleLabel})`}
            onClick={() => {
              setSelectedId(head.id);
              setMinimized(false);
            }}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              filter: 'drop-shadow(0 8px 18px rgba(15, 23, 42, 0.35))'
            }}
          >
            <MessengerAvatar
              title={head.title}
              type={head.type}
              color={head.avatarColor}
              online={head.online}
              size={50}
              isDark={isDark}
            />
            {head.unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  minWidth: 19,
                  height: 19,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.67rem',
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  border: '2px solid #ffffff'
                }}
              >
                {head.unreadCount}
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setMinimized(false)}
          style={{
            height: 46,
            padding: '0 15px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.22)',
            background: 'linear-gradient(135deg, #0084ff 0%, #059669 100%)',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 26px rgba(0, 132, 255, 0.38)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7
          }}
        >
          <MessageCircle size={16} />
          <span>Mở Messenger</span>
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Messenger"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: `1px solid ${borderColor}`,
              background: panelBg,
              color: textMain,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>
    );
  }

  const handleSend = async (customText = null, messageType = 'TEXT') => {
    if (!selectedThread || sending) return;
    const textToSend = (customText ?? draft).trim();
    if (!textToSend) return;

    const recipientKey =
      selectedThread.type === 'DM'
        ? selectedThread.username || selectedThread.id
        : selectedThread.id;
    const fingerprint = `${recipientKey}:${messageType}:${textToSend}`;
    if (pendingSend.current?.fingerprint !== fingerprint) {
      pendingSend.current = { fingerprint, id: crypto.randomUUID() };
    }
    setSending(true);
    setChatError('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    try {
      const saved = await sendGrabChatMessage({
        driverCode: selectedThread.id,
        backendDriverId: selectedThread.backendId,
        senderName: effectiveUser?.fullName || effectiveUser?.companyName || 'Điều phối CCADRO',
        senderRole: viewerRole,
        senderUsername: viewerUsername,
        containerCode:
          activeShipment?.containerCode ||
          selectedThread.containerCode ||
          selectedThread.assignedContainerCode ||
          null,
        shipmentCode: activeShipment?.shipmentCode || selectedThread.assignedShipmentCode || null,
        messageText: textToSend,
        messageType,
        clientMessageId: pendingSend.current.id
      });
      pendingSend.current = null;
      if (!isChatDemoMode() && saved?.conversationId) setSelectedId(saved.conversationId);
      if (!customText) setDraft('');
      setLocalThreadsMap(loadChatThreadsMap());
    } catch (error) {
      setChatError(error.message || 'Tin nhắn chưa được gửi. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const handleSharePin = () => {
    const dest =
      activeShipment?.destinationName ||
      effectiveUser?.department ||
      'Kho nhận hàng Doanh nghiệp CCADRO';
    handleSend(
      `📍 Điểm giao nhận: ${dest} (10.9462°N, 106.8674°E) — Liên hệ bảo vệ cổng B khi xe tới.`,
      'LOCATION'
    );
  };

  const handleShareShipmentCard = () => {
    const cont =
      activeShipment?.containerCode ||
      selectedThread?.containerCode ||
      selectedThread?.assignedContainerCode ||
      'TCKU-781920-4';
    const route = activeShipment
      ? `${activeShipment.originName} ➔ ${activeShipment.destinationName}`
      : selectedThread?.currentRoute || 'Tuyến điều phối xanh Pareto';
    handleSend(`📦 Thẻ Vận Đơn / Container ${cont} • ${route}`, 'CARD');
  };

  const handleCreateConversation = async ({ type, title, containerCode, contacts: chosen }) => {
    try {
      const newId = await createMessengerThread({
        type,
        title,
        containerCode,
        contacts: chosen,
        creator: effectiveUser
      });
      if (newId) {
        setMeta(loadMessengerMeta());
        setLocalThreadsMap(loadChatThreadsMap());
        setSelectedId(newId);
      }
      setComposeOpen(false);
    } catch (error) {
      setChatError(error.message);
    }
  };

  const handleInviteMembers = async (newContacts) => {
    try {
      if (!selectedThread) return;
      await addMembersToMessengerThread({
        threadId: selectedThread.id,
        newContacts,
        actorName: effectiveUser?.fullName || effectiveUser?.username || 'Bạn'
      });
      setMeta(loadMessengerMeta());
      setLocalThreadsMap(loadChatThreadsMap());
    } catch (error) {
      setChatError(error.message);
    }
  };

  const workspaceContent = (
    <div
      style={{
        position: 'relative',
        width: inline ? '100%' : 'min(1180px, calc(100vw - 32px))',
        height: inline ? '660px' : 'min(740px, calc(100vh - 32px))',
        borderRadius: inline ? 18 : 20,
        background: panelBg,
        border: `1px solid ${borderColor}`,
        boxShadow: inline ? '0 10px 30px rgba(15, 23, 42, 0.12)' : '0 28px 68px rgba(0, 0, 0, 0.52)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        boxSizing: 'border-box',
        color: textMain
      }}
    >
      {/* LEFT SIDEBAR: FIXED PROFESSIONAL CONVERSATION DIRECTORY & HISTORY */}
      {(!isNarrow || !mobileShowThread) && (
      <aside
        aria-label="Danh sách lịch sử trò chuyện"
        style={{
          width: isNarrow ? '100%' : 348,
          flexShrink: 0,
          minHeight: 0,
          minWidth: 0,
          background: sidebarBg,
          borderRight: isNarrow ? 'none' : `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Messenger Brand Bar (strictly flexShrink: 0 & zIndex above list) */}
        <div
          style={{
            flexShrink: 0,
            position: 'relative',
            zIndex: 5,
            background: sidebarBg,
            padding: '14px 14px 10px',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0084ff 0%, #059669 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0, 132, 255, 0.3)'
                  }}
                >
                  <MessageCircle size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    CCADRO Messenger
                  </div>
                  <div
                    style={{
                      fontSize: '0.67rem',
                      fontWeight: 700,
                      color: sandboxActive
                        ? '#d97706'
                        : formattedChatError
                          ? '#dc2626'
                          : '#31a24c',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {sandboxActive
                      ? `● Sandbox Cục Bộ (${onlineContacts.length} liên hệ)`
                      : formattedChatError
                        ? chatAuthRequired
                          ? '● Cần đăng nhập lại'
                          : '● Mất kết nối Chat (:8888)'
                        : `● ${onlineContacts.length} người trực tuyến`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setComposeOpen((v) => !v)}
                  title="Tin nhắn mới hoặc Tạo nhóm nhiều người"
                  aria-label="Tạo cuộc trò chuyện hoặc nhóm mới"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `1px solid ${composeOpen ? '#0084ff' : borderColor}`,
                    background: composeOpen ? 'rgba(0, 132, 255, 0.16)' : inputBg,
                    color: composeOpen ? '#0084ff' : textMain,
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                >
                  <SquarePen size={15} />
                </button>
                {!inline && (
                  <button
                    type="button"
                    onClick={() => setMinimized(true)}
                    title="Thu nhỏ thành bong bóng Chat Heads"
                    aria-label="Thu nhỏ thành bong bóng chat"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: `1px solid ${borderColor}`,
                      background: inputBg,
                      color: textMain,
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <Minus size={15} />
                  </button>
                )}
                {!inline && onClose && isNarrow && (
                  <button
                    type="button"
                    onClick={onClose}
                    title="Đóng Messenger"
                    aria-label="Đóng Messenger"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: `1px solid ${borderColor}`,
                      background: inputBg,
                      color: textMain,
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {!composeOpen && (
              <>
                {/* Search Bar */}
                <SearchField
                  label="Tìm cuộc trò chuyện"
                  hideLabel
                  value={threadSearch}
                  onValueChange={setThreadSearch}
                  placeholder="Tìm cuộc trò chuyện…"
                  tone="blue"
                />

                {/* Active Now Horizontal Avatar Strip */}
                <div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: textMuted,
                      marginBottom: 6
                    }}
                  >
                    ĐANG HOẠT ĐỘNG
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      overflowX: 'auto',
                      paddingBottom: 2
                    }}
                  >
                    {onlineContacts.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(person.id);
                          setMobileShowThread(true);
                        }}
                        title={`${person.fullName} — ${person.roleLabel}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 3,
                          width: 48,
                          flexShrink: 0,
                          color: textMain
                        }}
                      >
                        <MessengerAvatar
                          title={person.fullName}
                          color={person.avatarColor}
                          online={person.online}
                          size={38}
                          isDark={isDark}
                        />
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            width: '100%',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: textMuted
                          }}
                        >
                          {person.fullName
                            .replace(/\s*\([^)]*\)/g, '')
                            .trim()
                            .split(/\s+/)
                            .slice(-1)[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              {/* Filter Tabs (always visible multi-row wrap, zero clipping, live counts) */}
              <div
                role="tablist"
                aria-label="Bộ lọc nhóm và vai trò hội thoại"
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  position: 'relative',
                  zIndex: 6,
                  paddingBottom: 2
                }}
              >
                {FILTER_TABS.map((tab) => {
                  const active = threadFilter === tab.id;
                  const matchCount = conversations.filter((conv) => {
                    if (tab.id === 'UNREAD') return conv.unreadCount > 0;
                    if (tab.id === 'GROUP') return conv.type === 'GROUP';
                    if (tab.id === 'DRIVER') return conv.category === 'DRIVER';
                    if (tab.id === 'OPS') return conv.category === 'OPS';
                    if (tab.id === 'HUB_CUST')
                      return conv.category === 'HUB' || conv.category === 'CUSTOMER';
                    return true;
                  }).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      data-testid={`chat-filter-${tab.id}`}
                      onClick={() => {
                        setThreadFilter(tab.id);
                        const matching = conversations.filter((conv) => {
                          if (tab.id === 'UNREAD') return conv.unreadCount > 0;
                          if (tab.id === 'GROUP') return conv.type === 'GROUP';
                          if (tab.id === 'DRIVER') return conv.category === 'DRIVER';
                          if (tab.id === 'OPS') return conv.category === 'OPS';
                          if (tab.id === 'HUB_CUST')
                            return conv.category === 'HUB' || conv.category === 'CUSTOMER';
                          return true;
                        });
                        if (matching.length > 0 && !matching.some((c) => c.id === selectedId)) {
                          setSelectedId(matching[0].id);
                        }
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 999,
                        border: active
                          ? '1px solid #0084ff'
                          : `1px solid ${borderColor}`,
                        background: active
                          ? '#0084ff'
                          : isDark
                            ? 'rgba(30, 41, 59, 0.7)'
                            : '#ffffff',
                        color: active ? '#ffffff' : textMain,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        boxShadow: active ? '0 2px 8px rgba(0, 132, 255, 0.28)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                      {tab.id !== 'ALL' && matchCount > 0 ? ` (${matchCount})` : ''}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Left Sidebar Body: either Compose Panel OR Fixed Categorized Thread History */}
        {composeOpen ? (
          <MessengerComposePanel
            contacts={contacts}
            shipments={shipments}
            isDark={isDark}
            onCancel={() => setComposeOpen(false)}
            onCreate={handleCreateConversation}
          />
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '4px 10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxSizing: 'border-box'
            }}
          >
            {(() => {
              const pinnedList = filteredConversations.filter((c) => c.isPinned);
              const groupList = filteredConversations.filter(
                (c) => !c.isPinned && c.type === 'GROUP'
              );
              const directList = filteredConversations
                .filter((c) => !c.isPinned && c.type !== 'GROUP')
                .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));

              const sections = [
                { key: 'pinned', label: `📌 ĐÃ GHIM (${pinnedList.length})`, items: pinnedList },
                { key: 'groups', label: `👥 NHÓM ĐIỀU HÀNH (${groupList.length})`, items: groupList },
                { key: 'direct', label: `💬 HỘI THOẠI TRỰC TIẾP (${directList.length})`, items: directList }
              ].filter((sec) => sec.items.length > 0);

              const renderConversationRow = (conv) => {
                const active = selectedThread?.id === conv.id;
                const unread = conv.unreadCount > 0;
                const roleTag =
                  conv.type === 'GROUP'
                    ? `Nhóm • ${conv.memberNames?.length || 2} TV`
                    : conv.assignedVehiclePlate
                      ? `${conv.role === 'DRIVER' ? 'Tài xế' : conv.roleLabel || conv.role} • ${conv.assignedVehiclePlate}`
                      : conv.subtitle || conv.roleLabel || conv.role;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(conv.id);
                      setMobileShowThread(true);
                    }}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      textAlign: 'left',
                      padding: '10px 10px 10px 9px',
                      borderRadius: 12,
                      border: active
                        ? `1px solid ${isDark ? 'rgba(0, 132, 255, 0.42)' : 'rgba(0, 132, 255, 0.28)'}`
                        : '1px solid transparent',
                      borderLeft: active ? '3px solid #0084ff' : '3px solid transparent',
                      background: active
                        ? isDark
                          ? 'rgba(0, 132, 255, 0.16)'
                          : 'rgba(0, 132, 255, 0.08)'
                        : isDark
                          ? 'rgba(15, 23, 42, 0.32)'
                          : '#ffffff',
                      color: textMain,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: active ? '0 2px 8px rgba(0, 132, 255, 0.12)' : 'none',
                      transition: 'background 0.15s ease, border-color 0.15s ease'
                    }}
                  >
                    <MessengerAvatar
                      title={conv.title}
                      type={conv.type}
                      color={conv.avatarColor}
                      online={conv.online}
                      size={42}
                      isDark={isDark}
                    />
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {/* Row 1: Title + Fixed Right Timestamp */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          minWidth: 0
                        }}
                      >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: '0.82rem',
                              fontWeight: unread || active ? 800 : 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: textMain
                            }}
                          >
                            {conv.title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: unread ? 700 : 500,
                              fontVariantNumeric: 'tabular-nums',
                              color: unread ? '#0084ff' : textMuted,
                              flexShrink: 0
                            }}
                          >
                            {conv.lastMessage ? formatRelativeTime(conv.lastMessage.createdAt) : ''}
                          </span>
                      </div>

                        {/* Row 2: Role & Logistics Context Tag */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 2,
                            minWidth: 0
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.66rem',
                              color: conv.type === 'GROUP' ? '#0084ff' : '#059669',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0
                            }}
                          >
                            {roleTag}
                          </span>
                        </div>

                        {/* Row 3: Message Preview + Fixed Unread Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            marginTop: 3,
                            minWidth: 0
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: '0.72rem',
                              color: unread ? textMain : textMuted,
                              fontWeight: unread ? 700 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {conv.lastMessage
                              ? `${conv.lastMessage.senderUsername === viewerUsername ? 'Bạn: ' : ''}${conv.lastMessage.messageText}`
                              : 'Bắt đầu cuộc trò chuyện...'}
                          </span>

                          {unread && (
                            <span
                              style={{
                                minWidth: 18,
                                height: 18,
                                padding: '0 5px',
                                borderRadius: 999,
                                background: '#0084ff',
                                color: '#ffffff',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                };

                return sections.map((sec) => (
                  <div
                    key={sec.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minWidth: 0,
                      marginBottom: 8
                    }}
                  >
                    <div
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        padding: '6px 6px 4px',
                        background: sidebarBg,
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        color: textMuted,
                        textTransform: 'uppercase'
                      }}
                    >
                      {sec.label}
                    </div>
                    {sec.items.map(renderConversationRow)}
                  </div>
                ));
              })()}

              {filteredConversations.length === 0 && (
                <div
                  style={{
                    padding: '22px 14px',
                    textAlign: 'center',
                    fontSize: '0.76rem',
                    color: textMuted,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10
                  }}
                >
                  <div>
                    {formattedChatError
                      ? 'Chưa đồng bộ được danh sách hội thoại từ máy chủ Chat.'
                      : 'Chưa có cuộc trò chuyện nào phù hợp.'}
                  </div>
                  {!demoModeActive && !chatAuthRequired && (
                    <button
                      type="button"
                      onClick={() => setChatSandboxOverride(true)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: `1px solid ${borderColor}`,
                        background: 'rgba(0, 132, 255, 0.12)',
                        color: '#0084ff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Bật Chat Nội Bộ Cục Bộ
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fixed Bottom Account & Sync Footer */}
          <div
            style={{
              flexShrink: 0,
              padding: '9px 14px',
              borderTop: `1px solid ${borderColor}`,
              background: panelBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <MessengerAvatar
                title={effectiveUser?.fullName || viewerUsername}
                color="#059669"
                online={true}
                size={30}
                isDark={isDark}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: textMain
                  }}
                >
                  {effectiveUser?.fullName || viewerUsername}
                </div>
                <div
                  style={{
                    fontSize: '0.64rem',
                    color: textMuted,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  @{viewerUsername} • {viewerRole}
                </div>
              </div>
            </div>

            {sandboxActive && (
              <button
                type="button"
                onClick={handleReconnect}
                disabled={reconnecting}
                title="Thử đồng bộ lại với máy chủ Chat :8888"
                style={{
                  padding: '4px 9px',
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: inputBg,
                  color: '#0084ff',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {reconnecting ? 'Đang thử...' : 'Live :8888'}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* CENTER CONVERSATION PANE (minWidth: 0 prevents Safari grid/flex blowout) */}
      {(!isNarrow || mobileShowThread || !selectedThread) && (
        <section
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: feedBg
          }}
        >
          {selectedThread ? (
            <>
              {/* Conversation Header */}
              <header
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${borderColor}`,
                  background: panelBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  {isNarrow && (
                    <button
                      type="button"
                      onClick={() => setMobileShowThread(false)}
                      aria-label="Quay lại danh sách trò chuyện"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        background: inputBg,
                        color: textMain,
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <MessengerAvatar
                    title={selectedThread.title}
                    type={selectedThread.type}
                    color={selectedThread.avatarColor}
                    online={selectedThread.online}
                    size={42}
                    isDark={isDark}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <strong
                        style={{
                          fontSize: '0.93rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {selectedThread.title}
                      </strong>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: 'rgba(0, 132, 255, 0.12)',
                          color: '#0084ff',
                          fontSize: '0.67rem',
                          fontWeight: 700
                        }}
                      >
                        {selectedThread.type === 'GROUP'
                          ? `${selectedThread.memberNames?.length || 3} thành viên`
                          : selectedThread.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: 1 }}>
                      <span style={{ color: '#31a24c', fontWeight: 700 }}>● Đang hoạt động</span> •{' '}
                      {selectedThread.companyName || selectedThread.subtitle}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {selectedThread.phone && (
                    <a
                      href={`tel:${String(selectedThread.phone).replace(/[^\d+]/g, '')}`}
                      title={`Gọi ${selectedThread.phone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={14} /> Gọi
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowInfo((v) => !v)}
                    title="Thông tin đoạn chat & thêm thành viên"
                    aria-label="Thông tin đoạn chat"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: 'none',
                      background: showInfo ? 'rgba(0, 132, 255, 0.16)' : inputBg,
                      color: showInfo ? '#0084ff' : textMain,
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <Info size={16} />
                  </button>

                  {!inline && onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Đóng khung chat"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        border: 'none',
                        background: inputBg,
                        color: textMain,
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </header>

              {/* Active Shipment / Operational Context Strip */}
              {(activeShipment ||
                selectedThread.containerCode ||
                selectedThread.assignedContainerCode) && (
                  <div
                    style={{
                      padding: '7px 16px',
                      background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
                      borderBottom: `1px solid ${borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      fontSize: '0.73rem',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        color: '#059669'
                      }}
                    >
                      <Truck size={14} />
                      <span>
                        Cont{' '}
                        {activeShipment?.containerCode ||
                          selectedThread.containerCode ||
                          selectedThread.assignedContainerCode}{' '}
                        •{' '}
                        {activeShipment
                          ? `${activeShipment.originName} ➔ ${activeShipment.destinationName}`
                          : selectedThread.currentRoute || 'Đang điều phối trực tuyến'}
                      </span>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#10b981',
                        fontWeight: 700
                      }}
                    >
                      <ShieldCheck size={13} /> Đồng bộ Real-time đa vai trò
                    </span>
                  </div>
                )}

              {formattedChatError && (
                <div
                  role="alert"
                  style={{
                    padding: '8px 16px',
                    background: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2',
                    borderBottom: `1px solid ${isDark ? 'rgba(248, 113, 113, 0.35)' : '#fecaca'}`,
                    color: isDark ? '#fca5a5' : '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexShrink: 0
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} /> {formattedChatError}
                  </span>
                  <button
                    type="button"
                    onClick={handleReconnect}
                    disabled={reconnecting}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: `1px solid ${isDark ? 'rgba(248, 113, 113, 0.45)' : '#fca5a5'}`,
                      background: 'transparent',
                      color: 'inherit',
                      fontSize: '0.71rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {reconnecting ? 'Đang thử...' : 'Thử lại'}
                  </button>
                </div>
              )}

              {/* Message Feed */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                {!isChatDemoMode() && activeThreadId && remoteHasOlder(activeThreadId) && (
                  <div style={{ alignSelf: 'center', marginBottom: 8 }}>
                    <button
                      type="button"
                      disabled={loadingOlder}
                      onClick={async () => {
                        setLoadingOlder(true);
                        try {
                          await syncRemoteThread(activeThreadId, true);
                        } catch (error) {
                          setChatError(error.message);
                        } finally {
                          setLoadingOlder(false);
                        }
                      }}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 999,
                        border: `1px solid ${borderColor}`,
                        background: inputBg,
                        color: textMain,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {loadingOlder ? 'Đang tải...' : '↑ Tải tin nhắn cũ hơn'}
                    </button>
                  </div>
                )}
                {currentMessages.length === 0 ? (
                  <div
                    style={{
                      margin: 'auto',
                      textAlign: 'center',
                      maxWidth: 360,
                      padding: 22,
                      borderRadius: 16,
                      border: `1px dashed ${borderColor}`,
                      color: textMuted,
                      fontSize: '0.8rem'
                    }}
                  >
                    <MessengerAvatar
                      title={selectedThread.title}
                      type={selectedThread.type}
                      color={selectedThread.avatarColor}
                      online={selectedThread.online}
                      size={56}
                      isDark={isDark}
                    />
                    <div style={{ fontWeight: 800, color: textMain, marginTop: 10, marginBottom: 4 }}>
                      {selectedThread.title}
                    </div>
                    Hãy gửi lời chào hoặc điều phối thông tin chuyến, tọa độ kho hay mời thêm người
                    vào đoạn chat này.
                  </div>
                ) : (
                  currentMessages.map((msg, idx) => {
                    if (msg.messageType === 'SYSTEM') {
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: 'center',
                            fontSize: '0.7rem',
                            color: textMuted,
                            padding: '5px 12px',
                            margin: '6px 0',
                            borderRadius: 999,
                            background: inputBg
                          }}
                        >
                          {msg.messageText}
                        </div>
                      );
                    }

                    const msgRole = (msg.senderRole || '').toUpperCase();
                    const isMine =
                      (msg.senderUsername &&
                        viewerUsername &&
                        msg.senderUsername.toLowerCase() === viewerUsername.toLowerCase()) ||
                      (!msg.senderUsername && msgRole === viewerRole);
                    const prevMsg = currentMessages[idx - 1];
                    const nextMsg = currentMessages[idx + 1];
                    const sameSenderAsPrev =
                      prevMsg &&
                      prevMsg.messageType !== 'SYSTEM' &&
                      prevMsg.senderName === msg.senderName &&
                      prevMsg.senderRole === msg.senderRole;
                    const sameSenderAsNext =
                      nextMsg &&
                      nextMsg.messageType !== 'SYSTEM' &&
                      nextMsg.senderName === msg.senderName &&
                      nextMsg.senderRole === msg.senderRole;

                    const msgReactions = meta.reactions?.[msg.id] || {};
                    const reactionEntries = Object.entries(msgReactions).filter(
                      ([, actors]) => Array.isArray(actors) && actors.length > 0
                    );

                    return (
                      <div
                        key={msg.id}
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                          marginTop: sameSenderAsPrev ? 1 : 8
                        }}
                      >
                        {!sameSenderAsPrev && !isMine && (
                          <div
                            style={{
                              fontSize: '0.67rem',
                              color: textMuted,
                              marginBottom: 3,
                              marginLeft: 38
                            }}
                          >
                            {msg.senderName} • {msg.senderRole}
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: 8,
                            maxWidth: '82%',
                            flexDirection: isMine ? 'row-reverse' : 'row'
                          }}
                        >
                          {!isMine && (
                            <div style={{ width: 28, flexShrink: 0 }}>
                              {!sameSenderAsNext && (
                                <MessengerAvatar
                                  title={msg.senderName}
                                  color="#10b981"
                                  online={false}
                                  size={28}
                                  isDark={isDark}
                                />
                              )}
                            </div>
                          )}

                          <div style={{ position: 'relative' }}>
                            <div
                              style={{
                                padding: '9px 13px',
                                borderRadius: isMine
                                  ? `${sameSenderAsPrev ? 6 : 18}px ${sameSenderAsPrev ? 4 : 18}px ${sameSenderAsNext ? 4 : 18}px 18px`
                                  : `${sameSenderAsPrev ? 4 : 18}px 18px 18px ${sameSenderAsNext ? 4 : 18}px`,
                                background: isMine
                                  ? 'linear-gradient(135deg, #0084ff 0%, #0066da 100%)'
                                  : incomingBubbleBg,
                                color: isMine ? '#ffffff' : textMain,
                                fontSize: '0.83rem',
                                lineHeight: 1.45,
                                wordBreak: 'break-word'
                              }}
                            >
                              {msg.messageType === 'LOCATION' && (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    marginBottom: 3,
                                    opacity: 0.92
                                  }}
                                >
                                  <MapPin size={12} /> GHIM VỊ TRÍ TRỰC TIẾP
                                </div>
                              )}
                              {msg.messageType === 'CARD' && (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    marginBottom: 3,
                                    opacity: 0.92
                                  }}
                                >
                                  <Package size={12} /> THẺ VẬN ĐƠN / CONTAINER
                                </div>
                              )}
                              <div>{msg.messageText}</div>

                              {!sameSenderAsNext && (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 4,
                                    marginTop: 4,
                                    fontSize: '0.63rem',
                                    opacity: isMine ? 0.86 : 0.68
                                  }}
                                >
                                  <span>{formatClockTime(msg.createdAt)}</span>
                                  {isMine &&
                                    (msg.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                                </div>
                              )}
                            </div>

                            {/* Reaction Badges */}
                            {reactionEntries.length > 0 && (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  gap: 3,
                                  padding: '2px 6px',
                                  borderRadius: 999,
                                  background: panelBg,
                                  border: `1px solid ${borderColor}`,
                                  fontSize: '0.7rem',
                                  marginTop: 2,
                                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.14)'
                                }}
                              >
                                {reactionEntries.map(([emoji, actors]) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await toggleMessengerReaction({
                                          threadId: selectedThread.id,
                                          messageId: msg.id,
                                          emoji,
                                          actorUsername: viewerUsername
                                        });
                                        setMeta(loadMessengerMeta());
                                      } catch (error) {
                                        setChatError(error.message);
                                      }
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      padding: 0,
                                      color: textMain,
                                      fontSize: '0.7rem',
                                      fontWeight: 700
                                    }}
                                  >
                                    {emoji} {actors.length > 1 ? actors.length : ''}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Hover Emoji Reaction Bar */}
                            {hoveredMsgId === msg.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: -28,
                                  [isMine ? 'right' : 'left']: 0,
                                  display: 'inline-flex',
                                  gap: 2,
                                  padding: '3px 6px',
                                  borderRadius: 999,
                                  background: panelBg,
                                  border: `1px solid ${borderColor}`,
                                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.2)',
                                  zIndex: 10
                                }}
                              >
                                {MESSENGER_REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await toggleMessengerReaction({
                                          threadId: selectedThread.id,
                                          messageId: msg.id,
                                          emoji,
                                          actorUsername: viewerUsername
                                        });
                                        setMeta(loadMessengerMeta());
                                      } catch (error) {
                                        setChatError(error.message);
                                      }
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      fontSize: '0.82rem',
                                      padding: '0 2px'
                                    }}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer Footer (strictly bounded minWidth: 0 so quick-replies NEVER overflow) */}
              <footer
                style={{
                  padding: '10px 14px 12px',
                  borderTop: `1px solid ${borderColor}`,
                  background: panelBg,
                  flexShrink: 0,
                  minWidth: 0,
                  maxWidth: '100%',
                  position: 'relative'
                }}
              >
                {/* Quick Replies Strip */}
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginBottom: 8
                  }}
                >
                  {QUICK_REPLIES.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSend(chip, 'QUICK_REPLY')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: `1px solid ${borderColor}`,
                        background: inputBg,
                        color: isDark ? '#93c5fd' : '#0369a1',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Popover menus */}
                {showAttachMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 14,
                      bottom: 62,
                      padding: 8,
                      borderRadius: 12,
                      background: panelBg,
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
                      display: 'grid',
                      gap: 4,
                      zIndex: 20
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleSharePin}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        color: textMain,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <MapPin size={14} color="#10b981" /> Ghim Vị Trí Kho / GPS
                    </button>
                    <button
                      type="button"
                      onClick={handleShareShipmentCard}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        color: textMain,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Package size={14} color="#0084ff" /> Đính Kèm Thẻ Vận Đơn / Cont
                    </button>
                  </div>
                )}

                {showEmojiPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 60,
                      bottom: 62,
                      padding: 8,
                      borderRadius: 12,
                      background: panelBg,
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
                      display: 'flex',
                      gap: 6,
                      zIndex: 20
                    }}
                  >
                    {QUICK_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setDraft((prev) => `${prev}${em}`);
                          setShowEmojiPicker(false);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          padding: 2
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu((v) => !v);
                      setShowEmojiPicker(false);
                    }}
                    title="Gửi vị trí GPS hoặc thẻ Container"
                    aria-label="Đính kèm vị trí hoặc vận đơn"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'transparent',
                      color: '#0084ff',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <PlusCircle size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={handleSharePin}
                    title="Gửi ghim kho nhanh"
                    style={{
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 999,
                      border: `1px solid ${borderColor}`,
                      background: inputBg,
                      color: '#10b981',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0
                    }}
                  >
                    <Pin size={13} /> Ghim Kho
                  </button>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      background: inputBg,
                      borderRadius: 999,
                      padding: '0 10px 0 14px',
                      border: `1px solid ${borderColor}`
                    }}
                  >
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={`Nhắn tin tới ${selectedThread.title}...`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: 38,
                        border: 'none',
                        background: 'transparent',
                        color: textMain,
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmojiPicker((v) => !v);
                        setShowAttachMenu(false);
                      }}
                      aria-label="Chèn biểu tượng cảm xúc"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#0084ff',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        padding: 4
                      }}
                    >
                      <Smile size={18} />
                    </button>
                  </div>

                  {draft.trim() ? (
                    <button
                      type="submit"
                      disabled={sending}
                      aria-label="Gửi tin nhắn"
                      style={{
                        height: 38,
                        padding: '0 14px',
                        borderRadius: 999,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0084ff 0%, #0066da 100%)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        flexShrink: 0
                      }}
                    >
                      <Send size={14} /> Gửi
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleSend('👍', 'QUICK_REPLY')}
                      title="Gửi nhanh lượt thích 👍"
                      aria-label="Gửi nhanh thích"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: '#0084ff',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <ThumbsUp size={20} />
                    </button>
                  )}
                </form>
              </footer>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <header
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${borderColor}`,
                  background: panelBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isNarrow && (
                    <button
                      type="button"
                      onClick={() => setMobileShowThread(false)}
                      aria-label="Quay lại danh sách"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        background: inputBg,
                        color: textMain,
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: textMuted }}>
                    {formattedChatError ? 'Trạng thái Kết nối Chat Service' : 'Không gian Hội thoại CCADRO'}
                  </span>
                </div>
                {!inline && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng khung chat"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: 'none',
                      background: inputBg,
                      color: textMain,
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </header>

              <div
                style={{
                  margin: 'auto',
                  padding: '28px 26px',
                  maxWidth: 440,
                  width: 'calc(100% - 32px)',
                  borderRadius: 18,
                  background: panelBg,
                  border: `1px solid ${borderColor}`,
                  boxShadow: '0 14px 36px rgba(15, 23, 42, 0.08)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: formattedChatError
                      ? 'rgba(245, 158, 11, 0.14)'
                      : 'rgba(0, 132, 255, 0.12)',
                    color: formattedChatError ? '#d97706' : '#0084ff',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                >
                  {formattedChatError ? <WifiOff size={26} /> : <Users size={26} />}
                </div>

                <div style={{ fontSize: '1rem', fontWeight: 800, color: textMain }}>
                  {chatAuthRequired
                    ? 'Cần xác thực lại để sử dụng chat'
                    : formattedChatError
                      ? 'Chưa kết nối được Máy chủ Chat (:8888)'
                      : 'Chọn một cuộc trò chuyện để bắt đầu'}
                </div>

                <div
                  role={formattedChatError ? 'alert' : undefined}
                  style={{ fontSize: '0.8rem', color: textMuted, lineHeight: 1.55 }}
                >
                  {formattedChatError ||
                    'Chọn nhân sự điều phối, tài xế, chủ hàng B2B ở thanh bên trái hoặc bấm nút tạo nhóm mới để bắt đầu trao đổi tức thì.'}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleChatRecovery}
                    disabled={reconnecting}
                    style={{
                      padding: '9px 15px',
                      borderRadius: 10,
                      border: `1px solid ${borderColor}`,
                      background: chatAuthRequired ? '#0084ff' : inputBg,
                      color: chatAuthRequired ? '#ffffff' : textMain,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <RefreshCw size={14} />{' '}
                    {chatAuthRequired
                      ? 'Đăng nhập lại'
                      : reconnecting
                        ? 'Đang kết nối...'
                        : 'Thử kết nối lại :8888'}
                  </button>

                  {!demoModeActive && !chatAuthRequired && (
                    <button
                      type="button"
                      onClick={() => setChatSandboxOverride(true)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0084ff 0%, #059669 100%)',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 8px 20px rgba(0, 132, 255, 0.25)'
                      }}
                    >
                      <MessageCircle size={14} /> Mở Chat Nội Bộ Cục Bộ
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* RIGHT INFO DRAWER */}
      {showInfo && !isNarrow && selectedThread && (
        <MessengerInfoSidebar
          thread={selectedThread}
          contacts={contacts}
          activeShipment={activeShipment}
          inThreadSearch={inThreadSearch}
          onChangeInThreadSearch={setInThreadSearch}
          onTogglePin={async () => {
            try {
              await toggleMessengerPin(selectedThread.id);
              setMeta(loadMessengerMeta());
            } catch (error) {
              setChatError(error.message);
            }
          }}
          onToggleMute={async () => {
            try {
              await toggleMessengerMute(selectedThread.id);
              setMeta(loadMessengerMeta());
            } catch (error) {
              setChatError(error.message);
            }
          }}
          onInviteMembers={handleInviteMembers}
          onCloseInfo={() => setShowInfo(false)}
          isDark={isDark}
        />
      )}
    </div>
  );

  if (inline) {
    return workspaceContent;
  }

  return renderInPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CCADRO Messenger Đa Kênh Trực Tuyến"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3400,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box'
      }}
    >
      {workspaceContent}
    </div>
  );
}
