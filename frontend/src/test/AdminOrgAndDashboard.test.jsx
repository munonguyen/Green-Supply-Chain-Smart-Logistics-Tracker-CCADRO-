import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import GovernanceAndSafetyPage from '../systems/admin/features/governance/GovernanceAndSafetyPage';
import DashboardPage from '../systems/admin/features/dashboard/DashboardPage';

vi.mock('../shared/map/RealTimeFleetMap3D', () => ({
  default: () => <div data-testid="mock-fleet-map">Mock Fleet Map 3D</div>
}));

function AdminOrgHarness({ initialSubTab = 'BRANCHES' }) {
  const { user, login } = useAuth();
  return (
    <div>
      <button type="button" data-testid="btn-login-admin" onClick={() => login('admin', '123')}>
        Login Admin
      </button>
      <div data-testid="active-admin">{user ? user.username : 'ANON'}</div>
      <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab={initialSubTab} />
    </div>
  );
}

function DashboardHarness() {
  const { user, login } = useAuth();
  return (
    <div>
      <button type="button" data-testid="btn-login-admin" onClick={() => login('admin', '123')}>
        Login Admin
      </button>
      <div data-testid="active-admin">{user ? user.username : 'ANON'}</div>
      <DashboardPage />
    </div>
  );
}

describe('Admin Branches CRUD, Staff-by-Role CRUD & Revenue Dashboard', () => {
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

  it('supports full Branch CRUD: create, edit, filter, soft delete and restore', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <AdminOrgHarness initialSubTab="BRANCHES" />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('active-admin')).toHaveTextContent('admin');
    });

    expect(await screen.findByText(/BR-HCM-HQ/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mã Chi Nhánh *'), {
      target: { value: 'BR-CT-NEW' }
    });
    fireEvent.change(screen.getByLabelText('Tỉnh / Thành Phố *'), {
      target: { value: 'Cần Thơ' }
    });
    fireEvent.change(screen.getByLabelText('Tên Chi Nhánh / Trung Tâm *'), {
      target: { value: 'Chi Nhánh Cảng Cái Cui — Cần Thơ' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Khởi Tạo Chi Nhánh/i }));

    expect(
      await screen.findByText(/Đã khởi tạo chi nhánh mới "Chi Nhánh Cảng Cái Cui — Cần Thơ"/i)
    ).toBeInTheDocument();
    expect(screen.getByText('BR-CT-NEW')).toBeInTheDocument();

    const newBranchRow = screen.getByText('BR-CT-NEW').closest('tr');
    const editBtn = newBranchRow.querySelector('button[title="Chỉnh sửa chi nhánh"]');
    fireEvent.click(editBtn);

    fireEvent.change(screen.getByLabelText('Tên Chi Nhánh / Trung Tâm *'), {
      target: { value: 'Chi Nhánh Cảng Cái Cui (Mở Rộng)' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu Cập Nhật Chi Nhánh/i }));
    expect(
      await screen.findByText(/Đã cập nhật chi nhánh "Chi Nhánh Cảng Cái Cui \(Mở Rộng\)"/i)
    ).toBeInTheDocument();

    const updatedRow = screen.getByText('BR-CT-NEW').closest('tr');
    const deleteBtn = updatedRow.querySelector('button[title="Xóa mềm chi nhánh"]');
    fireEvent.click(deleteBtn);
    expect(await screen.findByText(/Đã xóa mềm chi nhánh BR-CT-NEW/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Thùng rác/i }));
    const deletedRow = await screen.findByText('BR-CT-NEW');
    const restoreBtn = deletedRow.closest('tr').querySelector('button[title="Khôi phục chi nhánh"]');
    fireEvent.click(restoreBtn);
    expect(await screen.findByText(/Đã khôi phục hoạt động chi nhánh BR-CT-NEW/i)).toBeInTheDocument();
  }, 30000);

  it('supports full Staff by Role CRUD: grouped by role, filter, create, edit, soft delete and restore', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <AdminOrgHarness initialSubTab="STAFF" />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('active-admin')).toHaveTextContent('admin');
    });

    expect(
      await screen.findByText(/Danh Sách Nhân Viên Theo Từng Vai Trò/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/NV-ADM-001/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mã Nhân Viên *'), {
      target: { value: 'NV-DSP-777' }
    });
    fireEvent.change(screen.getByLabelText('Vai Trò Nghiệp Vụ *'), {
      target: { value: 'DISPATCHER' }
    });
    fireEvent.change(screen.getByLabelText('Họ Và Tên *'), {
      target: { value: 'Ngô Minh Tâm' }
    });
    fireEvent.change(screen.getByLabelText('Email Công Ty *'), {
      target: { value: 'tam.ngo@ccadro.vn' }
    });
    fireEvent.change(screen.getByLabelText('Phòng Ban *'), {
      target: { value: 'Trung Tâm Điều Hành NOC' }
    });
    fireEvent.change(screen.getByLabelText('Chức Danh *'), {
      target: { value: 'Điều Phối Tuyến EV' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Thêm Nhân Viên Vào Hệ Thống/i }));

    expect(
      await screen.findByText(/Đã thêm nhân viên "Ngô Minh Tâm" vào vai trò DISPATCHER/i)
    ).toBeInTheDocument();
    expect(screen.getByText('NV-DSP-777')).toBeInTheDocument();

    const staffRow = screen.getByText('NV-DSP-777').closest('tr');
    fireEvent.click(staffRow.querySelector('button[title="Chỉnh sửa nhân viên"]'));
    fireEvent.change(screen.getByLabelText('Chức Danh *'), {
      target: { value: 'Điều Phối Trưởng Ca EV' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu Cập Nhật Nhân Viên/i }));
    expect(
      await screen.findByText(/Đã cập nhật hồ sơ nhân viên "Ngô Minh Tâm"/i)
    ).toBeInTheDocument();

    const updatedStaffRow = screen.getByText('NV-DSP-777').closest('tr');
    fireEvent.click(updatedStaffRow.querySelector('button[title="Xóa mềm nhân viên"]'));
    expect(
      await screen.findByText(/Đã xóa mềm nhân viên Ngô Minh Tâm \(NV-DSP-777\)/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Thùng rác/i }));
    const deletedStaffCode = await screen.findByText('NV-DSP-777');
    fireEvent.click(deletedStaffCode.closest('tr').querySelector('button[title="Khôi phục nhân viên"]'));
    expect(
      await screen.findByText(/Đã khôi phục hồ sơ nhân viên Ngô Minh Tâm \(NV-DSP-777\)/i)
    ).toBeInTheDocument();
  }, 30000);

  it('displays Revenue KPIs, Revenue & Branch chart, and org/revenue supervision tabs on DashboardPage', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <DashboardHarness />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('active-admin')).toHaveTextContent('admin');
    });

    expect((await screen.findAllByText(/Doanh Thu Đã Thu \(PAID\)/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Công Nợ Net-30/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Phân Tích Doanh Thu, Công Nợ Net-30 & Chỉ Tiêu Chi Nhánh/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Doanh Thu & Hợp Đồng/i }));
    expect(screen.getByText(/Đối Soát Hạn Mức Công Ty B2B/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Chi Nhánh & Nhân Sự/i }));
    expect(screen.getByText(/CRUD Chi Nhánh \(\/admin\/branches\)/i)).toBeInTheDocument();
    expect(screen.getByText(/CRUD Nhân Viên Theo Vai Trò \(\/admin\/staff\)/i)).toBeInTheDocument();
  }, 15000);

  it('displays dedicated Driver directory (DRIVER / HUB_SHIPPER) and enforces compliance approval checklist', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <AdminOrgHarness initialSubTab="DRIVERS" />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('active-admin')).toHaveTextContent('admin');
    });

    expect(
      await screen.findByText(/Danh Sách Nhân Viên Lái Xe & Giao Nhận/i)
    ).toBeInTheDocument();
    // Drivers present, non-driver ADMIN hidden in scoped list
    expect(screen.getByText('NV-DRV-005')).toBeInTheDocument();
    expect(screen.getByText('NV-DRV-009')).toBeInTheDocument();
    expect(screen.queryByText('NV-ADM-001')).not.toBeInTheDocument();

    // Open compliance detail modal for pending driver NV-DRV-009
    const pendingDriverRow = screen.getByText('NV-DRV-009').closest('tr');
    fireEvent.click(pendingDriverRow.querySelector('button[title="Xem chi tiết & kiểm duyệt nghiệp vụ"]'));

    expect(
      await screen.findByRole('dialog', { name: /Trần Quốc Tuấn/i })
    ).toBeInTheDocument();

    // Missing healthCheckPassed -> blocks APPROVED
    fireEvent.click(screen.getByRole('button', { name: /Phê Duyệt Đạt Chuẩn Nghiệp Vụ/i }));
    expect(
      await screen.findByText(/Chưa đủ điều kiện phê duyệt nghiệp vụ/i)
    ).toBeInTheDocument();

    // Check healthCheckPassed box -> approve succeeds
    fireEvent.click(screen.getByLabelText(/Đạt giấy khám sức khỏe/i));
    fireEvent.click(screen.getByRole('button', { name: /Phê Duyệt Đạt Chuẩn Nghiệp Vụ/i }));

    expect(
      await screen.findByText(/Đã cập nhật kiểm duyệt nghiệp vụ cho Trần Quốc Tuấn \(NV-DRV-009\): Đã kiểm duyệt đạt chuẩn/i)
    ).toBeInTheDocument();
  }, 15000);

  it('displays dedicated Controller directory (SAFETY_MANAGER / ESG_AUDITOR / HUB_AUDITOR) and approves sign-off authority', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <AdminOrgHarness initialSubTab="CONTROLLERS" />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('btn-login-admin'));
    await waitFor(() => {
      expect(screen.getByTestId('active-admin')).toHaveTextContent('admin');
    });

    expect(
      await screen.findByText(/Danh Sách Nhân Viên Kiểm Soát & Kiểm Toán/i)
    ).toBeInTheDocument();
    expect(screen.getByText('NV-SAF-003')).toBeInTheDocument();
    expect(screen.getByText('NV-ESG-004')).toBeInTheDocument();
    expect(screen.getByText('NV-SAF-011')).toBeInTheDocument();
    expect(screen.queryByText('NV-DRV-005')).not.toBeInTheDocument();

    // Open compliance modal for pending controller NV-SAF-011
    const pendingCtrlRow = screen.getByText('NV-SAF-011').closest('tr');
    fireEvent.click(pendingCtrlRow.querySelector('button[title="Xem chi tiết & kiểm duyệt nghiệp vụ"]'));

    // Missing sign-off permission -> blocked until checked
    const ctrlDialog = await screen.findByRole('dialog', { name: /Nguyễn Thanh Tùng/i });
    expect(ctrlDialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Phê Duyệt Đạt Chuẩn Nghiệp Vụ/i }));
    await waitFor(() => {
      expect(within(ctrlDialog).getByRole('alert')).toHaveTextContent(
        /Cấp quyền ký duyệt chứng từ nghiệp vụ/i
      );
    });

    fireEvent.click(within(ctrlDialog).getByLabelText(/Cấp quyền ký duyệt/i));
    fireEvent.click(within(ctrlDialog).getByRole('button', { name: /Phê Duyệt Đạt Chuẩn Nghiệp Vụ/i }));

    expect(
      await screen.findByText(/Đã cập nhật kiểm duyệt nghiệp vụ cho Nguyễn Thanh Tùng \(NV-SAF-011\): Đã kiểm duyệt đạt chuẩn/i)
    ).toBeInTheDocument();
  }, 30000);
});
