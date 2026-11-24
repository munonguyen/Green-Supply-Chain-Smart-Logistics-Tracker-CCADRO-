import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import RequireRole from '../app/RequireRole';

const auth = vi.hoisted(() => ({ user: null, sessionChecking: false, logout: vi.fn() }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => auth,
  getDefaultPortalPath: () => '/portal'
}));
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true, theme: 'dark' })
}));

beforeEach(() => {
  auth.user = null;
  auth.sessionChecking = false;
  auth.logout = vi.fn();
});

function openRoute() {
  render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route
          path="/private"
          element={
            <RequireRole allowedRoles={['DRIVER']}>
              <div>Protected data</div>
            </RequireRole>
          }
        />
        <Route path="/login" element={<h1>Login screen</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

it('sends an anonymous visitor to login so they do not hit a dark 404 dead-end', () => {
  openRoute();
  expect(screen.getByRole('heading', { name: 'Login screen' })).toBeInTheDocument();
  expect(screen.queryByText('Protected data')).not.toBeInTheDocument();
});

it('renders a branded loading state while verifying background session', () => {
  auth.sessionChecking = true;
  openRoute();
  expect(screen.getByText('Đang xác thực phiên làm việc...')).toBeInTheDocument();
  expect(screen.queryByText('Protected data')).not.toBeInTheDocument();
});

it('shows 404 role isolation warning when user has a mismatched role without auto-redirecting', () => {
  auth.user = { username: 'admin-account', role: 'ADMIN' };
  openRoute();
  expect(screen.getByRole('heading', { name: /Không tìm thấy trang/i })).toBeInTheDocument();
  expect(screen.getByText('404')).toBeInTheDocument();
  expect(screen.getByTestId('role-isolation-404')).toBeInTheDocument();
  expect(screen.queryByText('Protected data')).not.toBeInTheDocument();
});

it('renders the workspace for an authenticated matching role', () => {
  auth.user = { username: 'driver-01', role: 'DRIVER' };
  openRoute();
  expect(screen.getByText('Protected data')).toBeInTheDocument();
});
