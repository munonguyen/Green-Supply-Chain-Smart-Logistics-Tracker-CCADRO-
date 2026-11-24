import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShipperDossierPanel from '../systems/hub/features/shippers/ShipperDossierPanel';
import { DINHBANG_HUB, DINHBANG_SHIPPERS } from '../systems/hub/shared/hubShipperSeedData';

describe('ShipperDossierPanel - Verified Shipper Compliance Profile & Avatar', () => {
  const onSaveProfile = vi.fn().mockResolvedValue(undefined);
  const onVerifyKyc = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete real-world eKYC, avatar, completeness bar, license, vehicle compliance and SLA metrics', () => {
    render(
      <MemoryRouter>
        <ShipperDossierPanel
          activeHub={DINHBANG_HUB}
          hubShippers={DINHBANG_SHIPPERS}
          activeShipperProfile={DINHBANG_SHIPPERS[0]}
          manifestItems={[]}
          isHubShipper={true}
          canVerifyKyc={false}
          isReadOnlyAuditor={false}
          onSaveProfile={onSaveProfile}
          onVerifyKyc={onVerifyKyc}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Nguyễn Văn Bắc' })).toBeInTheDocument();
    expect(screen.getByTestId('shipper-kyc-badge')).toHaveTextContent('Đã xác thực eKYC & Pháp lý');
    expect(screen.getByLabelText('Độ hoàn thiện hồ sơ xác thực')).toHaveTextContent('100%');
    expect(screen.getByRole('button', { name: 'Đổi ảnh đại diện' })).toBeInTheDocument();
    expect(screen.getByText(/027094\*\*\*\*86/)).toBeInTheDocument();
    expect(screen.getByText(/LLTP-BN-2026-0142/)).toBeInTheDocument();
    expect(screen.getAllByText(/Hạng B2/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Đã cấp chứng chỉ vận hành lạnh/)).toBeInTheDocument();
    expect(screen.getAllByText(/99C-182\.68/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/99\.1%/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Phê duyệt đạt chuẩn eKYC/i })).not.toBeInTheDocument();
  });

  it('allows shipper to switch avatar preset & update full profile fields, and allows manager to verify KYC', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <ShipperDossierPanel
          activeHub={DINHBANG_HUB}
          hubShippers={DINHBANG_SHIPPERS}
          activeShipperProfile={DINHBANG_SHIPPERS[0]}
          manifestItems={[]}
          isHubShipper={true}
          canVerifyKyc={false}
          onSaveProfile={onSaveProfile}
          onVerifyKyc={onVerifyKyc}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Cập nhật hồ sơ & giấy tờ/i }));
    fireEvent.click(screen.getByRole('button', { name: /Chuỗi lạnh Xanh/i }));
    fireEvent.change(screen.getByLabelText('Số điện thoại công vụ'), {
      target: { value: '0978 000 111' }
    });
    fireEvent.change(screen.getByLabelText('Số đăng ký (Cà vẹt)'), {
      target: { value: '99A-888999' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu cập nhật hồ sơ/i }));

    await waitFor(() =>
      expect(onSaveProfile).toHaveBeenCalledWith(
        'SHP-BN-001',
        expect.objectContaining({
          phone: '0978 000 111',
          vehicleRegistrationNo: '99A-888999',
          avatarUrl: expect.stringContaining('data:image/svg+xml')
        })
      )
    );

    rerender(
      <MemoryRouter>
        <ShipperDossierPanel
          activeHub={DINHBANG_HUB}
          hubShippers={DINHBANG_SHIPPERS}
          activeShipperProfile={DINHBANG_SHIPPERS[2]}
          manifestItems={[]}
          isHubShipper={false}
          canVerifyKyc={true}
          onSaveProfile={onSaveProfile}
          onVerifyKyc={onVerifyKyc}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Lê Hoàng Kinh Bắc/i }));
    fireEvent.change(
      screen.getByPlaceholderText(/Ghi chú kiểm tra CCCD, GPLX, đăng kiểm/i),
      { target: { value: 'Đã kiểm tra bản gốc CCCD và đăng kiểm mới.' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /Phê duyệt đạt chuẩn eKYC/i }));

    await waitFor(() =>
      expect(onVerifyKyc).toHaveBeenCalledWith('SHP-BN-003', {
        kycStatus: 'VERIFIED',
        kycNote: 'Đã kiểm tra bản gốc CCCD và đăng kiểm mới.'
      })
    );
  });
});
