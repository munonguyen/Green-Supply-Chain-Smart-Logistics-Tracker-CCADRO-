import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Building2,
  Home,
  LayoutDashboard,
  Package,
  Route,
  Navigation,
  Leaf,
  BarChart3,
  PlusCircle,
  ShieldCheck,
  Lock,
  LogOut,
  Radio,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CcadroLogo from '../ui/CcadroLogo';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const demoShipmentId = 'c0000000-0000-0000-0000-000000000001';
  const demoTripId = 'f0000000-0000-0000-0000-000000000001';

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <motion.div
          whileHover={{ rotate: 6, scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <CcadroLogo size={38} />
        </motion.div>
        <div className="logo-text">
          <h1>CCADRO</h1>
          <span>Giám Sát Nội Bộ</span>
        </div>
      </div>

      {/* Active Role & Security Zone Card */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-interactive"
          style={{
            margin: '12px 10px 4px 10px',
            padding: '12px',
            borderRadius: '12px',
            border: `1px solid ${user.border || 'rgba(16, 185, 129, 0.35)'}`
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px'
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: user.color || '#34d399',
                background: user.bgDim || 'rgba(16, 185, 129, 0.15)',
                padding: '2px 7px',
                borderRadius: '4px'
              }}
            >
              {user.role}
            </span>
            <code style={{ fontSize: '0.7rem', color: '#94a3b8' }}>@{user.username}</code>
          </div>

          <div
            style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}
          >
            {user.fullName}
          </div>

          <div
            style={{
              fontSize: '0.68rem',
              color: user.zone === 'INTERNAL_CORE' ? '#38bdf8' : '#f472b6',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span
              className="radar-dot"
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: user.zone === 'INTERNAL_CORE' ? '#38bdf8' : '#f472b6'
              }}
            ></span>
            <span>
              {user.zone === 'INTERNAL_CORE' ? 'Mạng Nội Bộ Vận Hành' : 'Cổng Đối Tác B2B Extranet'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {/* SECTION 1: OPERATIONS */}
        <div className="sidebar-section-title">Vận Hành & Hạm Đội</div>

        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <Home size={17} />
          <span>Trang Chủ Website</span>
        </NavLink>

        <NavLink
          to="/portal"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <LayoutDashboard size={17} />
          <span>Trung Tâm Giám Sát</span>
        </NavLink>

        <NavLink
          to="/shipments"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <Package size={17} />
          <span>Quản Lý Vận Đơn</span>
        </NavLink>

        <NavLink
          to="/shipments/new"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={17} />
          <span>Tạo Đơn Hàng Mới</span>
        </NavLink>

        <NavLink
          to={`/dispatch/${demoShipmentId}`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Navigation size={17} />
          <span>Điều Phối & Xuất Bến</span>
        </NavLink>

        <NavLink
          to={`/trips/${demoTripId}`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <Radio size={17} />
          <span>Giám Sát GPS & Lệch Tuyến</span>
        </NavLink>

        {/* SECTION 2: GREEN INTELLIGENCE */}
        <div className="sidebar-section-title">Lộ Trình & Xanh Hóa (ESG)</div>

        <NavLink
          to={`/planning/${demoShipmentId}`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Route size={17} />
          <span>Đa Mục Tiêu Pareto (UC05)</span>
        </NavLink>

        <NavLink
          to={`/trips/${demoTripId}/carbon`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Leaf size={17} />
          <span>Kiểm Toán GLEC v3 (UC12)</span>
        </NavLink>

        <NavLink
          to="/analytics/benchmark"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={17} />
          <span>Định Mức Hành Lang (UC13)</span>
        </NavLink>

        {/* SECTION 3: GOVERNANCE & SECURITY */}
        <div className="sidebar-section-title">An Toàn & Quản Trị</div>

        <NavLink
          to="/governance"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ShieldCheck size={17} />
          <span>An Toàn & 6-Role RBAC</span>
        </NavLink>

        <NavLink
          to="/customer"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Building2 size={17} />
          <span>Cổng Khách Hàng B2B</span>
        </NavLink>

        <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Lock size={17} />
          <span>Cổng Xác Thực IAM</span>
        </NavLink>
      </nav>

      {/* Sidebar Footer with Logout */}
      <div
        style={{
          padding: '14px 12px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <UserCheck size={14} />
          <span>Đổi vai trò</span>
        </button>

        <button
          type="button"
          onClick={handleLogoutClick}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <LogOut size={13} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
