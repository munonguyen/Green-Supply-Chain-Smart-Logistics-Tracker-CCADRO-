import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LogIn, Menu, Moon, Sun, UserPlus, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth, getAccessibleWorkspaces } from '../../../context/AuthContext';
import CcadroLogo from '../../../shared/components/CcadroLogo';
import UserAccountMenu from '../../../shared/components/UserAccountMenu';
import { NAV_LINKS } from './landingContent';
import { useScrolled } from './useLandingScroll';

export default function LandingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const { user } = useAuth();
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === '/';
  const solid = !isHome || scrolled || menuOpen;
  const workspaces = getAccessibleWorkspaces(user);

  return (
    <>
      <header className={`lp-nav ${solid ? 'lp-nav--solid' : 'lp-nav--transparent'}`}>
        <div className="lp-container lp-nav__inner">
          <button
            type="button"
            className="lp-brand"
            onClick={() => {
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Về trang chủ"
          >
            <CcadroLogo size={40} />
            <span>
              <span className="lp-brand__name" style={{ display: 'block' }}>
                CCADRO
              </span>
              <span className="lp-brand__tag">Green Supply Chain</span>
            </span>
          </button>

          <nav className="lp-nav__links" aria-label="Điều hướng chính">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.id}
                to={link.path}
                end={link.path === '/'}
                className={({ isActive }) => `lp-nav__link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="lp-nav__actions">
            <button
              type="button"
              className="lp-icon-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {user ? (
              <UserAccountMenu variant="navbar" onDarkSurface={!solid} />
            ) : (
              <>
                <button
                  type="button"
                  className="lp-btn lp-btn--nav-register lp-btn--sm"
                  onClick={() => navigate('/register')}
                  style={{
                    padding: '9px 14px',
                    fontSize: '0.82rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <UserPlus size={14} />
                  <span>Đăng ký</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-nav-login"
                  className="lp-btn lp-btn--primary lp-btn--sm"
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '9px 16px',
                    fontSize: '0.82rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <LogIn size={14} />
                  <span className="lp-nav__cta-label">Đăng nhập</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="lp-icon-btn lp-nav__burger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Mở menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="lp-drawer"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            aria-label="Menu di động"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.id}
                to={link.path}
                end={link.path === '/'}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              workspaces.map((ws) => (
                <NavLink key={ws.id} to={ws.path} onClick={() => setMenuOpen(false)}>
                  {ws.name} ({ws.badge})
                </NavLink>
              ))
            ) : (
              <>
                <NavLink to="/login" onClick={() => setMenuOpen(false)}>
                  Đăng Nhập Hệ Thống
                </NavLink>
                <NavLink to="/register" onClick={() => setMenuOpen(false)}>
                  Đăng Ký Tài Khoản Khách Hàng
                </NavLink>
              </>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
