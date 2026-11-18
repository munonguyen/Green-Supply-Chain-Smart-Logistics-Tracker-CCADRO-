import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Header from '../shared/layout/Header';

function seedSessionUser(userObj) {
  const store = new Map();
  store.set('ccadro_user', JSON.stringify(userObj));
  store.set('ccadro_token', `test-token-${userObj.role}`);

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    }
  });
}

describe('Role-Adapted Header & Comprehensive Business Settings', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    seedSessionUser({
      username: 'admin',
      fullName: 'Quản Trị Viên Hệ Thống',
      role: 'ADMIN',
      email: 'admin@ccadro.vn',
      phone: '0901000111',
      companyName: 'CCADRO Logistics Nội Bộ'
    });

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ result: [] }))
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('renders single-row structured header with quick settings modal for ADMIN', async () => {
    const toggleSidebar = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <Header
              title="Quản Lý User, Hồ Sơ Chi Tiết & Phân Quyền IAM"
              sidebarCollapsed={false}
              onToggleSidebar={toggleSidebar}
            />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const header = container.querySelector('header.topbar');
    expect(header).toBeInTheDocument();
    expect(header.querySelector('.topbar-left')).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: 'Quản Lý User, Hồ Sơ Chi Tiết & Phân Quyền IAM'
    });
    expect(heading).toHaveClass('topbar-title');

    const actions = header.querySelector('.topbar-actions');
    expect(actions).toBeInTheDocument();

    expect(actions.querySelector('.topbar-status-pill')).toBeInTheDocument();
    expect(screen.getByText('Trực tuyến')).toBeInTheDocument();
    expect(screen.getByText('Không gian 3D')).toBeInTheDocument();
    expect(screen.getByText('Phát Cảnh Báo')).toBeInTheDocument();
    expect(screen.getByText('Messenger')).toBeInTheDocument();
    expect(screen.getByText('Khẩn Cấp')).toBeInTheDocument();

    const accountTrigger = screen.getByTestId('user-avatar-trigger');
    expect(actions.lastElementChild.contains(accountTrigger)).toBe(true);

    // Quick settings gear opens rich 5-tab Settings Modal directly from Header
    fireEvent.click(screen.getByTestId('topbar-quick-settings'));
    expect(await screen.findByTestId('settings-tab-profile')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-preferences')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-role-ops')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-notifications')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-security')).toBeInTheDocument();

    // Update personal profile name in Tab 1
    fireEvent.change(screen.getByTestId('settings-profile-fullname'), {
      target: { value: 'Nguyễn Quản Trị Root' }
    });
    fireEvent.click(screen.getByTestId('btn-save-profile'));
    expect(await screen.findByText(/Đã cập nhật hồ sơ cá nhân thành công/i)).toBeInTheDocument();

    // Switch to Role Operations Tab -> ADMIN settings visible
    fireEvent.click(screen.getByTestId('settings-tab-role-ops'));
    expect(screen.getByText(/Phê duyệt 2 lớp khi khóa\/xóa tài khoản IAM/i)).toBeInTheDocument();

    // Switch to Preferences Tab -> Table Density & Units visible
    fireEvent.click(screen.getByTestId('settings-tab-preferences'));
    fireEvent.change(screen.getByTestId('settings-select-density'), { target: { value: 'compact' } });
    expect(screen.getByText(/Đã lưu tùy chọn cài đặt/i)).toBeInTheDocument();

    // Switch to Notifications Tab
    fireEvent.click(screen.getByTestId('settings-tab-notifications'));
    expect(screen.getByText(/Chế độ Giờ yên tĩnh/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Đóng cài đặt'));
  });

  it('adapts Header & Settings for ESG_AUDITOR (hides incident broadcast, shows GLEC v3 status & carbon settings)', async () => {
    seedSessionUser({
      username: 'esg_auditor',
      fullName: 'Kiểm Toán ESG CCADRO',
      role: 'ESG_AUDITOR',
      email: 'esg@ccadro.vn',
      companyName: 'CCADRO ESG Compliance'
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <Header title="Kiểm Toán Phát Thải GLEC v3 (UC12)" />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('GLEC v3 Live')).toBeInTheDocument();
    expect(screen.getByText('ISO 14083')).toBeInTheDocument();
    expect(screen.getByText('Cảnh Báo ESG')).toBeInTheDocument();
    expect(screen.queryByText('Phát Cảnh Báo')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('topbar-quick-settings'));
    fireEvent.click(await screen.findByTestId('settings-tab-role-ops'));
    expect(screen.getByText(/Bộ hệ số chuẩn hóa phát thải Carbon/i)).toBeInTheDocument();
  });

  it('shows B2B Kafka/PDF & Cold-Chain settings inside Settings Modal for CUSTOMER role', async () => {
    seedSessionUser({
      username: 'customer_b2b',
      fullName: 'Đối Tác Doanh Nghiệp B2B',
      role: 'CUSTOMER',
      email: 'b2b@partner.vn',
      companyName: 'Vinamilk Logistics Partner'
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <Header title="Cổng Khách Hàng Doanh Nghiệp B2B" />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('topbar-quick-settings'));
    fireEvent.click(await screen.findByTestId('settings-tab-role-ops'));
    expect(screen.getByText(/Email nhận Hợp đồng PDF & Biên lai \(Kafka\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ngưỡng nhiệt độ Cold-Chain cảnh báo container/i)).toBeInTheDocument();
  });
});
