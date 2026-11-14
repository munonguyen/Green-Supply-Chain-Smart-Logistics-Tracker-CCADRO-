import { api } from '../services/api';

const CHAT_STORAGE_KEY = 'ccadro_driver_chat_threads_v2';
const CHAT_CHANNEL_NAME = 'ccadro_grab_chat_v1';
const CHAT_WINDOW_EVENT = 'ccadro-driver-chat-updated';

const INITIAL_CHAT_THREADS = {
  'DRV-FC-001': [
    {
      id: 'seed-msg-001',
      driverCode: 'DRV-FC-001',
      senderName: 'Vinamilk Logistics Hub',
      senderRole: 'CUSTOMER',
      senderUsername: 'shipper',
      containerCode: 'TCKU-781920-4',
      shipmentCode: 'SHP-2026-8192',
      messageText:
        'Anh Hùng ơi, container TCKU-781920-4 ra khỏi cổng Cát Lái chưa ạ? Nhớ giữ nhiệt độ lạnh -18.5°C giúp bên em nhé.',
      messageType: 'TEXT',
      channel: 'GRAB_CHAT',
      deliveryStatus: 'READ',
      read: true,
      createdAt: new Date(Date.now() - 25 * 60000).toISOString()
    },
    {
      id: 'seed-msg-002',
      driverCode: 'DRV-FC-001',
      senderName: 'Nguyễn Văn Hùng',
      senderRole: 'DRIVER',
      senderUsername: 'driver',
      containerCode: 'TCKU-781920-4',
      shipmentCode: 'SHP-2026-8192',
      messageText:
        'Dạ em vừa qua trạm thu phí Cao tốc Long Thành – Dầu Giây, máy lạnh vẫn ổn định -18.4°C và e-Seal nguyên vẹn ạ.',
      messageType: 'TEXT',
      channel: 'GRAB_CHAT',
      deliveryStatus: 'READ',
      read: true,
      createdAt: new Date(Date.now() - 21 * 60000).toISOString()
    },
    {
      id: 'seed-msg-003',
      driverCode: 'DRV-FC-001',
      senderName: 'Nguyễn Văn Hùng',
      senderRole: 'DRIVER',
      senderUsername: 'driver',
      containerCode: 'TCKU-781920-4',
      shipmentCode: 'SHP-2026-8192',
      messageText:
        'Dự kiến 32 phút nữa em tới KCN Amata Biên Hòa, khi tới cổng kho em gọi số bảo vệ ạ.',
      messageType: 'TEXT',
      channel: 'GRAB_CHAT',
      deliveryStatus: 'DELIVERED_PORTAL',
      read: false,
      createdAt: new Date(Date.now() - 14 * 60000).toISOString()
    }
  ],
  'DRV-FC-002': [
    {
      id: 'seed-msg-004',
      driverCode: 'DRV-FC-002',
      senderName: 'Vinamilk Logistics Hub',
      senderRole: 'CUSTOMER',
      senderUsername: 'shipper',
      containerCode: 'MSKU-492018-7',
      shipmentCode: 'SHP-2026-4920',
      messageText:
        'Anh Khôi chạy êm qua đoạn vòng xoay Mỹ Thủy giúp em để hạn chế rung lắc linh kiện điện tử nhé.',
      messageType: 'TEXT',
      channel: 'GRAB_CHAT',
      deliveryStatus: 'READ',
      read: true,
      createdAt: new Date(Date.now() - 18 * 60000).toISOString()
    },
    {
      id: 'seed-msg-005',
      driverCode: 'DRV-FC-002',
      senderName: 'Lê Minh Khôi',
      senderRole: 'DRIVER',
      senderUsername: 'driver',
      containerCode: 'MSKU-492018-7',
      shipmentCode: 'SHP-2026-4920',
      messageText:
        'Ok em, xe đầu kéo EV chạy rất êm, gia tốc kế đang chỉ 0.12G. Em cứ theo dõi trực tiếp trên bản đồ nhé!',
      messageType: 'TEXT',
      channel: 'GRAB_CHAT',
      deliveryStatus: 'DELIVERED_PORTAL',
      read: false,
      createdAt: new Date(Date.now() - 10 * 60000).toISOString()
    }
  ],
  'DRV-FC-003': [
    {
      id: 'seed-msg-006',
      driverCode: 'DRV-FC-003',
      senderName: 'Trần Hoàng Nam',
      senderRole: 'DRIVER',
      senderUsername: 'driver',
      containerCode: 'CMAU-821903-2',
      shipmentCode: 'SHP-2026-8219',
      messageText:
        'Chào anh/chị chủ hàng, xe em đang đi tới ngã tư Bình Phước, dự kiến 18 phút nữa vào bãi VSIP 1 ạ.',
      messageType: 'TEXT',
      channel: 'GRAB_CHAT',
      deliveryStatus: 'DELIVERED_PORTAL',
      read: false,
      createdAt: new Date(Date.now() - 6 * 60000).toISOString()
    }
  ]
};

let chatBroadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    chatBroadcastChannel = new BroadcastChannel(CHAT_CHANNEL_NAME);
  }
} catch (_) {
  chatBroadcastChannel = null;
}

function notifyChatListeners() {
  try {
    window.dispatchEvent(new CustomEvent(CHAT_WINDOW_EVENT));
  } catch (_) {
    // ignore
  }
  try {
    chatBroadcastChannel?.postMessage({ type: 'CHAT_UPDATED', ts: Date.now() });
  } catch (_) {
    // ignore
  }
}

export function loadChatThreadsMap() {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...INITIAL_CHAT_THREADS, ...parsed };
      }
    }
  } catch (_) {
    // ignore
  }
  return { ...INITIAL_CHAT_THREADS };
}

export function saveChatThreadsMap(map) {
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(map));
  } catch (_) {
    // ignore
  }
  notifyChatListeners();
}

export function getUnreadCountForViewer(threadsMap, viewerRole, driverCode = null) {
  const normalizedViewer = (viewerRole || 'CUSTOMER').toUpperCase();
  const keys = driverCode ? [driverCode] : Object.keys(threadsMap || {});
  return keys.reduce((total, code) => {
    const list = Array.isArray(threadsMap?.[code]) ? threadsMap[code] : [];
    const unread = list.filter(
      (m) => !m.read && (m.senderRole || 'CUSTOMER').toUpperCase() !== normalizedViewer
    ).length;
    return total + unread;
  }, 0);
}

export async function sendGrabChatMessage({
  driverCode,
  backendDriverId,
  senderName,
  senderRole = 'CUSTOMER',
  senderUsername,
  containerCode,
  shipmentCode,
  messageText,
  messageType = 'TEXT'
}) {
  const cleanText = (messageText || '').trim();
  if (!driverCode || !cleanText) return null;

  const localEntry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    driverCode,
    senderName: senderName || (senderRole === 'DRIVER' ? 'Tài xế Cabin' : 'Khách hàng B2B'),
    senderRole: senderRole.toUpperCase(),
    senderUsername: senderUsername || '',
    containerCode: containerCode || null,
    shipmentCode: shipmentCode || null,
    messageText: cleanText,
    messageType: messageType.toUpperCase(),
    channel: 'GRAB_CHAT',
    deliveryStatus: senderRole.toUpperCase() === 'DRIVER' ? 'DELIVERED_PORTAL' : 'DELIVERED_CABIN_OS',
    read: false,
    createdAt: new Date().toISOString()
  };

  const map = loadChatThreadsMap();
  const existing = Array.isArray(map[driverCode]) ? map[driverCode] : [];
  const nextMap = { ...map, [driverCode]: [...existing, localEntry] };
  saveChatThreadsMap(nextMap);

  if (backendDriverId) {
    try {
      const res = await api.sendDriverDispatchMessage(backendDriverId, {
        senderName: localEntry.senderName,
        senderRole: localEntry.senderRole,
        senderUsername: localEntry.senderUsername,
        containerCode: localEntry.containerCode,
        shipmentCode: localEntry.shipmentCode,
        messageText: localEntry.messageText,
        messageType: localEntry.messageType,
        channel: 'GRAB_CHAT'
      });
      const saved = res?.result || res?.data || res;
      if (saved?.id) {
        const refreshed = loadChatThreadsMap();
        const thread = Array.isArray(refreshed[driverCode]) ? refreshed[driverCode] : [];
        const synced = thread.map((item) =>
          item.id === localEntry.id
            ? {
                ...localEntry,
                id: saved.id,
                deliveryStatus: saved.deliveryStatus || localEntry.deliveryStatus,
                createdAt: saved.createdAt || localEntry.createdAt
              }
            : item
        );
        saveChatThreadsMap({ ...refreshed, [driverCode]: synced });
      }
    } catch (_) {
      // Fallback safely keeps local realtime chat active
    }
  }

  return localEntry;
}

export async function syncChatThreadFromDb(driverCode, backendDriverId) {
  if (!driverCode || !backendDriverId) return;
  try {
    const res = await api.getDriverDispatchMessages(backendDriverId);
    const dbMessages = res?.result || res?.data || res;
    if (!Array.isArray(dbMessages) || dbMessages.length === 0) return;

    const map = loadChatThreadsMap();
    const localList = Array.isArray(map[driverCode]) ? map[driverCode] : [];
    const seenKeys = new Set(
      localList.map((m) => `${m.id}::${m.messageText}::${(m.createdAt || '').slice(0, 16)}`)
    );

    const normalizedDb = dbMessages.map((m) => ({
      id: m.id,
      driverCode,
      senderName: m.senderName || 'Điều phối B2B',
      senderRole: (m.senderRole || 'CUSTOMER').toUpperCase(),
      senderUsername: m.senderUsername || '',
      containerCode: m.containerCode || null,
      shipmentCode: m.shipmentCode || null,
      messageText: m.messageText || '',
      messageType: m.messageType || 'TEXT',
      channel: m.channel || 'GRAB_CHAT',
      deliveryStatus: m.deliveryStatus || 'DELIVERED',
      read: Boolean(m.read),
      createdAt: m.createdAt || new Date().toISOString()
    }));

    const merged = [...localList];
    normalizedDb.forEach((dbItem) => {
      const key = `${dbItem.id}::${dbItem.messageText}::${(dbItem.createdAt || '').slice(0, 16)}`;
      const duplicateByText = merged.some(
        (m) => m.id === dbItem.id || (m.messageText === dbItem.messageText && m.senderRole === dbItem.senderRole)
      );
      if (!seenKeys.has(key) && !duplicateByText) {
        merged.push(dbItem);
      }
    });

    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    saveChatThreadsMap({ ...map, [driverCode]: merged });
  } catch (_) {
    // offline standalone mode keeps cached threads
  }
}

export async function markChatThreadRead({ driverCode, backendDriverId, viewerRole = 'CUSTOMER' }) {
  if (!driverCode) return;
  const normalizedViewer = viewerRole.toUpperCase();
  const map = loadChatThreadsMap();
  const list = Array.isArray(map[driverCode]) ? map[driverCode] : [];
  let changed = false;

  const updated = list.map((m) => {
    if (!m.read && (m.senderRole || 'CUSTOMER').toUpperCase() !== normalizedViewer) {
      changed = true;
      return { ...m, read: true, deliveryStatus: 'READ' };
    }
    return m;
  });

  if (changed) {
    saveChatThreadsMap({ ...map, [driverCode]: updated });
  }

  if (backendDriverId && changed) {
    api.markDriverMessagesAsRead(backendDriverId, normalizedViewer).catch(() => {});
  }
}

export function subscribeDriverChat(onUpdate) {
  const handleStorage = (e) => {
    if (!e || e.key === CHAT_STORAGE_KEY) {
      onUpdate();
    }
  };
  const handleCustom = () => onUpdate();
  const handleBroadcast = () => onUpdate();

  window.addEventListener('storage', handleStorage);
  window.addEventListener(CHAT_WINDOW_EVENT, handleCustom);
  chatBroadcastChannel?.addEventListener('message', handleBroadcast);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CHAT_WINDOW_EVENT, handleCustom);
    chatBroadcastChannel?.removeEventListener('message', handleBroadcast);
  };
}

