import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatApi } from '../services/api';
import { io } from 'socket.io-client';
import { createChatSocket } from '../services/chatSocket';

vi.mock('../services/api', () => ({
  chatApi: { socketTicket: vi.fn() },
  chatSocketUrl: () => 'http://localhost:8888',
  chatSocketPath: () => '/api/v1/chat/socket.io/'
}));
vi.mock('socket.io-client', () => ({ io: vi.fn() }));

class FakeSocket {
  listeners = new Map();
  connect = vi.fn(() => this);
  disconnect = vi.fn(() => this);
  removeAllListeners = vi.fn(() => this.listeners.clear());
  on = vi.fn((event, callback) => {
    this.listeners.set(event, callback);
    return this;
  });
  fire(event, data) {
    this.listeners.get(event)?.(data);
  }
}

let client, callbacks;
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
beforeEach(() => {
  vi.useFakeTimers();
  io.mockReset();
  io.mockImplementation(() => new FakeSocket());
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: { getItem: vi.fn().mockReturnValue('session') }
  });
  chatApi.socketTicket.mockReset().mockResolvedValue({ result: { ticket: 'one' } });
  callbacks = { sessionToken: 'session', onReady: vi.fn(), onChanged: vi.fn(), onStatus: vi.fn() };
});
afterEach(() => {
  client?.stop();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('BookShop-style Socket.IO chat events', () => {
  it('connects with a short-lived ticket and routes member change events', async () => {
    client = createChatSocket(callbacks);
    await settle();
    const socket = io.mock.results[0].value;
    expect(io).toHaveBeenCalledWith(
      'http://localhost:8888',
      expect.objectContaining({
        path: '/api/v1/chat/socket.io/',
        query: { ticket: 'one' },
        reconnection: false
      })
    );
    expect(socket.connect).toHaveBeenCalledOnce();
    socket.fire('connect');
    socket.fire('ready');
    expect(callbacks.onReady).toHaveBeenCalledOnce();
    socket.fire('message', JSON.stringify({ conversationId: 'room' }));
    expect(callbacks.onChanged).toHaveBeenCalledWith('room');
    socket.fire('heartbeat');
    expect(callbacks.onStatus).toHaveBeenLastCalledWith('');
  });

  it('gets a fresh single-use ticket after disconnect and never replays REST writes', async () => {
    client = createChatSocket(callbacks);
    await settle();
    const first = io.mock.results[0].value;
    first.fire('connect');
    first.fire('ready');
    chatApi.socketTicket.mockResolvedValue({ result: { ticket: 'two' } });
    first.fire('disconnect', 'transport close');
    await vi.advanceTimersByTimeAsync(750);
    expect(io).toHaveBeenCalledTimes(2);
    expect(io.mock.calls[1][1].query).toEqual({ ticket: 'two' });
    expect(first.disconnect).toHaveBeenCalled();
  });

  it('stops reconnecting once the authenticated session changes', async () => {
    client = createChatSocket(callbacks);
    await settle();
    const socket = io.mock.results[0].value;
    window.localStorage.getItem.mockReturnValue('new-session');
    socket.fire('disconnect', 'transport close');
    await vi.advanceTimersByTimeAsync(30000);
    expect(io).toHaveBeenCalledOnce();
    expect(callbacks.onChanged).not.toHaveBeenCalled();
  });

  it('reports a rejected ticket as authentication failure and does not retry it', async () => {
    chatApi.socketTicket.mockRejectedValue(Object.assign(new Error('Expired'), { status: 401 }));
    client = createChatSocket(callbacks);
    await settle();
    await vi.advanceTimersByTimeAsync(60000);
    expect(chatApi.socketTicket).toHaveBeenCalledOnce();
    expect(callbacks.onStatus).toHaveBeenLastCalledWith(
      expect.stringContaining('đăng nhập lại'),
      'AUTH_REQUIRED'
    );
  });

  it('identifies a local IAM token without attempting a server ticket', async () => {
    window.localStorage.getItem.mockReturnValue('iam-jwt-admin-local');
    client = createChatSocket({ ...callbacks, sessionToken: 'iam-jwt-admin-local' });
    await settle();
    expect(chatApi.socketTicket).not.toHaveBeenCalled();
    expect(callbacks.onStatus).toHaveBeenLastCalledWith(
      expect.stringContaining('cục bộ'),
      'AUTH_REQUIRED'
    );
  });
});
