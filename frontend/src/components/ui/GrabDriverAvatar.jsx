import React from 'react';
import { BadgeCheck } from 'lucide-react';

const AVATAR_PALETTES = [
  { bg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', shirt: '#059669', hair: '#1e293b', skin: '#f1c29b', badgeColor: '#10b981' },
  { bg: 'linear-gradient(135deg, #0f172a 0%, #0284c7 100%)', shirt: '#0284c7', hair: '#0f172a', skin: '#eab892', badgeColor: '#38bdf8' },
  { bg: 'linear-gradient(135deg, #115e59 0%, #14b8a6 100%)', shirt: '#0d9488', hair: '#27272a', skin: '#f3caa6', badgeColor: '#10b981' },
  { bg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', shirt: '#1d4ed8', hair: '#18181b', skin: '#e5b288', badgeColor: '#60a5fa' },
  { bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', shirt: '#047857', hair: '#171717', skin: '#f0bfa0', badgeColor: '#34d399' }
];

function getPaletteForName(name = 'Tai Xe') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

export default function GrabDriverAvatar({
  name = 'Nguyễn Văn Tài',
  status = 'AVAILABLE',
  verified = true,
  size = 54,
  showStatusDot = true,
  hasHelmetOrCap = true
}) {
  const palette = getPaletteForName(name);
  const statusColor =
    status === 'ON_TRIP' || status === 'IN_TRANSIT'
      ? '#0ea5e9'
      : status === 'AVAILABLE'
        ? '#10b981'
        : '#94a3b8';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: palette.bg,
          border: `2.5px solid ${statusColor}`,
          boxShadow: `0 4px 14px rgba(16, 185, 129, 0.22)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Clean Grab-style Illustrated Driver Portrait */}
        <svg
          viewBox="0 0 80 80"
          width={size}
          height={size}
          aria-hidden="true"
          style={{ display: 'block' }}
        >
          {/* Uniform Shoulders & High-Visibility Collar */}
          <path
            d="M14 80 C16 58, 28 53, 40 53 C52 53, 64 58, 66 80 Z"
            fill={palette.shirt}
          />
          <path d="M31 53 L40 64 L49 53" fill="#ffffff" opacity="0.92" />
          <path d="M35 55 L40 62 L45 55" fill="#042f2e" opacity="0.8" />
          {/* Neck */}
          <rect x="34" y="42" width="12" height="14" rx="5" fill={palette.skin} />
          {/* Ears */}
          <circle cx="24.5" cy="34" r="3.6" fill={palette.skin} />
          <circle cx="55.5" cy="34" r="3.6" fill={palette.skin} />
          {/* Face */}
          <rect x="25" y="19" width="30" height="28" rx="14" fill={palette.skin} />
          {/* Hair / Driver Cap */}
          {hasHelmetOrCap ? (
            <>
              <path
                d="M23 27 C23 14, 32 10, 40 10 C48 10, 57 14, 57 27 Z"
                fill="#065f46"
              />
              <path d="M22 26 Q40 21 62 27 L57 29 Q40 25 22 28 Z" fill="#047857" />
              <circle cx="40" cy="18.5" r="3.2" fill="#10b981" />
            </>
          ) : (
            <path
              d="M24 28 C24 16, 33 13, 40 13 C48 13, 56 16, 56 28 C51 23, 30 23, 24 28 Z"
              fill={palette.hair}
            />
          )}
          {/* Eyes & Warm Smile */}
          <circle cx="33.5" cy="32.5" r="1.9" fill="#0f172a" />
          <circle cx="46.5" cy="32.5" r="1.9" fill="#0f172a" />
          <path
            d="M35 39 Q40 43 45 39"
            fill="none"
            stroke="#7c2d12"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Verified Shield Badge */}
      {verified && (
        <span
          title="Tài xế đã xác thực hồ sơ & GPLX Hạng FC"
          style={{
            position: 'absolute',
            bottom: -1,
            right: -2,
            width: Math.max(16, Math.round(size * 0.34)),
            height: Math.max(16, Math.round(size * 0.34)),
            borderRadius: '50%',
            background: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.22)'
          }}
        >
          <BadgeCheck size={Math.max(14, Math.round(size * 0.3))} color="#059669" fill="#d1fae5" />
        </span>
      )}

      {/* Top-Right Status Dot */}
      {showStatusDot && (
        <span
          title={
            status === 'ON_TRIP' || status === 'IN_TRANSIT'
              ? 'Đang lái chuyến'
              : status === 'AVAILABLE'
                ? 'Đang trực tuyến - Sẵn sàng'
                : 'Đang nghỉ ca'
          }
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: Math.max(10, Math.round(size * 0.21)),
            height: Math.max(10, Math.round(size * 0.21)),
            borderRadius: '50%',
            background: statusColor,
            border: '2px solid #ffffff',
            boxShadow: `0 0 6px ${statusColor}`
          }}
        />
      )}
    </div>
  );
}

