import { chatApi } from '../services/api';
import { createChatSocket } from '../services/chatSocket';
import { localChatSessionIssue, chatRequestIssue } from './chatSession';

// Live mode has no shared localStorage ledger or demo messages. Cache is scoped to the session token.
let session = null;
let state;
let realtime;
let realtimeToken;
let activeConversation;
let realtimeUsers = 0;
let refreshQueued = false;
let refreshRunning = false;

async function refreshFromSocket() {
  refreshQueued = true;
  if (refreshRunning) return;
  refreshRunning = true;
  try {
    while (refreshQueued && realtime) {
      refreshQueued = false;
      await refreshRemoteChat(activeConversation);
    }
  } finally {
    refreshRunning = false;
  }
}

export function setRemoteActiveConversation(id) {
  activeConversation = id;
  if (realtime) refreshFromSocket();
}

export function startRemoteChatSocket() {
  const expected = token();
  if (realtime && realtimeToken !== expected) {
    realtime.stop();
    realtime = null;
    realtimeUsers = 0;
  }
  if (!expected) {
    refreshRemoteChat();
    return () => {};
  }
  realtimeUsers += 1;
  if (!realtime) {
    realtimeToken = expected;
    realtime = createChatSocket({
      sessionToken: expected,
      onReady: () => refreshFromSocket(),
      onChanged: () => refreshFromSocket(),
      onStatus: (message, kind = '') => {
        if (token() !== expected) return;
        snapshot().socketError = message;
        snapshot().socketIssue = kind;
        announce();
      }
    });
  }
  const onTokenRefreshed = () => {
    const updated = token();
    if (!updated || updated === realtimeToken) return;
    realtime?.stop();
    realtime = null;
    realtimeToken = updated;
    realtime = createChatSocket({
      sessionToken: updated,
      onReady: () => refreshFromSocket(),
      onChanged: () => refreshFromSocket(),
      onStatus: (message, kind = '') => {
        if (token() !== updated) return;
        snapshot().socketError = message;
        snapshot().socketIssue = kind;
        announce();
      }
    });
  };
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('ccadro-token-refreshed', onTokenRefreshed);
  }
  return () => {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('ccadro-token-refreshed', onTokenRefreshed);
    }
    if (realtimeToken !== expected) return;
    realtimeUsers -= 1;
    if (realtimeUsers <= 0) {
      realtime?.stop();
      realtime = null;
    }
  };
}

export function reconnectRemoteChat() {
  realtime?.reconnect();
}

function token() {
  return window.localStorage.getItem('ccadro_token') || '';
}
function username() {
  try {
    return JSON.parse(window.localStorage.getItem('ccadro_user') || '{}').username || '';
  } catch {
    return '';
  }
}
function snapshot() {
  const current = token();
  if (current !== session || !state) {
    session = current;
    state = {
      contacts: [],
      conversations: [],
      threads: {},
      preferences: [],
      cursors: {},
      error: '',
      socketError: '',
      socketIssue: '',
      errorIssue: '',
      refreshing: false
    };
  }
  return state;
}
function announce() {
  window.dispatchEvent(new CustomEvent('ccadro-driver-chat-updated'));
}
function unwrap(response) {
  return response?.result;
}
function normalize(message, conversation, viewer) {
  const isMine = message.senderUsername === viewer;
  const read = isMine
    ? conversation.members
        .filter((u) => u !== viewer)
        .every((u) => (message.readBy || []).includes(u))
    : (message.readBy || []).includes(viewer);
  return {
    ...message,
    driverCode: conversation.id,
    read,
    channel: 'MESSENGER',
    deliveryStatus: read ? 'READ' : 'SENT'
  };
}
function contact(user) {
  const role = user.role || 'USER';
  return {
    ...user,
    id: `contact:${user.username}`,
    type: 'DM',
    title: user.fullName,
    category:
      role === 'DRIVER'
        ? 'DRIVER'
        : role.includes('HUB') || role === 'SHIPPER'
          ? 'HUB'
          : role === 'CUSTOMER'
            ? 'CUSTOMER'
            : 'OPS',
    roleLabel: role,
    avatarColor: '#0084ff',
    online: false
  };
}

export function remoteThreads() {
  return { ...snapshot().threads };
}
export function remoteMeta() {
  const s = snapshot();
  const reactions = {};
  Object.values(s.threads)
    .flat()
    .forEach((m) => {
      reactions[m.id] = m.reactions || {};
    });
  return {
    customThreads: s.conversations,
    reactions,
    pinnedIds: s.preferences.filter((p) => p.pinned).map((p) => p.conversationId),
    mutedIds: s.preferences.filter((p) => p.muted).map((p) => p.conversationId)
  };
}
export function remoteStatus() {
  const s = snapshot();
  return s.socketError || s.error;
}
export function remoteStatusKind() {
  const s = snapshot();
  return s.socketError ? s.socketIssue : s.errorIssue;
}
export function remoteHasOlder(id) {
  return Boolean(snapshot().cursors[id]);
}

export function remoteConversations() {
  const s = snapshot();
  const viewer = username();
  const contacts = s.contacts.filter((u) => u.username !== viewer).map(contact);
  const prefs = new Map(s.preferences.map((p) => [p.conversationId, p]));
  const actual = s.conversations.map((c) => {
    const partnerName = c.members.find((u) => u !== viewer);
    const partner = s.contacts.find((u) => u.username === partnerName);
    const base =
      c.type === 'DM' ? contact(partner || { username: partnerName, fullName: partnerName }) : {};
    const messages = s.threads[c.id] || [];
    const lastMessage = c.lastMessage || messages[messages.length - 1];
    return {
      ...base,
      ...c,
      title: c.type === 'DM' ? partner?.fullName || partnerName : c.title,
      fullName: c.type === 'DM' ? partner?.fullName || partnerName : c.title,
      memberIds: c.members.map((u) => `contact:${u}`),
      memberNames: c.members.map((u) => s.contacts.find((p) => p.username === u)?.fullName || u),
      subtitle: `${c.members.length} thành viên`,
      category: c.type === 'GROUP' ? 'GROUP' : base.category,
      roleLabel: c.type === 'GROUP' ? 'Nhóm chat' : base.roleLabel,
      unreadCount: c.unreadCount || 0,
      lastMessage,
      online: false,
      lastMessageAt: new Date(lastMessage?.createdAt || c.createdAt).getTime(),
      isPinned: Boolean(prefs.get(c.id)?.pinned),
      isMuted: Boolean(prefs.get(c.id)?.muted)
    };
  });
  const paired = new Set(
    s.conversations
      .filter((c) => c.type === 'DM')
      .flatMap((c) => c.members.filter((u) => u !== viewer))
  );
  const conversations = [...actual, ...contacts.filter((c) => !paired.has(c.username))];
  conversations.sort(
    (a, b) =>
      Number(b.isPinned || false) - Number(a.isPinned || false) ||
      (b.lastMessageAt || 0) - (a.lastMessageAt || 0)
  );
  return { contacts, conversations };
}

export async function refreshRemoteChat(selectedId) {
  const s = snapshot();
  const expected = session;
  const sessionIssue = localChatSessionIssue(expected);
  if (sessionIssue) {
    s.error = sessionIssue.message;
    s.errorIssue = sessionIssue.kind;
    announce();
    return;
  }
  if (s.refreshing) return s.refreshing;
  s.refreshing = (async () => {
    try {
      const [directory, conversations, preferences] = await Promise.all([
        chatApi.contacts(),
        chatApi.conversations(),
        chatApi.preferences()
      ]);
      if (token() !== expected) return;
      s.contacts = unwrap(directory) || [];
      s.conversations = unwrap(conversations) || [];
      s.preferences = unwrap(preferences) || [];
      s.error = '';
      s.errorIssue = '';
      if (selectedId && !selectedId.startsWith('contact:')) await syncRemoteThread(selectedId);
      announce();
    } catch (error) {
      if (token() === expected) {
        const issue = chatRequestIssue(error);
        s.error = issue.message;
        s.errorIssue = issue.kind;
        announce();
      }
    } finally {
      s.refreshing = false;
    }
  })();
  return s.refreshing;
}

export async function syncRemoteThread(id, older = false) {
  const s = snapshot();
  const expected = session;
  const c = s.conversations.find((row) => row.id === id);
  if (!c || !expected || (older && !s.cursors[id])) return;
  const previous = s.threads[id] || [];
  const known = new Set(previous.map((m) => m.id));
  let cursor = older ? s.cursors[id] : '';
  let result;
  const fetched = [];
  do {
    result = unwrap(await chatApi.messages(id, cursor));
    if (token() !== expected) return;
    fetched.push(...result.messages);
    const reachedKnown = result.messages.some((m) => known.has(m.id));
    cursor = result.nextCursor;
    if (older || known.size === 0 || reachedKnown) break;
  } while (cursor);
  const rows = fetched.map((m) => normalize(m, c, username()));
  const map = new Map(previous.map((m) => [m.id, m]));
  rows.forEach((m) => map.set(m.id, m));
  s.threads[id] = [...map.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id)
  );
  if (older || !(id in s.cursors)) s.cursors[id] = result.nextCursor;
  announce();
}

export async function createRemoteThread({
  type = 'DM',
  title,
  contacts,
  containerCode,
  shipmentCode
}) {
  const expected = token();
  const members = contacts.map((c) => c.username).filter(Boolean);
  if (!members.length) throw new Error('Chọn tài khoản từ danh bạ chat');
  const saved = unwrap(
    await chatApi.create({ type, title: title || '', members, containerCode, shipmentCode })
  );
  if (token() !== expected) return null;
  const s = snapshot();
  s.conversations = [saved, ...s.conversations.filter((c) => c.id !== saved.id)];
  announce();
  return saved.id;
}

export async function sendRemoteMessage({
  driverCode,
  messageText,
  messageType = 'TEXT',
  clientMessageId
}) {
  const expected = token();
  let id = driverCode;
  if (id.startsWith('contact:')) {
    const user = snapshot().contacts.find((u) => u.username === id.substring(8));
    if (!user) throw new Error('Không tìm thấy người nhận');
    id = await createRemoteThread({ contacts: [user] });
  }
  if (!id || token() !== expected) throw new Error('Phiên đăng nhập đã thay đổi');
  const saved = unwrap(
    await chatApi.send(id, {
      clientMessageId: clientMessageId || crypto.randomUUID(),
      messageText: messageText.trim(),
      messageType: messageType === 'QUICK_REPLY' ? 'TEXT' : messageType
    })
  );
  if (token() !== expected) return null;
  const s = snapshot();
  const c = s.conversations.find((c) => c.id === id);
  const row = normalize(saved, c, username());
  s.threads[id] = [...(s.threads[id] || []).filter((m) => m.id !== row.id), row].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id)
  );
  c.lastMessage = saved;
  announce();
  return row;
}

export async function readRemoteThread(id) {
  const s = snapshot();
  const expected = session;
  const list = s.threads[id] || [];
  if (!list.length || !list.some((m) => !(m.readBy || []).includes(username()))) return;
  const viewer = username();
  await chatApi.read(id, list[list.length - 1].id);
  if (token() !== expected) return;
  const viewed = new Set(list.map((m) => m.id));
  s.threads[id] = (s.threads[id] || []).map((m) =>
    viewed.has(m.id)
      ? {
          ...m,
          readBy: [...new Set([...(m.readBy || []), viewer])],
          read: m.senderUsername === viewer ? m.read : true
        }
      : m
  );
  const c = s.conversations.find((c) => c.id === id);
  if (c) c.unreadCount = 0;
  announce();
}

export async function inviteRemoteMembers({ threadId, newContacts }) {
  await chatApi.members(
    threadId,
    newContacts.map((c) => c.username)
  );
  await refreshRemoteChat(threadId);
}
export async function reactRemote({ threadId, messageId, emoji }) {
  const actors =
    snapshot().threads[threadId]?.find((m) => m.id === messageId)?.reactions?.[emoji] || [];
  await chatApi.reaction(threadId, messageId, emoji, !actors.includes(username()));
  await syncRemoteThread(threadId);
}
export async function preferenceRemote(id, field) {
  if (id.startsWith('contact:')) throw new Error('Gửi tin nhắn để tạo cuộc trò chuyện trước');
  const current = snapshot().preferences.find((p) => p.conversationId === id);
  await chatApi.preference(id, { [field]: !current?.[field] });
  await refreshRemoteChat();
}

export function remoteUnreadCount(conversationId = null) {
  return snapshot()
    .conversations.filter((c) => !conversationId || c.id === conversationId)
    .reduce((count, c) => count + (c.unreadCount || 0), 0);
}
