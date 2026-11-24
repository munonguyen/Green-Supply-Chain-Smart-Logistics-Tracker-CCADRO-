import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import NotFoundPage from '../shared/components/feedback/NotFoundPage';
import SystemErrorPage from '../shared/components/feedback/SystemErrorPage';
import AppErrorBoundary from '../shared/components/feedback/AppErrorBoundary';
import ErrorReportModal from '../shared/components/feedback/ErrorReportModal';

function CrashingComponent() {
  throw new Error('Test boundary crash');
}

describe('CCADRO Error Pages and Diagnostics UI (Security & Privacy Compliant)', () => {
  it('renders NotFoundPage (404) with green logistics branding and telemetry hud', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <NotFoundPage />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    );

    // Assert 404 heading and branding
    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/Lệch Tuyến Vận Tải/i)).toBeInTheDocument();
    expect(screen.getByText(/Khoang Lái Tài Xế/i)).toBeInTheDocument();
    expect(screen.getByText(/Cổng Khách Hàng B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/Báo cáo sự cố \(SOC\)/i)).toBeInTheDocument();
  });

  it('renders SystemErrorPage (500) without exposing internal code, ports, or microservices architecture', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <SystemErrorPage errorCode="500" />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    );

    // Assert friendly user status
    expect(screen.getByText(/HỆ THỐNG ĐANG BẢO TRÌ TẠM THỜI/i)).toBeInTheDocument();
    expect(screen.getByText(/Dịch Vụ Tạm Thời Gián Đoạn Kết Nối/i)).toBeInTheDocument();
    expect(screen.getByText(/Bảo Mật Dữ Liệu/i)).toBeInTheDocument();
    expect(screen.getByText(/Tự Động Phục Hồi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kiểm tra lại kết nối/i })).toBeInTheDocument();

    // STRICT CHECK: Ensure internal code, architecture, and ports are NEVER exposed to users
    expect(screen.queryByText(/TRẠNG THÁI CỤM MICROSERVICES NỘI BỘ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/8888/)).not.toBeInTheDocument();
    expect(screen.queryByText(/8080/)).not.toBeInTheDocument();
    expect(screen.queryByText(/8083/)).not.toBeInTheDocument();
    expect(screen.queryByText(/8084/)).not.toBeInTheDocument();
    expect(screen.queryByText(/8085/)).not.toBeInTheDocument();
    expect(screen.queryByText(/8089/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pareto UC05/i)).not.toBeInTheDocument();
  });

  it('catches uncaught exceptions via AppErrorBoundary without exposing stack traces or code to user', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <CrashingComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/Hệ Thống Đã Kích Hoạt Chế Độ Cách Ly An Toàn/i)).toBeInTheDocument();
    expect(screen.getByText(/TẠM DỪNG TIẾN TRÌNH AN TOÀN/i)).toBeInTheDocument();
    expect(screen.getByText(/Tải lại trang an toàn/i)).toBeInTheDocument();
    expect(screen.getByText(/Xóa phiên & Đăng nhập lại/i)).toBeInTheDocument();

    // STRICT CHECK: Ensure raw stack traces or internal filenames are NEVER displayed to end-users
    expect(screen.queryByText(/STACK TRACE/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CHẨN ĐOÁN LỖI CLIENT/i)).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders ErrorReportModal and allows submitting incident ticket', () => {
    const handleClose = vi.fn();

    render(
      <ThemeProvider>
        <AuthProvider>
          <ErrorReportModal
            isOpen={true}
            onClose={handleClose}
            initialCategory="ROUTE_404"
          />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/CCADRO SOC • INCIDENT DISPATCH/i)).toBeInTheDocument();
    expect(screen.getByText(/Báo Cáo Sự Cố & Trục Trặc Hệ Thống/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi Tới Trung Tâm SOC/i })).toBeInTheDocument();
  });
});
