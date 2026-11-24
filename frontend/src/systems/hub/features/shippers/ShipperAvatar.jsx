import React from 'react';
import { BadgeCheck } from 'lucide-react';
import GrabDriverAvatar from '../../../../shared/components/account/GrabDriverAvatar';

export const SHIPPER_AVATAR_PRESETS = [
  {
    id: 'illustrated-cap',
    label: 'Mặc định CCADRO',
    url: ''
  },
  {
    id: 'cold-chain-pro',
    label: 'Chuỗi lạnh Xanh',
    url:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g1)"/><circle cx="60" cy="44" r="20" fill="#fde68a"/><path d="M26 112c3-24 17-34 34-34s31 10 34 34" fill="#0f172a"/><path d="M40 38c3-14 37-14 40 0-8-7-32-7-40 0z" fill="#1e293b"/><circle cx="53" cy="44" r="2.6" fill="#0f172a"/><circle cx="67" cy="44" r="2.6" fill="#0f172a"/><path d="M53 53q7 6 14 0" fill="none" stroke="#92400e" stroke-width="2.5" stroke-linecap="round"/><rect x="44" y="16" width="32" height="10" rx="5" fill="#e0f2fe"/><text x="60" y="23.5" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#0369a1">COLD</text></svg>`
      )
  },
  {
    id: 'express-emerald',
    label: 'Giao nhận Xanh',
    url:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g2)"/><circle cx="60" cy="46" r="20" fill="#fed7aa"/><path d="M24 114c4-25 18-35 36-35s32 10 36 35" fill="#064e3b"/><path d="M39 40c2-15 40-15 42 0l-2-10c-12-8-26-8-38 0z" fill="#047857"/><circle cx="53" cy="46" r="2.5" fill="#1e293b"/><circle cx="67" cy="46" r="2.5" fill="#1e293b"/><path d="M53 55q7 6 14 0" fill="none" stroke="#9a3412" stroke-width="2.5" stroke-linecap="round"/></svg>`
      )
  },
  {
    id: 'fleet-navy',
    label: 'Đội xe 3PL',
    url:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#312e81"/><stop offset="100%" stop-color="#4f46e5"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g3)"/><circle cx="60" cy="46" r="20" fill="#f5d0a9"/><path d="M25 114c4-24 18-34 35-34s31 10 35 34" fill="#1e1b4b"/><path d="M39 39c4-14 38-14 42 0-9-6-33-6-42 0z" fill="#111827"/><circle cx="53" cy="46" r="2.5" fill="#111827"/><circle cx="67" cy="46" r="2.5" fill="#111827"/><path d="M53 55q7 6 14 0" fill="none" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round"/></svg>`
      )
  }
];

export default function ShipperAvatar({
  shipper = {},
  size = 54,
  showBadge = true
}) {
  const status =
    shipper.shiftStatus === 'ON_DELIVERY'
      ? 'ON_TRIP'
      : shipper.shiftStatus || 'AVAILABLE';
  const verified = shipper.kycStatus === 'VERIFIED';
  const statusColor =
    status === 'ON_TRIP' ? '#0ea5e9' : status === 'AVAILABLE' ? '#10b981' : '#94a3b8';

  if (shipper.avatarUrl) {
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
        <img
          src={shipper.avatarUrl}
          alt={`Ảnh đại diện ${shipper.fullName || 'Shipper'}`}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            border: `2.5px solid ${statusColor}`,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.22)',
            background: '#0f172a'
          }}
        />
        {showBadge && verified && (
          <span
            title="Đã xác thực eKYC"
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: Math.max(16, Math.round(size * 0.34)),
              height: Math.max(16, Math.round(size * 0.34)),
              borderRadius: '50%',
              background: '#059669',
              color: '#fff',
              border: '2px solid #ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BadgeCheck size={Math.max(10, Math.round(size * 0.21))} />
          </span>
        )}
      </div>
    );
  }

  return (
    <GrabDriverAvatar
      name={shipper.fullName || 'Shipper CCADRO'}
      status={status}
      verified={showBadge && verified}
      size={size}
      hasHelmetOrCap
    />
  );
}

