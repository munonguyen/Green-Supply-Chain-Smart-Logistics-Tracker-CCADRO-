import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import LoginPage from '../systems/public/features/auth/LoginPage';
import { api } from '../services/api';

beforeEach(() => {
  const values = new Map([['ccadro_token', 'iam-jwt-admin-old']]);
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, String(v)),
      removeItem: (k) => values.delete(k)
    }
  });
});
afterEach(() => vi.restoreAllMocks());
it('chat recovery requires a server session and never silently logs in locally when Identity is unavailable', async () => {
  vi.spyOn(api, 'login').mockRejectedValue(new Error('Không kết nối được máy chủ xác thực'));
  render(
    <MemoryRouter initialEntries={['/login?backend=required']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByRole('status')).toHaveTextContent('Đăng nhập với máy chủ');
  fireEvent.change(document.querySelector('#login-username'), { target: { value: 'admin' } });
  fireEvent.change(document.querySelector('#login-password'), { target: { value: '123' } });
  fireEvent.submit(document.querySelector('form'));
  expect(await screen.findByText('Không kết nối được máy chủ xác thực')).toBeInTheDocument();
  expect(window.localStorage.getItem('ccadro_token')).toBe('iam-jwt-admin-old');
});
