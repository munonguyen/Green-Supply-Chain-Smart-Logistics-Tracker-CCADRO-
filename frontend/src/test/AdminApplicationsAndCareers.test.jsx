import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import CareersApplyPage from '../systems/public/features/careers/CareersApplyPage';
import GovernanceAndSafetyPage from '../systems/admin/features/governance/GovernanceAndSafetyPage';

function AdminApplicationsHarness() {
  const { user, login } = useAuth();
  return (
    <div>
      <button type="button" data-testid="btn-login-admin" onClick={() => login('admin', '123')}>
        Login Admin
      </button>
      <div data-testid="active-admin">{user ? user.username : 'ANON'}</div>
      <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="APPLICATIONS" />
    </div>
  );
}

describe('Public Careers Portal & Admin Job Application Onboarding', () => {
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

  it('allows public candidate to apply as Driver and look up progress by applicationCode and PIN', async () => {
    render(
      <MemoryRouter>
        <CareersApplyPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/CCADRO Green Logistics Careers/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('VD: Đỗ Văn Khải'), {
      target: { value: 'Nguyễn Hoàng Nam' }
    });
    fireEvent.change(screen.getByPlaceholderText('khai.driver@gmail.com'), {
      target: { value: 'nam.driver@gmail.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('0912-345-678'), {
      target: { value: '0909-888-777' }
    });
    fireEvent.change(screen.getByPlaceholderText('790192004512'), {
      target: { value: '790195009999' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Gửi Hồ Sơ Ứng Tuyển/i }));

    const appCodeEl = await screen.findByTestId('receipt-app-code');
    const pinEl = screen.getByTestId('receipt-lookup-pin');
    const createdCode = appCodeEl.textContent;
    const createdPin = pinEl.textContent;

    expect(createdCode).toMatch(/^APP-2026-/);
    expect(createdPin).toMatch(/^\d{6}$/);

    fireEvent.click(screen.getByRole('button', { name: /Tra cứu tiến độ hồ sơ ngay/i }));
    fireEvent.click(screen.getByRole('button', { name: /Kiểm Tra/i }));

    expect(await screen.findByText(new RegExp(`Nguyễn Hoàng Nam — ${createdCode}`))).toBeInTheDocument();
    expect(screen.getByText('Đã Nộp Hồ Sơ')).toBeInTheDocument();
  });

  it('enforces drive test gate, approves & onboards Driver into Nhân Viên Lái Xe list', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <AdminApplicationsHarness />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('active-admin')).toHaveTextContent('admin');
    });

    expect(await screen.findByText('APP-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Đỗ Văn Khải')).toBeInTheDocument();
    expect(screen.getByText('Lê Minh Tú')).toBeInTheDocument();

    const approveButtons = screen.getAllByRole('button', { name: /Xác Nhận Tiếp Nhận/i });

    // Trigger onboarding on APP-2026-0002 (driveTestPassed = false) -> blocked by gate
    fireEvent.click(approveButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Tiếp Nhận & Cấp TK/i }));

    expect(
      await screen.findByText(/phải hoàn thành kiểm tra tay lái/i)
    ).toBeInTheDocument();

    // Approve & Onboard APP-2026-0001 (Đỗ Văn Khải, driveTestPassed = true + full compliance)
    fireEvent.click(screen.getAllByRole('button', { name: /Xác Nhận Tiếp Nhận/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Tiếp Nhận & Cấp TK/i }));

    expect(await screen.findByText(/Đã tiếp nhận Đỗ Văn Khải/i)).toBeInTheDocument();

    // Verify new Driver appears in Nhân Viên Lái Xe tab
    fireEvent.click(screen.getByRole('button', { name: /Nhân Viên Lái Xe/i }));
    expect(await screen.findByText('Đỗ Văn Khải')).toBeInTheDocument();
  });
});

