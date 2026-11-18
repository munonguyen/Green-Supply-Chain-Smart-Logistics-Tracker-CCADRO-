import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatSocket } from '../services/chatSocket';
import { chatApi } from '../services/api';
import {
  refreshRemoteChat,
  startRemoteChatSocket,
  remoteThreads,
  remoteConversations,
  sendRemoteMessage,
  readRemoteThread,
  remoteMeta,
  syncRemoteThread
} from '../utils/remoteChat';
import { loadChatThreadsMap } from '../utils/driverChatSync';

vi.mock('../services/api', () => ({
  api: {},
  chatApi: {
    contacts: vi.fn(),
    conversations: vi.fn(),
    preferences: vi.fn(),
    messages: vi.fn(),
    send: vi.fn(),
    read: vi.fn(),
    reaction: vi.fn()
  }
}));
vi.mock('../services/chatSocket', () => ({ createChatSocket: vi.fn() }));
let stop;
const conversation = {
  id: 'room',
  type: 'DM',
  members: ['alice', 'bob'],
  unreadCount: 1,
  createdAt: '2026-11-17T00:00:00Z'
};
const msg = (id, text = 'same text') => ({
  id,
  conversationId: 'room',
  senderUsername: 'bob',
  messageText: text,
  createdAt: `2026-11-17T00:00:0${id === 'm1' ? '1' : '2'}Z`,
  readBy: ['bob'],
  reactions: {}
});
function login(name) {
  window.localStorage.setItem('ccadro_token', `${name}-${Math.random()}`);
  window.localStorage.setItem('ccadro_user', JSON.stringify({ username: name }));
}
beforeEach(() => {
  const store = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k)
    }
  });
  vi.clearAllMocks();
  vi.stubEnv('VITE_CHAT_DEMO_MODE', 'false');
  login('alice');
  createChatSocket.mockReturnValue({ stop: vi.fn(), reconnect: vi.fn() });
  stop = startRemoteChatSocket();
  chatApi.contacts.mockResolvedValue({
    result: [
      { username: 'alice', fullName: 'Alice' },
      { username: 'bob', fullName: 'Bob', role: 'DRIVER' }
    ]
  });
  chatApi.conversations.mockResolvedValue({ result: [conversation] });
  chatApi.preferences.mockResolvedValue({ result: [] });
  chatApi.messages.mockResolvedValue({
    result: { messages: [msg('m1'), msg('m2')], nextCursor: null }
  });
});
afterEach(() => {
  stop();
  vi.unstubAllEnvs();
});

describe('Mongo chat UI data path', () => {
  it('live mode never includes seed/local-ledger messages; identical texts retain separate server IDs', async () => {
    window.localStorage.setItem(
      'ccadro_driver_chat_threads_v2',
      JSON.stringify({ secret: [{ messageText: 'leak' }] })
    );
    expect(loadChatThreadsMap()).toEqual({});
    await refreshRemoteChat('room');
    expect(remoteThreads().room).toHaveLength(2);
    expect(remoteConversations().conversations[0].title).toBe('Bob');
    await syncRemoteThread('room');
    expect(remoteThreads().room).toHaveLength(2);
  });
  it('failed send stays unconfirmed and can retry with the same idempotency key', async () => {
    await refreshRemoteChat('room');
    chatApi.send.mockRejectedValueOnce(new Error('Mongo unavailable'));
    const input = { driverCode: 'room', messageText: 'new', clientMessageId: 'retry-key' };
    await expect(sendRemoteMessage(input)).rejects.toThrow('Mongo unavailable');
    expect(remoteThreads().room).toHaveLength(2);
    chatApi.send.mockResolvedValue({
      result: { ...msg('saved', 'new'), senderUsername: 'alice', readBy: ['alice'] }
    });
    await sendRemoteMessage(input);
    expect(chatApi.send.mock.calls.map((c) => c[1].clientMessageId)).toEqual([
      'retry-key',
      'retry-key'
    ]);
    expect(remoteThreads().room).toHaveLength(3);
  });
  it('read receipts persist to backend before changing local state', async () => {
    await refreshRemoteChat('room');
    chatApi.read.mockRejectedValueOnce(new Error('offline'));
    await expect(readRemoteThread('room')).rejects.toThrow('offline');
    expect(remoteThreads().room[0].read).toBe(false);
    chatApi.read.mockResolvedValue({ result: 2 });
    await readRemoteThread('room');
    expect(chatApi.read).toHaveBeenLastCalledWith('room', 'm2');
    expect(remoteThreads().room[0].read).toBe(true);
  });
  it('fetches every missed page on reconnect until it reaches cached history', async () => {
    await refreshRemoteChat('room');
    chatApi.messages
      .mockResolvedValueOnce({ result: { messages: [msg('m4')], nextCursor: 'page2' } })
      .mockResolvedValueOnce({ result: { messages: [msg('m2'), msg('m3')], nextCursor: 'older' } });
    await syncRemoteThread('room');
    expect(remoteThreads().room.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(chatApi.messages).toHaveBeenLastCalledWith('room', 'page2');
  });
  it('switching accounts discards cached conversations, preferences and messages', async () => {
    await refreshRemoteChat('room');
    login('carol');
    expect(remoteThreads()).toEqual({});
    expect(remoteMeta().customThreads).toEqual([]);
    expect(remoteConversations().conversations).toEqual([]);
  });
  it('late responses from a previous session cannot populate a new user cache', async () => {
    let finish;
    chatApi.contacts.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const refresh = refreshRemoteChat('room');
    login('carol');
    finish({ result: [{ username: 'alice' }] });
    await refresh;
    expect(remoteThreads()).toEqual({});
    expect(remoteConversations().contacts).toEqual([]);
  });
});
