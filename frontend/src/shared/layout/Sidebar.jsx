import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Building2,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  MapPin,
  Package,
  Route,
  Navigation,
  Leaf,
  BarChart3,
  PlusCircle,
  ShieldCheck,
  Lock,
  Radio,
  Truck,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CcadroLogo from '../components/CcadroLogo';
import SidebarAccountCard from '../components/SidebarAccountCard';

export default function Sidebar({ collapsed = false, onToggleCollapse }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div
        className="sidebar-header"
        style={{ justifyContent: collapsed ? 'center' : 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div
            whileHover={{ rotate: 6, scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <CcadroLogo size={38} />
          </motion.div>
          {!collapsed && (
            <div className="logo-text">
              <h1>CCADRO</h1>
              <span>Giám Sát Nội Bộ</span>
            </div>
          )}
        </div>
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Thu gọn thanh bên"
            style={{
              background: 'rgba(148, 163, 184, 0.1)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: 8,
              width: 30,
              height: 30,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Mở rộng thanh bên"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#10b981',
              borderRadius: 8,
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      )}

      {/* Navigation Groups (RBAC filtered cleanly by role) */}
      <nav
        className="sidebar-nav"
        onClick={(e) => {
          if (
            typeof window !== 'undefined' &&
            window.innerWidth <= 768 &&
            e.target?.closest?.('a.nav-link') &&
            onToggleCollapse &&
            !collapsed
          ) {
            onToggleCollapse();
          }
        }}
      >
        {/* SECTION 1: OPERATIONS */}
        <div className="sidebar-section-title">Vận Hành & Hạm Đội</div>

        <NavLink
          to="/"
          title="Trang Chủ Website"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <Home size={17} />
          <span>Trang Chủ Website</span>
        </NavLink>

        {['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'].includes(user?.role) && <NavLink
          to="/portal"
          title="Trung Tâm Giám Sát"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <LayoutDashboard size={17} />
          <span>Trung Tâm Giám Sát</span>
        </NavLink>}

        {['ADMIN', 'DISPATCHER', 'ESG_AUDITOR'].includes(user?.role) && <NavLink
          to="/shipments"
          title="Quản Lý Vận Đơn"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <Package size={17} />
          <span>Quản Lý Vận Đơn</span>
        </NavLink>}

        {['ADMIN', 'DISPATCHER'].includes(user?.role) && <NavLink
          to="/containers"
          title="Quản lý Container"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Truck size={17} />
          <span>Quản lý Container</span>
        </NavLink>}

        {['ADMIN', 'DISPATCHER'].includes(user?.role) && <NavLink
          to="/shipments/new"
          title="Tạo Đơn Hàng Mới"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={17} />
          <span>Tạo Đơn Hàng Mới</span>
        </NavLink>}

        {['ADMIN', 'DISPATCHER'].includes(user?.role) && <NavLink
          to="/operations/dispatch"
          title="Điều Phối & Xuất Bến"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Navigation size={17} />
          <span>Điều Phối & Xuất Bến</span>
        </NavLink>}

        {['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'].includes(user?.role) && <NavLink
          to="/operations/tracking"
          title="Giám Sát GPS & Lệch Tuyến"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <Radio size={17} />
          <span>Giám Sát GPS & Lệch Tuyến</span>
        </NavLink>}

        {user?.role === 'DRIVER' && (
          <NavLink
            to="/driver"
            title="Khoang Lái Tài Xế (Driver)"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Truck size={17} />
            <span>Khoang Lái Tài Xế (Driver)</span>
          </NavLink>
        )}

        {/* SECTION 2: GREEN INTELLIGENCE */}
        {['ADMIN', 'DISPATCHER', 'ESG_AUDITOR'].includes(user?.role) && <div className="sidebar-section-title">Lộ Trình & Xanh Hóa (ESG)</div>}

        {['ADMIN', 'DISPATCHER'].includes(user?.role) && <NavLink
          to="/operations/planning"
          title="Đa Mục Tiêu Pareto (UC05)"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Route size={17} />
          <span>Đa Mục Tiêu Pareto (UC05)</span>
        </NavLink>}

        {['ADMIN', 'DISPATCHER', 'ESG_AUDITOR'].includes(user?.role) && <NavLink
          to="/operations/carbon"
          title="Kiểm Toán GLEC v3 (UC12)"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Leaf size={17} />
          <span>Kiểm Toán GLEC v3 (UC12)</span>
        </NavLink>}

        {['ADMIN', 'DISPATCHER', 'ESG_AUDITOR'].includes(user?.role) && <NavLink
          to="/analytics/benchmark"
          title="Định Mức Hành Lang (UC13)"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={17} />
          <span>Định Mức Hành Lang (UC13)</span>
        </NavLink>}

        {/* SECTION 3: GOVERNANCE & SECURITY */}
        <div className="sidebar-section-title">Quản Trị Tổ Chức &amp; An Toàn</div>

        {user?.role === 'ADMIN' && (
          <>
            <NavLink
              to="/admin/users"
              title="Quản Lý Tài Khoản IAM (/admin/users)"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <UserCheck size={17} />
              <span>Tài Khoản &amp; IAM</span>
            </NavLink>

            <NavLink
              to="/admin/drivers"
              title="Danh Sách Nhân Viên Lái Xe & Kiểm Duyệt (/admin/drivers)"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Truck size={17} />
              <span>Nhân Viên Lái Xe</span>
            </NavLink>

            <NavLink
              to="/admin/controllers"
              title="Danh Sách Nhân Viên Kiểm Soát & Audit (/admin/controllers)"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <ClipboardCheck size={17} />
              <span>Nhân Viên Kiểm Soát</span>
            </NavLink>

            <NavLink
              to="/admin/staff"
              title="Quản Lý Nhân Viên Theo Từng Vai Trò (/admin/staff)"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Lock size={17} />
              <span>Nhân Viên Theo Vai Trò</span>
            </NavLink>

            <NavLink
              to="/admin/branches"
              title="Quản Lý Chi Nhánh & Văn Phòng (/admin/branches)"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <MapPin size={17} />
              <span>Chi Nhánh &amp; Hub</span>
            </NavLink>

            <NavLink
              to="/admin/applications"
              title="Đơn Xin Việc & Tuyển Dụng (/admin/applications)"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <ShieldCheck size={17} />
              <span>Đơn Xin Việc &amp; Tuyển Dụng</span>
            </NavLink>

            <NavLink
              to="/admin/companies"
              title="Quản Lý Công Ty & Đối Tác B2B (/admin/companies)"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Building2 size={17} />
              <span>Công Ty &amp; Đối Tác B2B</span>
            </NavLink>
          </>
        )}

        {['ADMIN', 'SAFETY_MANAGER'].includes(user?.role) && (
          <NavLink
            to="/governance"
            title="Quản Trị IAM & An Toàn Đội Xe (/governance)"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <ShieldCheck size={17} />
            <span>An toàn &amp; Sự cố</span>
          </NavLink>
        )}

        {user?.role === 'CUSTOMER' && (
          <NavLink
            to="/customer"
            title="Cổng Khách Hàng B2B"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Building2 size={17} />
            <span>Cổng Khách Hàng B2B</span>
          </NavLink>
        )}

        {['HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR', 'SHIPPER'].includes(user?.role) && (
          <NavLink
            to="/shipper"
            title="Cổng Shipper Đích (3PL)"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Package size={17} />
            <span>Cổng Shipper Đích (3PL)</span>
          </NavLink>
        )}

        <NavLink
          to="/login"
          title="Cổng Xác Thực IAM"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Lock size={17} />
          <span>Cổng Xác Thực IAM</span>
        </NavLink>
      </nav>

      {/* Sidebar Footer Account Info Card with Settings */}
      <SidebarAccountCard collapsed={collapsed} onAfterLogout={handleLogoutClick} />
    </aside>
  );
}
