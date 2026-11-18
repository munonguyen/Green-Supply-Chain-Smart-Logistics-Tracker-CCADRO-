import React from 'react';
import CcadroLogo from './CcadroLogo';
import CountingNumber from './CountingNumber';
import ElasticSearchBar from './ElasticSearchBar';
import GrabDriverAvatar from './GrabDriverAvatar';
import Reveal from './Reveal';
import ShimmeringText from './ShimmeringText';
import SidebarAccountCard from './SidebarAccountCard';
import UserAccountMenu from './UserAccountMenu';
import AccountSettingsModal from './AccountSettingsModal';

/**
 * Representative shared UI module:
 * - Exports reusable layout/form/KPI/modal/banner primitives for all domain systems.
 * - Re-exports common shared UI components so features have one canonical import entry.
 */

export const sharedInputStyle = {
  padding: '8px 10px',
  borderRadius: 9,
  border: '1px solid var(--border-color, #cbd5e1)',
  background: 'var(--bg-card, #ffffff)',
  color: 'var(--text-main, #0f172a)',
  fontSize: '0.84rem',
  width: '100%',
  boxSizing: 'border-box'
};

export const sharedLabelStyle = {
  display: 'grid',
  gap: 5,
  fontSize: '0.81rem',
  fontWeight: 600
};

export const sharedModalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 6, 23, 0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 1200
};

export function ModalDialog({ isOpen = true, onClose, title, subtitle, maxWidth = 540, children }) {
  if (!isOpen) return null;
  return (
    <div
      style={sharedModalBackdropStyle}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth,
          padding: 20,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {(title || subtitle) && (
          <div style={{ marginBottom: 12 }}>
            {title && <h4 style={{ margin: 0, fontWeight: 800 }}>{title}</h4>}
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function StatusBanner({ status, onDismiss, children }) {
  if (!status?.message) return null;
  const ok = Boolean(status.ok);
  return (
    <div
      role="status"
      style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: ok ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
        border: `1px solid ${ok ? '#10b981' : '#ef4444'}`,
        color: ok ? '#10b981' : '#ef4444',
        fontSize: '0.84rem',
        fontWeight: 600,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10
      }}
    >
      <div>
        <div>{status.message}</div>
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontWeight: 800,
            lineHeight: 1
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function KpiStatCard({ label, value, color, subtitle }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4, color }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

export function StatusBadge({ badgeClass = 'badge-blue', label }) {
  return <span className={`badge ${badgeClass}`}>{label}</span>;
}

export function FormField({ label, style, children }) {
  return (
    <label style={{ ...sharedLabelStyle, ...style }}>
      {label}
      {children}
    </label>
  );
}

export {
  CcadroLogo,
  CountingNumber,
  ElasticSearchBar,
  GrabDriverAvatar,
  Reveal,
  ShimmeringText,
  SidebarAccountCard,
  UserAccountMenu,
  AccountSettingsModal
};
