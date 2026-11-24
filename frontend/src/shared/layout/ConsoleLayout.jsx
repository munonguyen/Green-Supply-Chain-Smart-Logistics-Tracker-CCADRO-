import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export function getConsolePageTitle(pathname) {
  if (pathname === '/vehicle-fuels') return 'Nhiên Liệu & Dự Toán CO₂ Đội Xe';
  if (pathname === '/container-inspections') return 'Kiểm Tra Kỹ Thuật & An Toàn Container';
  if (pathname === '/dashboard') return 'Tổng Quan Hệ Thống (Dashboard NOC)';
  if (pathname === '/shipments') return 'Vận Đơn & Quản Lý Đơn Hàng';
  if (pathname === '/shipments/new') return 'Tạo Đơn Hàng Vận Chuyển Mới';
  if (pathname.startsWith('/planning/') || pathname === '/operations/planning')
    return 'Hoạch Định Tuyến Đường Xanh & Chi Phí Tối Ưu';
  if (pathname.startsWith('/dispatch/') || pathname === '/operations/dispatch')
    return 'Điều Phối Đội Xe & Ghép Tải Trọng';
  if (pathname.startsWith('/trips/') && pathname.endsWith('/tracking'))
    return 'Giám Sát Lệch Tuyến GPS & Cảnh Báo An Toàn';
  if (pathname.startsWith('/trips/') && pathname.endsWith('/carbon'))
    return 'Kiểm Toán Phát Thải Carbon Chuẩn GLEC v3';
  if (pathname === '/operations/tracking') return 'Giám Sát Hành Trình Đội Xe Thời Gian Thực';
  if (pathname === '/operations/carbon') return 'Kiểm Toán Phát Thải Khí Nhà Kính Đội Xe';
  if (pathname === '/analytics/benchmark') return 'Đối Sánh Hiệu Suất Hành Lang Xanh';
  if (pathname === '/admin/users')
    return 'Quản Lý Tài Khoản, Nhân Sự & Phân Quyền Hệ Thống (Admin IAM)';
  if (pathname === '/admin/data') return 'Kiểm Kê Dữ Liệu & Tình Trạng Service';
  if (pathname === '/admin/drivers')
    return 'Danh Sách Nhân Viên Lái Xe & Kiểm Duyệt Pháp Lý GPLX';
  if (pathname === '/admin/controllers')
    return 'Danh Sách Nhân Viên Kiểm Soát An Toàn HSE & Kiểm Toán ESG';
  if (pathname === '/admin/staff')
    return 'Quản Lý Nhân Viên Theo Từng Vai Trò & Chi Nhánh (CRUD)';
  if (pathname === '/admin/branches')
    return 'Quản Lý Chi Nhánh & Mạng Lưới Vận Hành Toàn Quốc (CRUD)';
  if (pathname === '/admin/applications')
    return 'Xác Nhận Đơn Xin Việc & Onboarding Nhân Sự Mới';
  if (pathname === '/admin/companies')
    return 'Quản Lý Công Ty, Pháp Lý B2B & Đối Tác Vận Tải';
  if (pathname === '/governance') return 'An toàn & Sự cố';
  return 'Hệ Thống Điều Hành Logistics Xanh CCADRO';
}

export default function ConsoleLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);
  const { pathname } = useLocation();
  const headerTitle = getConsolePageTitle(pathname);

  useEffect(() => {
    const resize = () => {
      if (window.innerWidth <= 768) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      {!sidebarCollapsed && (
        <button
          className="mobile-sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <main className="main-content">
        <Header
          title={headerTitle}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />
        <div key={pathname} className="halvi-route-stage">
          {children}
        </div>
      </main>
    </div>
  );
}

