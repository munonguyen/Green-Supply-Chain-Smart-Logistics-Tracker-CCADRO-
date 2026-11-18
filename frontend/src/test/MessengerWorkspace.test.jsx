import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import MessengerWorkspaceModal from '../shared/chat/MessengerWorkspaceModal';
import { setChatSandboxOverride } from '../utils/driverChatSync';

describe('Facebook Messenger Style Multi-Person & Group Chat Workspace', () => {
  afterEach(() => {
    setChatSandboxOverride(false);
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    vi.stubEnv('VITE_CHAT_DEMO_MODE', 'true');
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
      }
    });
    window.HTMLElement.prototype.scrollIntoView = () => { };
  });

  it('supports multi-role conversations, creating group chats, reactions, and minimized Chat Heads', async () => {
    const adminUser = {
      username: 'admin',
      fullName: 'Quản Trị Viên Hệ Thống',
      role: 'ADMIN',
      companyName: 'CCADRO Logistics Nội Bộ'
    };

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <MessengerWorkspaceModal isOpen={true} onClose={() => { }} user={adminUser} />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // 1. Multi-role directory & group threads appear in Messenger sidebar
    expect(screen.getByText('CCADRO Messenger')).toBeInTheDocument();
    expect(screen.getByText('ĐANG HOẠT ĐỘNG')).toBeInTheDocument();
    expect(screen.getAllByText(/Nhóm Chuyến Cont TCKU-781920-4/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Phạm Thảo Vy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Trần Minh Quang/i).length).toBeGreaterThan(0);

    // 2. Switch to dispatcher thread and send a real-time message
    const vyButtons = screen.getAllByRole('button', { name: /Phạm Thảo Vy/i });
    fireEvent.click(vyButtons[vyButtons.length - 1]);
    const msgInput = screen.getByPlaceholderText(/Nhắn tin tới Phạm Thảo Vy/i);
    fireEvent.change(msgInput, { target: { value: 'Kiểm tra gấp luồng xe điện V002 giúp anh nhé!' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi tin nhắn/i }));

    const matchingMsgs = await screen.findAllByText(/Kiểm tra gấp luồng xe điện V002 giúp anh nhé!/i);
    expect(matchingMsgs.length).toBeGreaterThan(0);

    // 3. Create a brand new Group Chat with multiple people
    fireEvent.click(screen.getByLabelText('Tạo cuộc trò chuyện hoặc nhóm mới'));
    fireEvent.change(screen.getByPlaceholderText(/Tên nhóm/i), {
      target: { value: 'Nhóm Điều Phối Khẩn Cảng Cát Lái' }
    });
    const hungButtons = screen.getAllByRole('button', { name: /Nguyễn Văn Hùng/i });
    fireEvent.click(hungButtons[hungButtons.length - 1]);
    const quangButtons = screen.getAllByRole('button', { name: /Trần Minh Quang/i });
    fireEvent.click(quangButtons[quangButtons.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: /Tạo nhóm chat \(2 người\)/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Nhóm Điều Phối Khẩn Cảng Cát Lái/i).length).toBeGreaterThan(0);
    });

    // 4. Minimize to Facebook Chat Heads dock and reopen
    fireEvent.click(screen.getByLabelText('Thu nhỏ thành bong bóng chat'));
    expect(screen.getByLabelText('Thanh bong bóng chat Messenger thu nhỏ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mở Messenger/i }));
    expect(screen.getByText(/CCADRO Messenger/i)).toBeInTheDocument();
  });

  it('mounts modal into document.body portal and provides actionable reconnect & offline sandbox controls when chat-service is unreachable', async () => {
    vi.stubEnv('VITE_CHAT_DEMO_MODE', 'false');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Load failed'));
    window.localStorage.setItem('ccadro_token', 'test-token-offline-ui');
    const onClose = vi.fn();
    const adminUser = {
      username: 'admin',
      fullName: 'Quản Trị Viên Hệ Thống',
      role: 'ADMIN',
      companyName: 'CCADRO Logistics Nội Bộ'
    };

    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <div data-testid="sticky-header-host">
              <MessengerWorkspaceModal isOpen={true} onClose={onClose} user={adminUser} />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const dialog = await screen.findByRole('dialog', { name: /CCADRO Messenger/i });
    expect(dialog.parentElement).toBe(document.body);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(screen.getByRole('button', { name: /Đóng khung chat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử kết nối lại :8888/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Mở Chat Nội Bộ Cục Bộ/i }));
    const contactsRendered = await screen.findAllByText(/Phạm Thảo Vy/i);
    expect(contactsRendered.length).toBeGreaterThan(0);
  });
  it('shows login recovery instead of server outage and local-chat fallback for a local IAM session', async () => {
    vi.stubEnv('VITE_CHAT_DEMO_MODE', 'false');
    window.localStorage.setItem('ccadro_token', 'iam-jwt-admin-local');
    render(<MemoryRouter><ThemeProvider><AuthProvider>
      <MessengerWorkspaceModal isOpen user={{ username: 'admin', role: 'ADMIN' }} />
    </AuthProvider></ThemeProvider></MemoryRouter>);
    expect(await screen.findByText('Cần xác thực lại để sử dụng chat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập lại' })).toBeInTheDocument();
    expect(screen.queryByText('● Mất kết nối Chat (:8888)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mở Chat Nội Bộ Cục Bộ/i })).not.toBeInTheDocument();
  });

  it('selects all chat filter tags (Driver, Ops, Group, Hub/Customer, Unread, All) and quick-reply tags reliably', async () => {
    vi.stubEnv('VITE_CHAT_DEMO_MODE', 'true');
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <MessengerWorkspaceModal
              isOpen={true}
              onClose={() => {}}
              user={{ username: 'admin', fullName: 'Admin', role: 'ADMIN' }}
            />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const driverTag = screen.getByTestId('chat-filter-DRIVER');
    fireEvent.click(driverTag);
    expect(driverTag).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/Nguyễn Văn Hùng/i).length).toBeGreaterThan(0);

    const opsTag = screen.getByTestId('chat-filter-OPS');
    fireEvent.click(opsTag);
    expect(opsTag).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/Phạm Thảo Vy/i).length).toBeGreaterThan(0);

    const hubCustTag = screen.getByTestId('chat-filter-HUB_CUST');
    fireEvent.click(hubCustTag);
    expect(hubCustTag).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/Vinamilk/i).length).toBeGreaterThan(0);

    const groupTag = screen.getByTestId('chat-filter-GROUP');
    fireEvent.click(groupTag);
    expect(groupTag).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/Nhóm Chuyến Cont TCKU-781920-4/i).length).toBeGreaterThan(0);

    const quickReplyBtn = screen.getByRole('button', { name: 'Anh tới đâu rồi ạ?' });
    fireEvent.click(quickReplyBtn);
    expect((await screen.findAllByText('Anh tới đâu rồi ạ?')).length).toBeGreaterThan(1);
  });

});