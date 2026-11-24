import { api, gatewayUrl } from '../services/api';
import { readJsonStore, writeJsonStore } from './storage';

const NOTIF_STORAGE_KEY = 'ccadro_cross_role_notifications_v1';
const NOTIF_CHANNEL_NAME = 'ccadro_role_notif_bus_v1';
const NOTIF_WINDOW_EVENT = 'ccadro-role-notifications-updated';
const MAX_STORED_NOTIFICATIONS = 60;

export const CANONICAL_ROLE_GROUP = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  DISPATCHER: 'OPERATOR',
  SAFETY_MANAGER: 'OPERATOR',
  ESG_AUDITOR: 'OPERATOR',
  HUB_MANAGER: 'OPERATOR',
  HUB_AUDITOR: 'OPERATOR',
  DRIVER: 'DRIVER',
  HUB_SHIPPER: 'DRIVER',
  SHIPPER: 'DRIVER',
  CUSTOMER: 'CUSTOMER'
};

export const ROLE_SENDER_LABEL = {
  ADMIN: 'Quản trị hệ thống',
  OPERATOR: 'Điều hành vận tải',
  DISPATCHER: 'Điều phối trung tâm',
  SAFETY_MANAGER: 'Ban An toàn đội xe',
  ESG_AUDITOR: 'Kiểm toán phát thải',
  HUB_MANAGER: 'Điều hành bưu cục',
  DRIVER: 'Tài xế đội xe',
  HUB_SHIPPER: 'Shipper bưu cục',
  SHIPPER: 'Đối tác giao nhận',
  CUSTOMER: 'Chủ hàng B2B'
};

const SEEDED_CROSS_ROLE_NOTIFICATIONS = [
  {
    id: 'seed-notif-ops-01',
    notificationCode: 'ALT-GPS-001',
    eventType: 'DEVIATION_RED',
    severity: 'CRITICAL',
    senderRole: 'OPERATOR',
    senderName: 'Hệ thống Giám sát Hành trình',
    targetRoles: ['ADMIN', 'OPERATOR'],
    tripId: 'd0000000-0000-0000-0000-000000000001',
    title: '[CẢNH BÁO NGUY CẤP] Xe V001 lệch hành lang 300m (> 200m)',
    message:
      'Phát hiện 3 điểm định vị liên tiếp vượt ngưỡng an toàn trên tuyến Võ Chí Công → VSIP 1. Đã kích hoạt đề xuất đổi tuyến tránh sự cố.',
    latitude: 10.8525,
    longitude: 106.743,
    status: 'UNREAD',
    readByRoles: [],
    createdAt: new Date(Date.now() - 18 * 60000).toISOString()
  },
  {
    id: 'seed-notif-drv-01',
    notificationCode: 'ALT-DRV-002',
    eventType: 'MANUAL_DIRECTIVE',
    severity: 'HIGH',
    broadcastType: 'MANUAL_BROADCAST',
    senderRole: 'OPERATOR',
    senderName: 'Trung tâm Điều hành Vận tải',
    targetRoles: ['DRIVER'],
    actionDirective: 'Giữ tốc độ dưới 50 km/h qua cầu Phú Mỹ và duy trì nhiệt độ thùng lạnh -18°C.',
    title: 'Chỉ thị điều hành tuyến Cát Lái → KCN Amata',
    message:
      'Lưu lượng container tăng cao tại nút giao Mỹ Thủy. Đề nghị tài xế giữ khoảng cách an toàn và xác nhận khi tới cổng kho đích.',
    status: 'UNREAD',
    readByRoles: [],
    createdAt: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    id: 'seed-notif-hub-01',
    notificationCode: 'ALT-HUB-003',
    eventType: 'HUB_RANGE_ASSIGNED',
    severity: 'INFO',
    senderRole: 'OPERATOR',
    senderName: 'Điều hành Bưu cục Đình Bảng',
    targetRoles: ['DRIVER', 'OPERATOR'],
    hubCode: 'HUB-DINHBANG-BN',
    shipperCode: 'SHP-BN-001',
    title: 'Phân công dải đơn PKG-DB-0001 → PKG-DB-0003',
    message:
      'Bưu cục Đình Bảng đã xếp 03 kiện hàng chuỗi lạnh vào lồng phân tuyến Tuyến 01. Vui lòng quét nhận kiện trước khi xuất trạm.',
    status: 'UNREAD',
    readByRoles: [],
    createdAt: new Date(Date.now() - 32 * 60000).toISOString()
  },
  {
    id: 'seed-notif-cust-01',
    notificationCode: 'ALT-CUST-004',
    eventType: 'SHIPMENT_IN_TRANSIT',
    severity: 'INFO',
    senderRole: 'DRIVER',
    senderName: 'Tài xế Nguyễn Văn Hùng',
    targetRoles: ['CUSTOMER'],
    title: 'Container TCKU-781920-4 đang lưu thông ổn định (-18.4°C)',
    message:
      'Chuyến hàng SHP-2026-8192 đã qua trạm thu phí Long Thành, khóa niêm phong điện tử nguyên vẹn, dự kiến tới kho đúng cam kết SLA.',
    status: 'UNREAD',
    readByRoles: [],
    createdAt: new Date(Date.now() - 14 * 60000).toISOString()
  }
];

let notifChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    notifChannel = new BroadcastChannel(NOTIF_CHANNEL_NAME);
  }
} catch (_) {
  notifChannel = null;
}

function emitLocalUpdate() {
  try {
    window.dispatchEvent(new CustomEvent(NOTIF_WINDOW_EVENT));
  } catch (_) {
    // ignore non-browser env
  }
  try {
    notifChannel?.postMessage({ type: 'NOTIFICATIONS_UPDATED', ts: Date.now() });
  } catch (_) {
    // ignore channel error
  }
}

export function normalizeCanonicalRole(role) {
  const upper = String(role || 'CUSTOMER').trim().toUpperCase();
  return CANONICAL_ROLE_GROUP[upper] || 'OPERATOR';
}

export function resolveTargetRolesFromAudience(targetAudience, explicitTargetRole) {
  const aud = String(targetAudience || '').trim().toUpperCase();
  if (aud === 'ALL_ROLES' || explicitTargetRole === 'ALL') {
    return ['ADMIN', 'OPERATOR', 'DRIVER', 'CUSTOMER'];
  }
  if (aud === 'ALL_DRIVERS' || aud === 'CORRIDOR_DRIVERS' || aud === 'SPECIFIC_TRIP') {
    return ['DRIVER', 'OPERATOR', 'ADMIN'];
  }
  if (aud === 'SHIPPERS' || aud === 'CUSTOMERS') {
    return ['CUSTOMER', 'DRIVER', 'OPERATOR'];
  }
  if (explicitTargetRole) {
    const mapped = normalizeCanonicalRole(explicitTargetRole);
    return Array.from(new Set([mapped, 'ADMIN']));
  }
  return ['ADMIN', 'OPERATOR'];
}

export function loadStoredRoleNotifications() {
  const stored = readJsonStore(NOTIF_STORAGE_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) {
    return [...SEEDED_CROSS_ROLE_NOTIFICATIONS];
  }
  const byId = new Map();
  [...stored, ...SEEDED_CROSS_ROLE_NOTIFICATIONS].forEach((item) => {
    if (item?.id && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  });
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, MAX_STORED_NOTIFICATIONS);
}

export function saveStoredRoleNotifications(list) {
  const trimmed = (Array.isArray(list) ? list : []).slice(0, MAX_STORED_NOTIFICATIONS);
  writeJsonStore(NOTIF_STORAGE_KEY, trimmed);
  emitLocalUpdate();
}

export function getNotificationsForViewer(user, allNotifications = null) {
  const list = Array.isArray(allNotifications) ? allNotifications : loadStoredRoleNotifications();
  const rawRole = String(user?.role || 'CUSTOMER').toUpperCase();
  const canonical = normalizeCanonicalRole(rawRole);
  const viewerHub = user?.assignedHubCode || null;
  const viewerShipper = user?.assignedShipperCode || null;

  return list.filter((n) => {
    if (!n) return false;
    if (canonical === 'ADMIN') return true;

    const targets = Array.isArray(n.targetRoles) && n.targetRoles.length > 0
      ? n.targetRoles.map((r) => normalizeCanonicalRole(r))
      : resolveTargetRolesFromAudience(n.targetAudience, n.targetRole);

    if (!targets.includes(canonical) && !targets.includes('ALL')) {
      return false;
    }

    if (n.hubCode && canonical !== 'CUSTOMER') {
      if (viewerHub && n.hubCode !== viewerHub) return false;
      if (!viewerHub && canonical === 'DRIVER') return false;
    }
    if (n.shipperCode) {
      if (viewerShipper && n.shipperCode !== viewerShipper) return false;
      if (!viewerShipper && canonical === 'DRIVER') return false;
    }
    return true;
  });
}

export function isNotificationUnreadForViewer(notif, user) {
  if (!notif) return false;
  if (notif.status === 'ACKNOWLEDGED') return false;
  const canonical = normalizeCanonicalRole(user?.role);
  const username = String(user?.username || '').toLowerCase();
  if (username && String(notif.senderUsername || '').toLowerCase() === username) {
    return false;
  }
  const readRoles = Array.isArray(notif.readByRoles) ? notif.readByRoles : [];
  if (readRoles.includes(canonical) || (username && readRoles.includes(`user:${username}`))) {
    return false;
  }
  return notif.status !== 'READ';
}

export function markNotificationReadForViewer(notificationId, user) {
  const canonical = normalizeCanonicalRole(user?.role);
  const username = String(user?.username || '').toLowerCase();
  const list = loadStoredRoleNotifications();
  const next = list.map((item) => {
    if (item.id !== notificationId) return item;
    const readByRoles = Array.from(
      new Set([
        ...(Array.isArray(item.readByRoles) ? item.readByRoles : []),
        canonical,
        ...(username ? [`user:${username}`] : [])
      ])
    );
    return { ...item, readByRoles };
  });
  saveStoredRoleNotifications(next);
  if (notificationId && !String(notificationId).startsWith('seed-') && !String(notificationId).startsWith('local-')) {
    api.acknowledgeNotification?.(notificationId).catch(() => {});
  }
}

export function markAllNotificationsReadForViewer(user) {
  const canonical = normalizeCanonicalRole(user?.role);
  const username = String(user?.username || '').toLowerCase();
  const visibleIds = new Set(getNotificationsForViewer(user).map((n) => n.id));
  const list = loadStoredRoleNotifications();
  const next = list.map((item) => {
    if (!visibleIds.has(item.id)) return item;
    const readByRoles = Array.from(
      new Set([
        ...(Array.isArray(item.readByRoles) ? item.readByRoles : []),
        canonical,
        ...(username ? [`user:${username}`] : [])
      ])
    );
    return { ...item, readByRoles };
  });
  saveStoredRoleNotifications(next);
}

export function mergeIncomingBackendNotifications(backendItems = []) {
  if (!Array.isArray(backendItems) || backendItems.length === 0) return loadStoredRoleNotifications();
  const current = loadStoredRoleNotifications();
  const byId = new Map(current.map((item) => [item.id, item]));

  backendItems.forEach((raw) => {
    if (!raw?.id) return;
    const prev = byId.get(raw.id);
    const normalized = {
      ...prev,
      ...raw,
      senderName:
        raw.senderName ||
        ROLE_SENDER_LABEL[String(raw.senderRole || '').toUpperCase()] ||
        'Hệ thống Điều hành',
      targetRoles:
        Array.isArray(raw.targetRoles) && raw.targetRoles.length > 0
          ? raw.targetRoles
          : resolveTargetRolesFromAudience(raw.targetAudience, raw.targetRole),
      readByRoles: prev?.readByRoles || [],
      createdAt: raw.createdAt || prev?.createdAt || new Date().toISOString()
    };
    byId.set(raw.id, normalized);
  });

  const merged = Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, MAX_STORED_NOTIFICATIONS);
  writeJsonStore(NOTIF_STORAGE_KEY, merged);
  emitLocalUpdate();
  return merged;
}

export function publishCrossRoleNotification({
  eventType = 'OPERATIONAL_UPDATE',
  severity = 'INFO',
  senderRole = 'OPERATOR',
  senderUsername = '',
  senderName = '',
  targetRoles = null,
  targetAudience = null,
  hubCode = null,
  shipperCode = null,
  tripId = null,
  title,
  message,
  actionDirective = null,
  latitude = null,
  longitude = null,
  syncBackend = false
}) {
  if (!title || !message) return null;
  const resolvedTargets =
    Array.isArray(targetRoles) && targetRoles.length > 0
      ? targetRoles.map((r) => normalizeCanonicalRole(r))
      : resolveTargetRolesFromAudience(targetAudience, null);

  const entry = {
    id: `local-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    notificationCode: `NTF-${Date.now().toString().slice(-6)}`,
    eventType,
    severity,
    broadcastType: actionDirective ? 'MANUAL_BROADCAST' : 'OPERATIONAL_EVENT',
    senderRole: String(senderRole || 'OPERATOR').toUpperCase(),
    senderUsername: senderUsername || '',
    senderName:
      senderName ||
      ROLE_SENDER_LABEL[String(senderRole || 'OPERATOR').toUpperCase()] ||
      'Hệ thống Vận hành',
    targetRoles: Array.from(new Set([...resolvedTargets, 'ADMIN'])),
    targetAudience: targetAudience || resolvedTargets.join(','),
    hubCode,
    shipperCode,
    tripId,
    title,
    message,
    actionDirective,
    latitude,
    longitude,
    status: 'UNREAD',
    readByRoles: [],
    createdAt: new Date().toISOString()
  };

  const current = loadStoredRoleNotifications();
  saveStoredRoleNotifications([entry, ...current]);

  if (syncBackend) {
    api
      .dispatchEmergencyNotification?.({
        eventType: entry.eventType,
        severity: entry.severity === 'INFO' ? 'WARNING' : entry.severity,
        sourceService: 'operations-bus',
        targetRole: resolvedTargets[0] || 'OPERATOR',
        tripId: tripId || undefined,
        title: entry.title,
        message: entry.message,
        ...(latitude != null && longitude != null ? { latitude, longitude } : {})
      })
      .catch(() => {});
  }

  return entry;
}

export function subscribeRoleNotifications(onUpdate) {
  const handleStorage = (e) => {
    if (!e || e.key === NOTIF_STORAGE_KEY) onUpdate();
  };
  const handleCustom = () => onUpdate();
  const handleBroadcast = () => onUpdate();

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
    window.addEventListener(NOTIF_WINDOW_EVENT, handleCustom);
  }
  notifChannel?.addEventListener('message', handleBroadcast);

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(NOTIF_WINDOW_EVENT, handleCustom);
    }
    notifChannel?.removeEventListener('message', handleBroadcast);
  };
}

export function connectRoleNotificationStream(onNewNotification) {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return () => {};
  }
  const baseStreamUrl = gatewayUrl('/api/v1/notifications/stream');
  const jwtToken =
    window.localStorage.getItem('ccadro_token') ||
    window.localStorage.getItem('ccadro_access_token_v1') ||
    window.sessionStorage.getItem('ccadro_access_token_v1');
  const streamUrl = jwtToken
    ? `${baseStreamUrl}?token=${encodeURIComponent(jwtToken)}`
    : baseStreamUrl;

  let es = null;
  try {
    es = new window.EventSource(streamUrl);
    es.addEventListener('emergency-alert', (e) => {
      try {
        const incoming = JSON.parse(e.data);
        mergeIncomingBackendNotifications([incoming]);
        onNewNotification?.(incoming);
      } catch (_) {
        // ignore malformed event
      }
    });
    es.addEventListener('emergency-acknowledged', (e) => {
      try {
        const updated = JSON.parse(e.data);
        mergeIncomingBackendNotifications([updated]);
      } catch (_) {
        // ignore malformed event
      }
    });
  } catch (_) {
    // offline mode keeps local bus active
  }

  return () => {
    if (es) es.close();
  };
}
