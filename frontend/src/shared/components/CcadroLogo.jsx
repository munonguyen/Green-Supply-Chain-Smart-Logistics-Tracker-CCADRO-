import React, { useId } from 'react';

/**
 * Bespoke CCADRO Corporate Emblem & Brand Mark.
 * Combines:
 *  - Hexagonal logistics shield (resilience & ISO governance)
 *  - S-curve multimodal freight corridor with origin/destination telemetry nodes
 *  - Emerald Net-Zero leaf crown at the apex
 */
export default function CcadroLogo({
  size = 40,
  showText = false,
  title = 'CCADRO',
  subtitle = 'GREEN SUPPLY CHAIN',
  className = ''
}) {
  const uid = useId().replace(/:/g, '');
  const shieldGrad = `ccadro-shield-${uid}`;
  const leafGrad = `ccadro-leaf-${uid}`;
  const routeGrad = `ccadro-route-${uid}`;
  const glowId = `ccadro-glow-${uid}`;

  return (
    <span
      className={`ccadro-logo ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showText ? 11 : 0,
        verticalAlign: 'middle'
      }}
    >
      <span
        className="ccadro-logo__emblem"
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderRadius: Math.round(size * 0.28),
          background:
            'linear-gradient(145deg, rgba(6, 78, 59, 0.96) 0%, rgba(4, 47, 46, 0.98) 55%, rgba(15, 23, 42, 0.98) 100%)',
          boxShadow:
            '0 8px 22px -4px rgba(16, 185, 129, 0.42), inset 0 1px 1px rgba(255, 255, 255, 0.22), inset 0 0 0 1px rgba(52, 211, 153, 0.32)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <svg
          width={Math.round(size * 0.82)}
          height={Math.round(size * 0.82)}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={shieldGrad}
              x1="6"
              y1="4"
              x2="42"
              y2="44"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient
              id={leafGrad}
              x1="22"
              y1="6"
              x2="38"
              y2="24"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient
              id={routeGrad}
              x1="12"
              y1="34"
              x2="36"
              y2="14"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer hexagonal precision frame */}
          <path
            d="M24 3.5L41.5 13.5V34.5L24 44.5L6.5 34.5V13.5L24 3.5Z"
            stroke={`url(#${shieldGrad})`}
            strokeWidth="2.2"
            strokeLinejoin="round"
            fill="rgba(16, 185, 129, 0.08)"
          />

          {/* Subtle inner radar / globe meridian */}
          <circle
            cx="24"
            cy="24"
            r="13.5"
            stroke="rgba(110, 231, 183, 0.22)"
            strokeWidth="1"
            strokeDasharray="2.5 2.5"
          />

          {/* Bold C-shaped outer eco-arc */}
          <path
            d="M31.5 13.2C29.3 11.7 26.7 10.8 23.8 10.8C16.3 10.8 10.3 16.7 10.3 24C10.3 31.3 16.3 37.2 23.8 37.2C27.2 37.2 30.3 35.9 32.7 33.8"
            stroke={`url(#${shieldGrad})`}
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Net-Zero Leaf integrated at top-right */}
          <path
            d="M25.5 18.5C25.5 12.2 31.2 8.5 37.8 9.2C38.2 15.6 34.2 21.2 27.8 21.2C26.7 21.2 25.5 20.1 25.5 18.5Z"
            fill={`url(#${leafGrad})`}
          />
          <path d="M26.5 20.2L34.6 12.2" stroke="#042f2e" strokeWidth="1.5" strokeLinecap="round" />

          {/* Smart Logistics Route Vector (S-curve connecting port origin to destination) */}
          <path
            d="M14.5 32.5C18.5 32.5 19.2 24.5 24.2 24.5C29.2 24.5 29.8 16.8 34.8 16.8"
            stroke={`url(#${routeGrad})`}
            strokeWidth="2.6"
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />

          {/* Origin Port Node */}
          <circle cx="14.5" cy="32.5" r="3" fill="#38bdf8" stroke="#042f2e" strokeWidth="1.3" />
          {/* Midpoint Telemetry Node */}
          <circle cx="24.2" cy="24.5" r="2.3" fill="#34d399" stroke="#042f2e" strokeWidth="1.1" />
          {/* Destination Hub Node */}
          <circle cx="34.8" cy="16.8" r="2.8" fill="#fef08a" stroke="#042f2e" strokeWidth="1.3" />
        </svg>
      </span>

      {showText && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: '1.12rem',
              letterSpacing: '-0.02em',
              color: 'inherit'
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#10b981',
                whiteSpace: 'nowrap'
              }}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
