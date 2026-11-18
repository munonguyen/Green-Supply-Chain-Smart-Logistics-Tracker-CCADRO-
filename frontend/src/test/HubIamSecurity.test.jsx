import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, getAccessibleWorkspaces, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import LandingNavbar from '../systems/public/shared/LandingNavbar';
import Sidebar from '../shared/layout/Sidebar';
import SidebarAccountCard from '../shared/components/SidebarAccountCard';
import { elasticSearchMatch } from '../utils/elasticSearch';

function AuthHarness() {
  const { user, login, logout, provisionHubAccount, hubAuthAuditLogs } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [provisionMsg, setProvisionMsg] = useState('');

  return (
    <div>
      <div data-testid="current-user">{user ? `${user.username}:${user.role}:${user.assignedHubCode || 'NONE'}` : 'ANON'}</div>
      <div data-testid="auth-error">{errorMsg}</div>
      <div data-testid="provision-msg">{provisionMsg}</div>
      <div data-testid="audit-count">{hubAuthAuditLogs.length}</div>
      <button
        type="button"
        data-testid="btn-login-shipper-ok"
        onClick={async () => {
          setErrorMsg('');
          try {
            await login('shipper', '123');
          } catch (e) {
            setErrorMsg(e.message);
          }
        }}
      >
        Login Shipper OK
      </button>
      <button
        type="button"
        data-testid="btn-login-wrong"
        onClick={async () => {
          setErrorMsg('');
          try {
            await login('shipper_bn2', 'wrong-pass');
          } catch (e) {
            setErrorMsg(e.message);
          }
        }}
      >
        Login Wrong
      </button>
      <button
        type="button"
        data-testid="btn-login-bn2-ok"
        onClick={async () => {
          setErrorMsg('');
          try {
            await login('shipper_bn2', '123');
          } catch (e) {
            setErrorMsg(e.message);
          }
        }}
      >
        Login BN2 OK
      </button>
      <button
        type="button"
        data-testid="btn-login-mgr-ok"
        onClick={async () => {
          setErrorMsg('');
          try {
            await login('hub_mgr_dinhbang', '123');
          } catch (e) {
            setErrorMsg(e.message);
          }
        }}
      >
        Login Mgr OK
      </button>
      <button
        type="button"
        data-testid="btn-provision-ok"
        onClick={async () => {
          setProvisionMsg('');
          try {
            const acc = await provisionHubAccount({
              username: 'shipper_bn4',
              fullName: 'Hoang Van Minh',
              password: 'Secure2026Password',
              role: 'HUB_SHIPPER',
              assignedHubCode: 'HUB-DINHBANG-BN',
              assignedShipperCode: 'SHP-BN-004'
            });
            setProvisionMsg(`CREATED:${acc.username}`);
          } catch (e) {
            setProvisionMsg(`ERR:${e.message}`);
          }
        }}
      >
        Provision BN4
      </button>
      <button type="button" data-testid="btn-logout" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

describe('Dedicated Hub IAM Auth & Brute-force Security', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline test harness'));
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('logs in HUB_SHIPPER without persisting plaintext passwords and enforces 5-attempt brute-force lockout', async () => {
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    // 1. Login as shipper -> resolves HUB_SHIPPER @ HUB-DINHBANG-BN
    fireEvent.click(screen.getByTestId('btn-login-shipper-ok'));
    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('shipper:HUB_SHIPPER:HUB-DINHBANG-BN');
    });

    // Verify localStorage NEVER contains plaintext password
    const savedAccountsRaw = window.localStorage.getItem('ccadro_accounts_v3') || '';
    const savedUserRaw = window.localStorage.getItem('ccadro_user') || '';
    expect(savedAccountsRaw).toContain('passwordDigest');
    expect(savedAccountsRaw).not.toContain('"password":');
    expect(savedUserRaw).not.toContain('"password":');

    fireEvent.click(screen.getByTestId('btn-logout'));

    // 2. Fail password 5 times for shipper_bn2 -> temporary 15-minute lockout
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(screen.getByTestId('btn-login-wrong'));
      await waitFor(() => {
        expect(screen.getByTestId('auth-error').textContent.length).toBeGreaterThan(0);
      });
    }
    expect(screen.getByTestId('auth-error').textContent).toMatch(/tạm khóa 15 phút/i);

    // Subsequent login with right password is still blocked during lockout
    fireEvent.click(screen.getByTestId('btn-login-bn2-ok'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-error').textContent).toMatch(/tạm khóa bảo mật/i);
    });
    expect(screen.getByTestId('current-user')).toHaveTextContent('ANON');

    // 3. Login as hub_mgr_dinhbang & provision new HUB_SHIPPER in HUB-DINHBANG-BN
    fireEvent.click(screen.getByTestId('btn-login-mgr-ok'));
    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('hub_mgr_dinhbang:HUB_MANAGER:HUB-DINHBANG-BN');
    });

    fireEvent.click(screen.getByTestId('btn-provision-ok'));
    await waitFor(() => {
      expect(screen.getByTestId('provision-msg')).toHaveTextContent('CREATED:shipper_bn4');
    });
  });

  it('renders clean Login CTA when logged out and shows Avatar dropdown with RBAC Workspace Switcher & Settings when logged in', async () => {
    function NavbarAuthTester() {
      const { login } = useAuth();
      return (
        <div>
          <LandingNavbar />
          <button
            type="button"
            data-testid="test-login-shipper"
            onClick={() => login('shipper', '123')}
          >
            Login Shipper
          </button>
          <button
            type="button"
            data-testid="test-login-admin"
            onClick={() => login('admin', '123')}
          >
            Login Admin
          </button>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <AuthProvider>
            <NavbarAuthTester />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // 1. Logged out -> shows Login button, never direct portal buttons like Cổng Shipper 3PL
    expect(screen.getByTestId('btn-nav-login')).toBeInTheDocument();
    expect(screen.queryByTestId('user-avatar-trigger')).not.toBeInTheDocument();
    expect(screen.queryByText(/Cổng Shipper 3PL/i)).not.toBeInTheDocument();

    // 2. Login as HUB_SHIPPER -> Avatar appears; dropdown shows ONLY Shipper workspace & Settings
    fireEvent.click(screen.getByTestId('test-login-shipper'));
    const avatarBtn = await screen.findByTestId('user-avatar-trigger');
    expect(screen.queryByTestId('btn-nav-login')).not.toBeInTheDocument();

    fireEvent.click(avatarBtn);
    expect(await screen.findByTestId('user-account-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('switch-system-shipper')).toBeInTheDocument();
    expect(screen.queryByTestId('switch-system-internal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('switch-system-customer')).not.toBeInTheDocument();

    // Open Settings Modal -> Change Password
    fireEvent.click(screen.getByTestId('btn-open-account-settings'));
    fireEvent.click(await screen.findByTestId('settings-tab-security'));
    fireEvent.change(screen.getByTestId('settings-current-password'), {
      target: { value: '123' }
    });
    fireEvent.change(screen.getByTestId('settings-new-password'), {
      target: { value: 'NewPass2026!' }
    });
    fireEvent.change(screen.getByTestId('settings-confirm-password'), {
      target: { value: 'NewPass2026!' }
    });
    fireEvent.click(screen.getByTestId('btn-save-new-password'));
    expect(await screen.findByText(/Đã cập nhật mật khẩu bảo mật thành công/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Đóng cài đặt'));

    // 3. Login as ADMIN -> Avatar dropdown MUST ONLY show Internal NOC + Admin Users (NEVER cross-role portals) + Logout
    fireEvent.click(screen.getByTestId('test-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('user-avatar-trigger')).toHaveTextContent('admin');
    });
    fireEvent.click(screen.getByTestId('user-avatar-trigger'));
    expect(await screen.findByTestId('switch-system-internal')).toBeInTheDocument();
    expect(screen.getByTestId('btn-menu-admin-users')).toBeInTheDocument();
    expect(screen.queryByTestId('switch-system-shipper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('switch-system-customer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('switch-system-driver')).not.toBeInTheDocument();

    // Logout restores Login CTA
    fireEvent.click(screen.getByTestId('btn-menu-logout'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-nav-login')).toBeInTheDocument();
    });
  });

  it('supports uniform role password 123 and soft delete + restore across IAM accounts', async () => {
    function SoftDeleteHarness() {
      const { user, accounts, login, logout, adminDeleteAccount, adminRestoreAccount } = useAuth();
      const [statusMsg, setStatusMsg] = useState('');
      return (
        <div>
          <div data-testid="sd-user">{user ? `${user.username}:${user.role}` : 'ANON'}</div>
          <div data-testid="sd-msg">{statusMsg}</div>
          <div data-testid="sd-deleted-count">{accounts.filter((a) => a.isDeleted).length}</div>
          <button
            type="button"
            data-testid="btn-login-all-roles"
            onClick={async () => {
              const rolesToCheck = ['admin', 'dispatcher', 'driver', 'auditor', 'safety', 'customer'];
              for (const uname of rolesToCheck) {
                await login(uname, '123');
              }
              setStatusMsg('ALL_ROLES_123_OK');
            }}
          >
            Check All Roles 123
          </button>
          <button
            type="button"
            data-testid="btn-soft-delete-dispatcher"
            onClick={() => {
              adminDeleteAccount('dispatcher');
              setStatusMsg('SOFT_DELETED_DISPATCHER');
            }}
          >
            Soft Delete Dispatcher
          </button>
          <button
            type="button"
            data-testid="btn-login-deleted-dispatcher"
            onClick={async () => {
              logout();
              try {
                await login('dispatcher', '123');
                setStatusMsg('UNEXPECTED_OK');
              } catch (e) {
                setStatusMsg(`BLOCKED:${e.message}`);
              }
            }}
          >
            Login Deleted Dispatcher
          </button>
          <button
            type="button"
            data-testid="btn-restore-dispatcher"
            onClick={async () => {
              await login('admin', '123');
              adminRestoreAccount('dispatcher');
              await login('dispatcher', '123');
              setStatusMsg('RESTORED_AND_LOGGED_IN');
            }}
          >
            Restore Dispatcher
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <SoftDeleteHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('btn-login-all-roles'));
    await waitFor(() => {
      expect(screen.getByTestId('sd-msg')).toHaveTextContent('ALL_ROLES_123_OK');
    });

    fireEvent.click(screen.getByTestId('btn-soft-delete-dispatcher'));
    expect(screen.getByTestId('sd-deleted-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('btn-login-deleted-dispatcher'));
    await waitFor(() => {
      expect(screen.getByTestId('sd-msg').textContent).toMatch(/xóa mềm/i);
    });

    fireEvent.click(screen.getByTestId('btn-restore-dispatcher'));
    await waitFor(() => {
      expect(screen.getByTestId('sd-msg')).toHaveTextContent('RESTORED_AND_LOGGED_IN');
    });
    expect(screen.getByTestId('sd-deleted-count')).toHaveTextContent('0');
  });

  it('ranks and matches records using Vietnamese accent-insensitive Elastic fuzzy search', () => {
    const sample = [
      { id: 1, name: 'Sữa tươi Vinamilk 100%', zone: 'Từ Sơn - Bắc Ninh', code: 'PKG-DB-0001' },
      { id: 2, name: 'Linh kiện Samsung Bắc Ninh', zone: 'Yên Phong - Bắc Ninh', code: 'PKG-DB-0002' },
      { id: 3, name: 'Thép cuộn Hòa Phát', zone: 'Biên Hòa - Đồng Nai', code: 'PKG-BH-0101' }
    ];

    const accentless = elasticSearchMatch(sample, 'sua tuoi vinamlk', ['name', 'zone', 'code']);
    expect(accentless.items).toHaveLength(1);
    expect(accentless.items[0].code).toBe('PKG-DB-0001');

    const exact = elasticSearchMatch(sample, 'hoa phat', ['name', 'zone', 'code']);
    expect(exact.items).toHaveLength(1);
    expect(exact.items[0].id).toBe(3);
  });

  it('prevents ADMIN and other roles from rotating into another role portal without an authorized account', () => {
    const adminWs = getAccessibleWorkspaces({ username: 'admin', role: 'ADMIN' });
    expect(adminWs.map((w) => w.path)).toEqual(['/portal']);

    const dispatcherWs = getAccessibleWorkspaces({ username: 'dispatcher', role: 'DISPATCHER' });
    expect(dispatcherWs.map((w) => w.path)).toEqual(['/portal']);

    const safetyWs = getAccessibleWorkspaces({ username: 'safety', role: 'SAFETY_MANAGER' });
    expect(safetyWs.map((w) => w.path)).toEqual(['/portal']);

    const shipperWs = getAccessibleWorkspaces({
      username: 'shipper',
      role: 'HUB_SHIPPER',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: 'SHP-BN-001'
    });
    expect(shipperWs.map((w) => w.path)).toEqual(['/shipper']);

    const customerWs = getAccessibleWorkspaces({ username: 'customer', role: 'CUSTOMER' });
    expect(customerWs.map((w) => w.path)).toEqual(['/customer']);

    const driverWs = getAccessibleWorkspaces({ username: 'driver', role: 'DRIVER' });
    expect(driverWs.map((w) => w.path)).toEqual(['/driver']);
  });

  it('replaces the legacy top role card in Sidebar with a unified Account Info Card + Settings modal for all roles', async () => {
    function RoleCardHarness() {
      const { login } = useAuth();
      return (
        <div>
          <button type="button" data-testid="btn-role-login" onClick={() => login('dispatcher', '123')}>
            Login Dispatcher
          </button>
          <Sidebar />
          <SidebarAccountCard variant="header-pill" />
        </div>
      );
    }

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <RoleCardHarness />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-role-login'));
    const cards = await screen.findAllByTestId('account-info-card');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Mạng Nội Bộ Vận Hành')).not.toBeInTheDocument();

    const settingsBtns = screen.getAllByTestId('sidebar-account-settings');
    fireEvent.click(settingsBtns[0]);
    expect(await screen.findByRole('dialog', { name: /Cài Đặt Tài Khoản & Hệ Thống/i })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('settings-tab-preferences'));
    expect(screen.getByText(/Chu kỳ làm mới dữ liệu Telemetry/i)).toBeInTheDocument();
  });
});
