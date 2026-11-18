import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import GovernanceAndSafetyPage from '../systems/admin/features/governance/GovernanceAndSafetyPage';

function GovernanceAdminHarness() {
  const { user, login } = useAuth();
  return (
    <div>
      <button type="button" data-testid="btn-login-admin" onClick={() => login('admin', '123')}>
        Login Admin
      </button>
      <div data-testid="active-admin">{user ? user.username : 'ANON'}</div>
      <GovernanceAndSafetyPage />
    </div>
  );
}

describe('Admin Enterprise User Detail & Company Management', () => {
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

  it('allows ADMIN to manage B2B companies and edit user personal + company profile details', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <GovernanceAdminHarness />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('active-admin')).toHaveTextContent('admin');
    });

    // 1. Switch to Company Management sub-tab and create a new company
    fireEvent.click(screen.getByRole('button', { name: /Quản Lý Công Ty & Đối Tác B2B/i }));
    fireEvent.change(screen.getByPlaceholderText(/VD: MASAN_LOG/i), {
      target: { value: 'MASAN_LOG' }
    });
    fireEvent.change(screen.getByPlaceholderText(/VD: CTCP Hàng Tiêu Dùng Masan/i), {
      target: { value: 'CTCP Hàng Tiêu Dùng Masan Logistics' }
    });
    fireEvent.change(screen.getByPlaceholderText('0309998888'), {
      target: { value: '0309998888' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo Mới Hồ Sơ Công Ty/i }));

    expect(
      await screen.findByText(/Đã khởi tạo hồ sơ doanh nghiệp "CTCP Hàng Tiêu Dùng Masan Logistics"/i)
    ).toBeInTheDocument();

    // 2. Switch back to Users sub-tab and open Detail Modal for @customer
    fireEvent.click(screen.getByRole('button', { name: /Quản Lý User & Hồ Sơ Chi Tiết/i }));
    const detailBtns = await screen.findAllByRole('button', { name: /Chi tiết User \/ Công ty/i });
    expect(detailBtns.length).toBeGreaterThan(0);

    // Pick @customer row specifically
    const customerRow = screen.getByText('@customer').closest('tr');
    const customerDetailBtn = customerRow.querySelector('button');
    fireEvent.click(customerDetailBtn);

    expect(
      await screen.findByText(/Hồ Sơ Chi Tiết Người Dùng & Công Ty Trực Thuộc/i)
    ).toBeInTheDocument();

    // Edit job title
    fireEvent.change(screen.getByPlaceholderText(/VD: Trưởng phòng Logistics/i), {
      target: { value: 'Giám đốc Chuỗi cung ứng B2B' }
    });

    // Switch to Company tab inside modal and link MASAN_LOG
    fireEvent.click(screen.getByRole('button', { name: /Công Ty & Pháp Lý B2B/i }));
    const compSelect = screen.getByLabelText(/Gắn với Hồ sơ Công ty/i);
    const masanOption = Array.from(compSelect.options).find((o) => o.text.includes('MASAN_LOG'));
    expect(masanOption).toBeTruthy();
    fireEvent.change(compSelect, { target: { value: masanOption.value } });

    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /Lưu Thay Đổi Hồ Sơ/i }));
    expect(
      (await screen.findAllByText(/Đã lưu hồ sơ chi tiết & thông tin công ty cho tài khoản "@customer"/i))[0]
    ).toBeInTheDocument();

    // Close modal and verify @customer table row reflects new jobTitle & company
    fireEvent.click(screen.getByLabelText('Đóng hồ sơ chi tiết'));
    await waitFor(
      () => {
        const updatedCustomerRow = screen.getByText('@customer').closest('tr');
        const rowUtils = within(updatedCustomerRow);
        expect(rowUtils.getByText(/Giám đốc Chuỗi cung ứng B2B/i)).toBeInTheDocument();
        expect(rowUtils.getByText(/CTCP Hàng Tiêu Dùng Masan Logistics/i)).toBeInTheDocument();
        expect(rowUtils.getByText(/MST: 0309998888/i)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);
});
