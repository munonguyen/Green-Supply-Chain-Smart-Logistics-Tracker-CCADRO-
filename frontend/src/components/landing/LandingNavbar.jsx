import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
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
            <span className="logo-badge">C</span>
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
            <button
              type="button"
              className="lp-btn lp-btn--primary lp-btn--sm"
              onClick={() => navigate(user ? '/portal' : '/login')}
            >
              <Lock size={15} />
              <span className="lp-nav__cta-label">{user ? 'Cổng nội bộ' : 'Đăng nhập'}</span>
            </button>
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
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
