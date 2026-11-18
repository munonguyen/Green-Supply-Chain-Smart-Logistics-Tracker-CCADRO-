import { api } from '../services/api';
import { readJsonObject, writeJsonStore } from './storage';
import { remoteThreads, remoteMeta, remoteConversations, remoteUnreadCount, createRemoteThread, inviteRemoteMembers,
  sendRemoteMessage, syncRemoteThread, readRemoteThread, reactRemote, preferenceRemote } from './remoteChat';
let chatSandboxOverride = false;
export function setChatSandboxOverride(enabled) {
  chatSandboxOverride = Boolean(enabled);
  try {
    window.dispatchEvent(new CustomEvent('ccadro-driver-chat-updated'));
  } catch (_) {
    // ignore SSR/non-window
  }
}
export function isChatSandboxOverride() {
  return chatSandboxOverride;
}
export function isChatDemoMode() {
  return import.meta.env.VITE_CHAT_DEMO_MODE === 'true' || chatSandboxOverride;
}


const CHAT_STORAGE_KEY = 'ccadro_driver_chat_threads_v2';
const MESSENGER_META_KEY = 'ccadro_messenger_meta_v1';
const CHAT_CHANNEL_NAME = 'ccadro_grab_chat_v1';
const CHAT_WINDOW_EVENT = 'ccadro-driver-chat-updated';

export const MESSENGER_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const SEEDED_DRIVER_DIRECTORY = [
  {
    driverCode: 'DRV-FC-001',
    backendId: 'b0000000-0000-0000-0000-000000000001',
    fullName: 'Nguyễn Văn Hùng',
    phone: '0903 812 456',
    liveStatus: 'ON_TRIP',
    assignedVehiclePlate: '51C-888.99',
    assignedContainerCode: 'TCKU-781920-4',
    assignedShipmentCode: 'SHP-2026-8192',
    currentHub: 'Depot Cát Lái -> KCN Amata Biên Hòa',
    rating: 4.96
  },
  {
    driverCode: 'DRV-FC-002',
    backendId: 'b0000000-0000-0000-0000-000000000002',
    fullName: 'Lê Minh Khôi',
    phone: '0918 442 790',
    liveStatus: 'ON_TRIP',
    assignedVehiclePlate: '51D-686.88',
    assignedContainerCode: 'MSKU-492018-7',
    assignedShipmentCode: 'SHP-2026-4920',
    currentHub: 'ICD Sóng Thần -> Cảng Cái Mép',
    rating: 4.94
  },
  {
    driverCode: 'DRV-FC-003',
    backendId: 'b0000000-0000-0000-0000-000000000003',
    fullName: 'Trần Hoàng Nam',
    phone: '0909 551 304',
    liveStatus: 'AVAILABLE',
    assignedVehiclePlate: '61C-339.79',
    assignedContainerCode: 'CMAU-821903-2',
    assignedShipmentCode: 'SHP-2026-8219',
    currentHub: 'KCN VSIP 1, Bình Dương',
    rating: 4.91
  }
];

export const SEEDED_PEOPLE_CONTACTS = [
  {
    id: 'NOC-DISPATCHER-01',
    username: 'dispatcher',
    fullName: 'Phạm Thảo Vy',
    role: 'DISPATCHER',
    roleLabel: 'Điều phối viên NOC',
    companyName: 'CCADRO Logistics Nội Bộ',
    department: 'Trung tâm Điều phối & Lộ trình (NOC)',
    phone: '1900 6868 (Nhánh 1)',
    online: true,
    statusText: 'Đang trực ca điều phối tuyến Pareto'
  },
  {
    id: 'NOC-ADMIN-CSKH',
    username: 'admin',
    fullName: 'Nguyễn Minh Quân (CSKH / Admin)',
    role: 'ADMIN',
    roleLabel: 'Quản trị & Hỗ trợ B2B',
    companyName: 'CCADRO Logistics Nội Bộ',
    department: 'Ban Điều hành & Chăm sóc Khách hàng 24/7',
    phone: '1900 6868 (Nhánh 0)',
    online: true,
    statusText: 'Trực tuyến 24/7 • Hỗ trợ tài khoản & hợp đồng'
  },
  {
    id: 'NOC-SAFETY-01',
    username: 'safety',
    fullName: 'Đặng Quốc Bảo',
    role: 'SAFETY_MANAGER',
    roleLabel: 'Giám sát An toàn Đội xe',
    companyName: 'CCADRO Logistics Nội Bộ',
    department: 'Phòng An toàn & Kiểm định Kỹ thuật',
    phone: '0901 234 555',
    online: true,
    statusText: 'Đang kiểm soát cảnh báo lệch tuyến UC09'
  },
  {
    id: 'CUST-VINAMILK-01',
    username: 'customer',
    fullName: 'Vinamilk Logistics Hub',
    role: 'CUSTOMER',
    roleLabel: 'Chủ hàng B2B (Net-30)',
    companyName: 'CTCP Sữa Việt Nam (Vinamilk)',
    department: 'Kho Lạnh Trung Tâm Bình Dương',
    phone: '028 5415 5555',
    online: true,
    statusText: 'Đang theo dõi đơn hàng lạnh TCKU-781920-4'
  },
  {
    id: 'HUB-DINHBANG-MGR',
    username: 'hub_mgr_dinhbang',
    fullName: 'Trần Minh Quang',
    role: 'HUB_MANAGER',
    roleLabel: 'Trưởng Hub Đình Bảng',
    companyName: 'Bưu Cục Hub Đình Bảng Bắc Ninh',
    department: 'Kho Trung Chuyển HUB-DINHBANG-BN',
    phone: '0982 311 908',
    online: true,
    statusText: 'Đang tiếp nhận manifest & phân phát 3PL'
  },
  {
    id: 'HUB-SHIPPER-01',
    username: 'shipper',
    fullName: 'Nguyễn Văn Toàn',
    role: 'HUB_SHIPPER',
    roleLabel: 'Shipper Last-Mile SHP-BN-001',
    companyName: 'Bưu Cục Hub Đình Bảng Bắc Ninh',
    department: 'Tuyến giao nội tỉnh Bắc Ninh',
    phone: '0977 889 102',
    online: true,
    statusText: 'Đang giao chặng cuối • Có Photo POD'
  }
];

export const SEEDED_GROUP_THREADS = [
  {
    id: 'GRP-TCKU-781920-4',
    type: 'GROUP',
    title: 'Nhóm Chuyến Cont TCKU-781920-4',
    subtitle: 'Cát Lái ➔ KCN Amata • 3 thành viên',
    containerCode: 'TCKU-781920-4',
    shipmentCode: 'SHP-2026-8192',
    memberIds: ['DRV-FC-001', 'NOC-DISPATCHER-01', 'CUST-VINAMILK-01'],
    memberNames: ['Nguyễn Văn Hùng (Tài xế)', 'Phạm Thảo Vy (NOC)', 'Vinamilk Hub'],
    online: true,
    pinned: true
  },
  {
    id: 'GRP-HUB-DINHBANG',
    type: 'GROUP',
    title: 'Vận Hành Hub Đình Bảng & Shipper 3PL',
    subtitle: 'Điều phối Last-Mile HUB-DINHBANG-BN • 3 thành viên',
    containerCode: 'MSKU-492018-7',
    shipmentCode: 'SHP-2026-4920',
    memberIds: ['HUB-DINHBANG-MGR', 'HUB-SHIPPER-01', 'NOC-DISPATCHER-01'],
    memberNames: ['Trần Minh Quang (Hub Mgr)', 'Nguyễn Văn Toàn (Shipper)', 'Phạm Thảo Vy (NOC)'],
    online: true,
    pinned: false
  }
];

const INITIAL_CHAT_THREADS = {
  'DRV-FC-001': [
    {
      id: 'seed-msg-001',
      driverCode: 'DRV-FC-001',
      senderName: 'Vinamilk Logistics Hub',
      senderRole: 'CUSTOMER',
      senderUsername: 'customer',
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
      senderUsername: 'customer',
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
  ],
  'GRP-TCKU-781920-4': [
    {
      id: 'seed-grp-001',
      driverCode: 'GRP-TCKU-781920-4',
      senderName: 'Phạm Thảo Vy (Điều phối NOC)',
      senderRole: 'DISPATCHER',
      senderUsername: 'dispatcher',
      containerCode: 'TCKU-781920-4',
      shipmentCode: 'SHP-2026-8192',
      messageText:
        'NOC đã kích hoạt tuyến Pareto xanh qua Cao tốc Long Thành để tránh ùn tắc Vành đai 2. Nhờ anh Hùng & kho Vinamilk xác nhận khung giờ dock-in.',
      messageType: 'TEXT',
      channel: 'MESSENGER',
      deliveryStatus: 'READ',
      read: true,
      createdAt: new Date(Date.now() - 28 * 60000).toISOString()
    },
    {
      id: 'seed-grp-002',
      driverCode: 'GRP-TCKU-781920-4',
      senderName: 'Nguyễn Văn Hùng',
      senderRole: 'DRIVER',
      senderUsername: 'driver',
      containerCode: 'TCKU-781920-4',
      shipmentCode: 'SHP-2026-8192',
      messageText:
        'Em đã nhận lộ trình Pareto mới trên Cabin OS, pin xe điện đang 78%, tốc độ 62 km/h ạ.',
      messageType: 'TEXT',
      channel: 'MESSENGER',
      deliveryStatus: 'DELIVERED_PORTAL',
      read: false,
      createdAt: new Date(Date.now() - 12 * 60000).toISOString()
    }
  ],
  'NOC-DISPATCHER-01': [
    {
      id: 'seed-noc-001',
      driverCode: 'NOC-DISPATCHER-01',
      senderName: 'Phạm Thảo Vy',
      senderRole: 'DISPATCHER',
      senderUsername: 'dispatcher',
      messageText:
        'Chào bạn, Trung tâm Điều hành NOC luôn trực 24/7. Bạn cần hỗ trợ đổi tuyến, cấp xe gấp hoặc ưu tiên dock-in hãy nhắn trực tiếp tại đây nhé!',
      messageType: 'TEXT',
      channel: 'MESSENGER',
      deliveryStatus: 'DELIVERED_PORTAL',
      read: false,
      createdAt: new Date(Date.now() - 9 * 60000).toISOString()
    }
  ],
  'GRP-HUB-DINHBANG': [
    {
      id: 'seed-hub-001',
      driverCode: 'GRP-HUB-DINHBANG',
      senderName: 'Trần Minh Quang',
      senderRole: 'HUB_MANAGER',
      senderUsername: 'hub_mgr_dinhbang',
      messageText:
        'Anh Toàn (@shipper) nhớ quét mã ePOD và chụp ảnh chữ ký người nhận ở KCN Từ Sơn xong đồng bộ về Hub nhé.',
      messageType: 'TEXT',
      channel: 'MESSENGER',
      deliveryStatus: 'READ',
      read: true,
      createdAt: new Date(Date.now() - 16 * 60000).toISOString()
    },
    {
      id: 'seed-hub-002',
      driverCode: 'GRP-HUB-DINHBANG',
      senderName: 'Nguyễn Văn Toàn',
      senderRole: 'HUB_SHIPPER',
      senderUsername: 'shipper',
      messageText: 'Dạ anh, em vừa bàn giao xong 4/5 kiện khu VSIP Bắc Ninh rồi ạ.',
      messageType: 'TEXT',
      channel: 'MESSENGER',
      deliveryStatus: 'DELIVERED_PORTAL',
      read: false,
      createdAt: new Date(Date.now() - 4 * 60000).toISOString()
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
  if (!isChatDemoMode()) return remoteThreads();
  const parsed = readJsonObject(CHAT_STORAGE_KEY, null);
  return parsed ? { ...INITIAL_CHAT_THREADS, ...parsed } : { ...INITIAL_CHAT_THREADS };
}

export function saveChatThreadsMap(map) {
  writeJsonStore(CHAT_STORAGE_KEY, map);
  notifyChatListeners();
}

export function loadMessengerMeta() {
  if (!isChatDemoMode()) return remoteMeta();
  const fallback = {
    customThreads: [],
    reactions: {
      'seed-msg-002': { '👍': ['customer'] },
      'seed-grp-002': { '🔥': ['dispatcher'] }
    },
    pinnedIds: ['GRP-TCKU-781920-4'],
    mutedIds: []
  };
  const parsed = readJsonObject(MESSENGER_META_KEY, null);
  if (parsed) {
    return {
      customThreads: Array.isArray(parsed.customThreads) ? parsed.customThreads : [],
      reactions: { ...fallback.reactions, ...(parsed.reactions || {}) },
      pinnedIds: Array.isArray(parsed.pinnedIds) ? parsed.pinnedIds : fallback.pinnedIds,
      mutedIds: Array.isArray(parsed.mutedIds) ? parsed.mutedIds : []
    };
  }
  return fallback;
}

export function saveMessengerMeta(meta) {
  writeJsonStore(MESSENGER_META_KEY, meta);
  notifyChatListeners();
}

export function toggleMessengerReaction({ threadId, messageId, emoji, actorUsername = 'me' }) {
  if (!isChatDemoMode()) return reactRemote({ threadId, messageId, emoji });
  if (!messageId || !emoji) return loadMessengerMeta();
  const meta = loadMessengerMeta();
  const currentForMsg = { ...(meta.reactions?.[messageId] || {}) };
  const actors = Array.isArray(currentForMsg[emoji]) ? [...currentForMsg[emoji]] : [];
  const existsIdx = actors.indexOf(actorUsername);
  if (existsIdx >= 0) {
    actors.splice(existsIdx, 1);
  } else {
    actors.push(actorUsername);
  }
  if (actors.length === 0) {
    delete currentForMsg[emoji];
  } else {
    currentForMsg[emoji] = actors;
  }
  const next = {
    ...meta,
    reactions: {
      ...meta.reactions,
      [messageId]: currentForMsg,
      _lastThreadId: threadId || undefined
    }
  };
  saveMessengerMeta(next);
  return next;
}

export function toggleMessengerPin(threadId) {
  if (!isChatDemoMode()) return preferenceRemote(threadId, 'pinned');
  const meta = loadMessengerMeta();
  const exists = meta.pinnedIds.includes(threadId);
  const next = {
    ...meta,
    pinnedIds: exists ? meta.pinnedIds.filter((id) => id !== threadId) : [threadId, ...meta.pinnedIds]
  };
  saveMessengerMeta(next);
  return next;
}

export function toggleMessengerMute(threadId) {
  if (!isChatDemoMode()) return preferenceRemote(threadId, 'muted');
  const meta = loadMessengerMeta();
  const exists = meta.mutedIds.includes(threadId);
  const next = {
    ...meta,
    mutedIds: exists ? meta.mutedIds.filter((id) => id !== threadId) : [...meta.mutedIds, threadId]
  };
  saveMessengerMeta(next);
  return next;
}

export function createMessengerThread({
  type = 'DM',
  title,
  contacts = [],
  containerCode = null,
  shipmentCode = null,
  creator
}) {
  const meta = loadMessengerMeta();
  if (!isChatDemoMode()) return createRemoteThread({ type, title, contacts, containerCode, shipmentCode });
  const cleanMembers = Array.isArray(contacts) ? contacts.filter(Boolean) : [];
  if (cleanMembers.length === 0) return null;

  // If creating 1-on-1 DM and contact already has canonical thread id, return that thread
  if (type === 'DM' && cleanMembers.length === 1) {
    return cleanMembers[0].id;
  }

  const threadId = `GRP-${Date.now().toString(36).toUpperCase()}`;
  const creatorName = creator?.fullName || creator?.username || 'Bạn';
  const memberIds = cleanMembers.map((m) => m.id);
  const memberNames = cleanMembers.map((m) => m.fullName);
  const computedTitle =
    (title || '').trim() ||
    (cleanMembers.length > 1
      ? `${cleanMembers[0].fullName}, ${cleanMembers[1].fullName}${cleanMembers.length > 2 ? ` +${cleanMembers.length - 2}` : ''}`
      : cleanMembers[0].fullName);

  const newGroup = {
    id: threadId,
    type: 'GROUP',
    title: computedTitle,
    subtitle: `${cleanMembers.length + 1} thành viên${containerCode ? ` • Cont ${containerCode}` : ''}`,
    containerCode: containerCode || null,
    shipmentCode: shipmentCode || null,
    memberIds,
    memberNames: [creatorName, ...memberNames],
    online: true
  };

  saveMessengerMeta({
    ...meta,
    customThreads: [newGroup, ...(meta.customThreads || [])],
    pinnedIds: [threadId, ...(meta.pinnedIds || [])]
  });

  const threadsMap = loadChatThreadsMap();
  saveChatThreadsMap({
    ...threadsMap,
    [threadId]: [
      {
        id: `sys-${Date.now()}`,
        driverCode: threadId,
        senderName: creatorName,
        senderRole: (creator?.role || 'SYSTEM').toUpperCase(),
        senderUsername: creator?.username || 'system',
        containerCode: containerCode || null,
        shipmentCode: shipmentCode || null,
        messageText: `${creatorName} đã tạo nhóm chat "${computedTitle}" cùng ${memberNames.join(', ')}.`,
        messageType: 'SYSTEM',
        channel: 'MESSENGER',
        deliveryStatus: 'READ',
        read: true,
        createdAt: new Date().toISOString()
      }
    ]
  });

  return threadId;
}

export function addMembersToMessengerThread({ threadId, newContacts = [], actorName = 'Điều phối viên' }) {
  if (!isChatDemoMode()) return inviteRemoteMembers({ threadId, newContacts });
  if (!threadId || !Array.isArray(newContacts) || newContacts.length === 0) return null;
  const meta = loadMessengerMeta();
  const baseGroup = SEEDED_GROUP_THREADS.find((g) => g.id === threadId);
  const existingCustom = meta.customThreads.find((g) => g.id === threadId);

  const currentMembers = existingCustom?.memberIds || baseGroup?.memberIds || [threadId];
  const currentNames = existingCustom?.memberNames || baseGroup?.memberNames || [];
  const mergedIds = Array.from(new Set([...currentMembers, ...newContacts.map((c) => c.id)]));
  const mergedNames = Array.from(
    new Set([...currentNames, ...newContacts.map((c) => c.fullName)])
  );

  let nextCustomThreads;
  if (existingCustom) {
    nextCustomThreads = meta.customThreads.map((g) =>
      g.id === threadId
        ? {
            ...g,
            type: 'GROUP',
            memberIds: mergedIds,
            memberNames: mergedNames,
            subtitle: `${mergedNames.length} thành viên • Nhóm điều phối`
          }
        : g
    );
  } else {
    const newId = baseGroup ? threadId : threadId;
    nextCustomThreads = [
      {
        id: newId,
        type: 'GROUP',
        title: baseGroup?.title || `Nhóm cùng ${mergedNames.slice(0, 2).join(', ')}`,
        subtitle: `${mergedNames.length} thành viên • Nhóm điều phối`,
        containerCode: baseGroup?.containerCode || null,
        shipmentCode: baseGroup?.shipmentCode || null,
        memberIds: mergedIds,
        memberNames: mergedNames,
        online: true
      },
      ...meta.customThreads
    ];
  }

  saveMessengerMeta({
    ...meta,
    customThreads: nextCustomThreads
  });

  const threadsMap = loadChatThreadsMap();
  const list = Array.isArray(threadsMap[threadId]) ? threadsMap[threadId] : [];
  saveChatThreadsMap({
    ...threadsMap,
    [threadId]: [
      ...list,
      {
        id: `sys-add-${Date.now()}`,
        driverCode: threadId,
        senderName: actorName,
        senderRole: 'SYSTEM',
        messageText: `➕ ${actorName} đã mời ${newContacts.map((c) => c.fullName).join(', ')} tham gia đoạn chat.`,
        messageType: 'SYSTEM',
        channel: 'MESSENGER',
        deliveryStatus: 'READ',
        read: true,
        createdAt: new Date().toISOString()
      }
    ]
  });

  return mergedIds;
}

export function buildMessengerContacts({ drivers = [], accounts = [], currentUser = null }) {
  const effectiveDrivers = drivers.length > 0 ? drivers : SEEDED_DRIVER_DIRECTORY;
  const contactMap = new Map();

  effectiveDrivers.forEach((d) => {
    const id = d.driverCode;
    if (!id) return;
    contactMap.set(id, {
      id,
      type: 'DM',
      category: 'DRIVER',
      driverCode: d.driverCode,
      backendId: d.backendId || null,
      username: `driver_${d.driverCode.toLowerCase()}`,
      fullName: d.fullName,
      role: 'DRIVER',
      roleLabel: `Tài xế • ${d.assignedVehiclePlate || 'BEV'}`,
      companyName: 'Đội xe Vận tải Xanh CCADRO',
      phone: d.phone || '0903 812 456',
      liveStatus: d.liveStatus || 'AVAILABLE',
      online: true,
      rating: d.rating || 4.95,
      assignedVehiclePlate: d.assignedVehiclePlate,
      assignedContainerCode: d.assignedContainerCode,
      assignedShipmentCode: d.assignedShipmentCode,
      currentRoute: d.currentRoute || d.currentHub || 'Đang trực tại Depot',
      avatarColor: '#059669'
    });
  });

  SEEDED_PEOPLE_CONTACTS.forEach((p) => {
    if (!contactMap.has(p.id)) {
      contactMap.set(p.id, {
        ...p,
        type: 'DM',
        category: ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER'].includes(p.role)
          ? 'OPS'
          : ['HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR'].includes(p.role)
            ? 'HUB'
            : 'CUSTOMER',
        avatarColor:
          p.role === 'DISPATCHER'
            ? '#0084ff'
            : p.role === 'ADMIN'
              ? '#7c3aed'
              : p.role === 'SAFETY_MANAGER'
                ? '#d97706'
                : p.role === 'CUSTOMER'
                  ? '#0284c7'
                  : '#0d9488'
      });
    }
  });

  (accounts || [])
    .filter((acc) => !acc.isDeleted && acc.username !== currentUser?.username)
    .forEach((acc) => {
      const existsByUsername = Array.from(contactMap.values()).some(
        (c) => c.username === acc.username
      );
      if (existsByUsername) return;
      const id = `USR-${acc.username.toUpperCase()}`;
      contactMap.set(id, {
        id,
        type: 'DM',
        category:
          acc.role === 'DRIVER'
            ? 'DRIVER'
            : ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'].includes(acc.role)
              ? 'OPS'
              : ['HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR', 'SHIPPER'].includes(acc.role)
                ? 'HUB'
                : 'CUSTOMER',
        username: acc.username,
        fullName: acc.fullName || acc.username,
        role: acc.role,
        roleLabel: acc.jobTitle || acc.roleLabel || acc.role,
        companyName: acc.companyName || acc.department || 'Đối tác CCADRO',
        taxCode: acc.taxCode || '',
        phone: acc.phone || '',
        online: !acc.locked,
        statusText: acc.locked ? 'Tài khoản đang tạm khóa' : acc.department || 'Đang hoạt động',
        avatarColor: acc.color || '#0084ff'
      });
    });

  return Array.from(contactMap.values());
}

export function buildMessengerConversations({
  drivers = [],
  accounts = [],
  currentUser = null,
  threadsMap = {},
  meta = null
}) {
  if (!isChatDemoMode()) return remoteConversations();
  const resolvedMeta = meta || loadMessengerMeta();
  const contacts = buildMessengerContacts({ drivers, accounts, currentUser });
  const pinnedSet = new Set(resolvedMeta.pinnedIds || []);
  const mutedSet = new Set(resolvedMeta.mutedIds || []);

  const customById = new Map((resolvedMeta.customThreads || []).map((g) => [g.id, g]));
  const groupMergedMap = new Map();
  SEEDED_GROUP_THREADS.forEach((g) => groupMergedMap.set(g.id, customById.get(g.id) || g));
  (resolvedMeta.customThreads || []).forEach((g) => {
    if (!groupMergedMap.has(g.id)) {
      groupMergedMap.set(g.id, g);
    }
  });

  const viewerRole = (currentUser?.role || 'CUSTOMER').toUpperCase();
  const viewerUsername = (currentUser?.username || '').toLowerCase();

  const items = [];

  groupMergedMap.forEach((grp) => {
    const messages = Array.isArray(threadsMap[grp.id]) ? threadsMap[grp.id] : [];
    const lastMsg = messages[messages.length - 1] || null;
    const unread = messages.filter((m) => {
      if (m.read) return false;
      if (m.messageType === 'SYSTEM') return false;
      if (viewerUsername && (m.senderUsername || '').toLowerCase() === viewerUsername) return false;
      return (m.senderRole || '').toUpperCase() !== viewerRole;
    }).length;
    items.push({
      ...grp,
      category: 'GROUP',
      role: 'GROUP',
      roleLabel: 'Nhóm điều phối nhiều người',
      lastMessage: lastMsg,
      lastMessageAt: lastMsg ? new Date(lastMsg.createdAt || 0).getTime() : 0,
      unreadCount: unread,
      isPinned: pinnedSet.has(grp.id),
      isMuted: mutedSet.has(grp.id),
      avatarColor: '#0084ff'
    });
  });

  contacts.forEach((c) => {
    // Allow promoted DM->Group override if user added members into a DM thread
    const promoted = customById.get(c.id);
    const messages = Array.isArray(threadsMap[c.id]) ? threadsMap[c.id] : [];
    const lastMsg = messages[messages.length - 1] || null;
    const unread = messages.filter((m) => {
      if (m.read) return false;
      if (m.messageType === 'SYSTEM') return false;
      if (viewerUsername && (m.senderUsername || '').toLowerCase() === viewerUsername) return false;
      return (m.senderRole || '').toUpperCase() !== viewerRole;
    }).length;
    items.push({
      ...c,
      ...(promoted
        ? {
            type: 'GROUP',
            title: `${c.fullName} & ${promoted.memberNames?.length || 2} người`,
            memberIds: promoted.memberIds,
            memberNames: promoted.memberNames
          }
        : {}),
      title: promoted ? `${c.fullName} (+Nhóm)` : c.fullName,
      subtitle: c.roleLabel,
      lastMessage: lastMsg,
      lastMessageAt: lastMsg ? new Date(lastMsg.createdAt || 0).getTime() : 0,
      unreadCount: unread,
      isPinned: pinnedSet.has(c.id),
      isMuted: mutedSet.has(c.id)
    });
  });

  items.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.lastMessageAt !== b.lastMessageAt) return b.lastMessageAt - a.lastMessageAt;
    if (a.type !== b.type) return a.type === 'GROUP' ? -1 : 1;
    return (a.title || '').localeCompare(b.title || '', 'vi');
  });

  return { contacts, conversations: items };
}

export function getUnreadCountForViewer(threadsMap, viewerRole, driverCode = null) {
  if (!isChatDemoMode()) return remoteUnreadCount(driverCode);
  const normalizedViewer = (viewerRole || 'CUSTOMER').toUpperCase();
  const keys = driverCode ? [driverCode] : Object.keys(threadsMap || {});
  return keys.reduce((total, code) => {
    const list = Array.isArray(threadsMap?.[code]) ? threadsMap[code] : [];
    const unread = list.filter(
      (m) =>
        !m.read &&
        m.messageType !== 'SYSTEM' &&
        (m.senderRole || 'CUSTOMER').toUpperCase() !== normalizedViewer
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
  messageType = 'TEXT',
  clientMessageId
}) {
  if (!isChatDemoMode()) return sendRemoteMessage({ driverCode, messageText, messageType, clientMessageId });
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
    channel: driverCode.startsWith('DRV-') ? 'GRAB_CHAT' : 'MESSENGER',
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
        channel: localEntry.channel
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
  if (!isChatDemoMode()) return syncRemoteThread(driverCode);
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

export async function markChatThreadRead({
  driverCode,
  backendDriverId,
  viewerRole = 'CUSTOMER',
  viewerUsername = ''
}) {
  if (!isChatDemoMode()) return readRemoteThread(driverCode);
  if (!driverCode) return;
  const normalizedViewer = viewerRole.toUpperCase();
  const normalizedUsername = (viewerUsername || '').toLowerCase();
  const map = loadChatThreadsMap();
  const list = Array.isArray(map[driverCode]) ? map[driverCode] : [];
  let changed = false;

  const updated = list.map((m) => {
    const isFromOther =
      normalizedUsername && m.senderUsername
        ? m.senderUsername.toLowerCase() !== normalizedUsername
        : (m.senderRole || 'CUSTOMER').toUpperCase() !== normalizedViewer;
    if (!m.read && isFromOther) {
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
    if (!e || e.key === CHAT_STORAGE_KEY || e.key === MESSENGER_META_KEY) {
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
