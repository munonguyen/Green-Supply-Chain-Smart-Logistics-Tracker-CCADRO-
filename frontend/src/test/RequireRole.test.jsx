import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import RequireRole from '../app/RequireRole';

const auth = vi.hoisted(() => ({ user: null }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
beforeEach(() => { auth.user = null; });

function openRoute(external = false) {
  render(<MemoryRouter initialEntries={['/private']}><Routes>
    <Route path="/private" element={<RequireRole external={external} allowedRoles={['DRIVER']}><div>Protected data</div></RequireRole>} />
    <Route path="/login" element={<h1>Login screen</h1>} />
  </Routes></MemoryRouter>);
}
it('shows a generic 404 for anonymous internal page access without rendering protected content', () => {
  openRoute();
  expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
  expect(screen.queryByText('Protected data')).not.toBeInTheDocument();
});
it('sends an anonymous external portal visitor to login', () => {
  openRoute(true);
  expect(screen.getByRole('heading', { name: 'Login screen' })).toBeInTheDocument();
});
it('does not disclose roles or account information for the wrong role', () => {
  auth.user = { username: 'private-account', role: 'CUSTOMER' };
  openRoute();
  expect(screen.getByText('404')).toBeInTheDocument();
  expect(screen.queryByText(/private-account|CUSTOMER|DRIVER/)).not.toBeInTheDocument();
});
it('renders the workspace for an authenticated matching role', () => {
  auth.user = { role: 'DRIVER' };
  openRoute();
  expect(screen.getByText('Protected data')).toBeInTheDocument();
});
