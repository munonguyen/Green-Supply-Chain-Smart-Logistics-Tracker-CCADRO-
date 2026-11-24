import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Header from '../shared/layout/Header';
import ConsoleLayout from '../shared/layout/ConsoleLayout';

function seedUser(role = 'DISPATCHER') {
  const store = new Map();
  store.set(
    'ccadro_user',
    JSON.stringify({
      username: role.toLowerCase(),
      fullName: 'Người Dùng Demo',
      role,
      email: `${role.toLowerCase()}@ccadro.vn`
    })
  );
  store.set('ccadro_token', 'tok-halvi-test');
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

function ThemeHarness() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" data-testid="theme-btn" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

describe('Halvi-inspired Effects Integration', () => {
  beforeEach(() => {
    seedUser('DISPATCHER');
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
    delete document.startViewTransition;
  });

  it('uses startViewTransition circular clip-path when toggling theme if supported', async () => {
    const animateMock = vi.fn();
    document.documentElement.animate = animateMock;
    const startViewTransition = vi.fn((cb) => {
      cb();
      return { ready: Promise.resolve() };
    });
    document.startViewTransition = startViewTransition;

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    const btn = screen.getByTestId('theme-btn');
    expect(btn).toHaveTextContent('dark');
    fireEvent.click(btn, { clientX: 300, clientY: 40 });

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    await waitFor(() => expect(animateMock).toHaveBeenCalledTimes(1));
    expect(animateMock.mock.calls[0][0].clipPath[0]).toContain('circle(0px at 300px 40px)');
  });

  it('opens Command Finder on Cmd/Ctrl+K or trigger click and navigates cleanly across role-permitted routes', async () => {
    render(
      <MemoryRouter initialEntries={['/shipments']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route
                path="/shipments"
                element={
                  <ConsoleLayout>
                    <div>Trang Vận Đơn</div>
                  </ConsoleLayout>
                }
              />
              <Route
                path="/vehicle-fuels"
                element={
                  <ConsoleLayout>
                    <div>Trang Nhiên Liệu Đội Xe</div>
                  </ConsoleLayout>
                }
              />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: 'Tìm nhanh chức năng' });
    expect(dialog).toBeInTheDocument();

    const search = screen.getByLabelText('Tìm nhanh chức năng hệ thống');
    fireEvent.change(search, { target: { value: 'Nhiên Liệu' } });
    fireEvent.keyDown(dialog, { key: 'Enter' });

    expect(await screen.findByText('Trang Nhiên Liệu Đội Xe')).toBeInTheDocument();
  });

  it('opens Command Finder from Header trigger and closes smoothly on Escape', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <Header title="Test Halvi Header" />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tìm nhanh chức năng' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tìm nhanh chức năng' });
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Tìm nhanh chức năng' })).not.toBeInTheDocument()
    );
  });
});

