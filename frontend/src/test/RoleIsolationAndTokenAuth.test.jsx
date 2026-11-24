import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../app/App';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import DriverTerminalPage from '../systems/driver/features/terminal/DriverTerminalPage';

vi.mock('../shared/map/MapView', () => ({
  default: ({ hudTitle, children }) => (
    <div data-testid="mock-map-view">
      <span>{hudTitle}</span>
      {children}
    </div>
  )
}));
vi.mock('../shared/map/RoutePolyline', () => ({ default: () => null }));
vi.mock('../shared/map/OriginMarker', () => ({ default: () => null }));
vi.mock('../shared/map/DestinationMarker', () => ({ default: () => null }));
vi.mock('../shared/map/VehicleMarker', () => ({ default: () => null }));
vi.mock('../shared/map/DeviationMarker', () => ({ default: () => null }));

function installMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    }
  });
  return store;
}

describe('Role Isolation 404 Auth, Logout Token Blacklist & Unified Driver Console', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ code: 1000, result: [] })),
        json: () => Promise.resolve({ code: 1000, result: [] })
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('shows a generic 404 when ADMIN accesses /driver without disclosing role or invalidating the session', async () => {
    const store = installMockStorage({
      ccadro_user: JSON.stringify({
        username: 'admin',
        role: 'ADMIN',
        fullName: 'Root Admin',
        portalType: 'INTERNAL'
      }),
      ccadro_token: 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiJ9.sig',
      ccadro_refresh_token: 'ccr_test_refresh_001'
    });

    window.history.pushState({}, '', '/driver');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.queryByText('Root Admin')).not.toBeInTheDocument();
    expect(screen.queryByText(/Trung Tâm Giám Sát Toàn Hệ Thống/i)).not.toBeInTheDocument();
    expect(store.get('ccadro_token')).toBe('eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiJ9.sig');

    const logoutCalls = global.fetch.mock.calls.filter(([url]) =>
      String(url).includes('/api/v1/auth/logout')
    );
    expect(logoutCalls).toHaveLength(0);
  });

  it('shows an unlinked driver state without sample containers when the profile cannot be loaded', async () => {
    installMockStorage({
      ccadro_user: JSON.stringify({
        username: 'driver',
        role: 'DRIVER',
        fullName: 'Nguyễn Văn Tài',
        portalType: 'INTERNAL'
      }),
      ccadro_token: 'test-token-DRIVER'
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/driver']}>
        <ThemeProvider>
          <AuthProvider>
            <DriverTerminalPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Chưa đọc được hồ sơ tài xế liên kết/)).toBeInTheDocument();
    expect(container.querySelector('aside.sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('TCKU-781920-4')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument();

  });
});
