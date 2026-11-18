import { io } from 'socket.io-client';
import { chatApi, chatSocketPath, chatSocketUrl } from './api';
import { localChatSessionIssue, chatRequestIssue } from '../utils/chatSession';

/** BookShop-style Socket.IO notifications. REST remains authoritative for writes/history. */
export function createChatSocket({ onReady, onChanged, onStatus, sessionToken }) {
  let socket;
  let stopped = false;
  let ready = false;
  let attempt = 0;
  let retryTimer;
  let connectTimer;
  let healthTimer;
  let lastFrameAt = Date.now();

  const sameSession = () => window.localStorage.getItem('ccadro_token') === sessionToken;

  function scheduleReconnect(message = 'Mất kết nối WebSocket. Đang kết nối lại…') {
    if (stopped || retryTimer || !sameSession()) return;
    ready = false;
    onStatus(message);
    const delay = Math.min(10000, 500 * 2 ** Math.min(attempt++, 5)) + Math.random() * 200;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  }

  function closeCurrent() {
    const current = socket;
    socket = undefined;
    ready = false;
    window.clearTimeout(connectTimer);
    window.clearInterval(healthTimer);
    current?.removeAllListeners();
    current?.disconnect();
  }

  async function connect() {
    if (stopped || !sameSession()) return;
    const localIssue = localChatSessionIssue(sessionToken);
    if (localIssue) {
      onStatus(localIssue.message, localIssue.kind);
      return;
    }
    onStatus('Đang kết nối Socket.IO…');
    try {
      const response = await chatApi.socketTicket();
      if (stopped || !sameSession()) return;
      const current = io(chatSocketUrl(), {
        path: chatSocketPath(),
        query: { ticket: response.result.ticket },
        autoConnect: false,
        reconnection: false,
        timeout: 10000
      });
      socket = current;
      let reconnectScheduled = false;
      const fail = (message) => {
        if (socket !== current || reconnectScheduled || stopped) return;
        reconnectScheduled = true;
        closeCurrent();
        scheduleReconnect(message);
      };

      current.on('connect', () => {
        if (socket !== current || ready) return;
        window.clearTimeout(connectTimer);
        connectTimer = window.setTimeout(() => {
          if (!ready && socket === current) fail('Hết thời gian kết nối Socket.IO.');
        }, 10000);
      });
      current.on('ready', () => {
        if (socket !== current || ready) return;
        ready = true;
        attempt = 0;
        lastFrameAt = Date.now();
        window.clearTimeout(connectTimer);
        window.clearInterval(healthTimer);
        healthTimer = window.setInterval(() => {
          if (!sameSession()) {
            stop();
            return;
          }
          if (Date.now() - lastFrameAt > 60000) fail('Socket.IO không phản hồi. Đang kết nối lại…');
        }, 10000);
        onStatus('');
        onReady();
      });
      current.on('heartbeat', () => {
        lastFrameAt = Date.now();
      });
      current.on('message', (payload) => {
        if (socket !== current || !sameSession()) return;
        lastFrameAt = Date.now();
        try {
          const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
          if (event?.conversationId) onChanged(event.conversationId);
        } catch {
          onStatus('Nhận được sự kiện chat không hợp lệ.');
        }
      });
      current.on('connect_error', () => fail());
      current.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') fail();
      });
      current.connect();
    } catch (error) {
      if (stopped || !sameSession()) return;
      if (error.status === 401 || error.status === 403) {
        const issue = chatRequestIssue(error);
        onStatus(issue.message, issue.kind);
        return;
      }
      scheduleReconnect();
    }
  }

  function stop() {
    stopped = true;
    window.clearTimeout(retryTimer);
    retryTimer = null;
    closeCurrent();
  }

  function reconnect() {
    if (stopped || !sameSession()) return;
    window.clearTimeout(retryTimer);
    retryTimer = null;
    closeCurrent();
    connect();
  }

  connect();
  return { stop, reconnect };
}
