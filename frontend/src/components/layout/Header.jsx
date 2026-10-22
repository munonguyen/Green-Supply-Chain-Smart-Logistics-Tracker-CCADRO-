import React from 'react';
import { ShieldCheck, Cpu } from 'lucide-react';

export default function Header({ title = 'CCADRO Operations Console' }) {
  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="badge badge-green">
          <ShieldCheck size={14} />
          <span>Modulith Core: Healthy</span>
        </div>
        <div className="badge badge-blue">
          <Cpu size={14} />
          <span>PostGIS Spatial Active</span>
        </div>
      </div>
    </header>
  );
}
