import React, { useId } from 'react';
import { motion } from 'motion/react';
import { HALVI_SPRING } from './motionTokens';

/**
 * Shared spring-animated segmented pill tab bar (Halvi segmented switcher).
 * Supports both semantic `role="tab"` (`aria-selected`) and plain `role="button"` (`aria-pressed`).
 */
export default function SlidingPillTabs({
  tabs,
  activeId,
  onChange,
  layoutId,
  ariaLabel,
  itemRole = 'tab',
  className = '',
  style
}) {
  const autoId = useId();
  const groupLayoutId = layoutId || `pill-tabs-${autoId}`;
  const isTabRole = itemRole === 'tab';

  return (
    <div
      role={isTabRole ? 'tablist' : 'group'}
      aria-label={ariaLabel}
      className={`halvi-seg-group ${className}`.trim()}
      style={style}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role={isTabRole ? 'tab' : undefined}
            aria-selected={isTabRole ? isActive : undefined}
            aria-pressed={!isTabRole ? isActive : undefined}
            onClick={() => onChange(tab.id)}
            className={`halvi-seg-btn${isActive ? ' is-active' : ''}`}
          >
            {isActive && (
              <motion.span
                layoutId={groupLayoutId}
                className="halvi-seg-pill"
                transition={HALVI_SPRING}
              />
            )}
            {Icon && <Icon size={14} style={{ marginRight: 5, verticalAlign: '-2px' }} />}
            <span>{tab.label}</span>
            {tab.badge != null && (
              <span
                style={{
                  marginLeft: 6,
                  padding: '1px 6px',
                  borderRadius: 999,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  background: isActive ? 'rgba(6, 40, 28, 0.16)' : 'rgba(148, 163, 184, 0.18)',
                  color: 'inherit'
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
