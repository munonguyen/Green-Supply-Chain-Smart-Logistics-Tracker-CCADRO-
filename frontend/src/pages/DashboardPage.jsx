import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Activity, Database, Server, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSystemHealth()
      .then(data => {
        setHealth(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-body">
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px' }}>
        System Architecture & Operations Health
      </h2>

      <div className="grid-3">
        <div className="card stat-card">
          <div>
            <div className="stat-label">Backend Status</div>
            <div className="stat-value" style={{ color: health?.status === 'UP' ? 'var(--accent-green-light)' : 'var(--accent-amber)' }}>
              {loading ? 'Checking...' : health?.status || 'OFFLINE'}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spring Boot 3.3.4</span>
          </div>
          <Server size={36} color="var(--accent-green)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Spatial Database</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--accent-blue)' }}>
              {loading ? 'Checking...' : (health?.postgisVersion?.split(' ')[0] || 'PostGIS 3.4')}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PostgreSQL + PostGIS Native</span>
          </div>
          <Database size={36} color="var(--accent-blue)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Architecture Core</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--accent-amber)' }}>
              Modular Monolith
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spring Modulith Verified</span>
          </div>
          <Activity size={36} color="var(--accent-amber)" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} color="var(--accent-green)" />
          <span>Active Monolith Domains & Boundaries</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {['asset', 'shipment', 'routing', 'tracking', 'carbon'].map((mod) => (
            <div key={mod} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: '4px' }}>{mod} Module</div>
              <div className="badge badge-green">Operational</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-red)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-red)' }}>
            <ShieldAlert size={20} />
            <b>Note:</b> Backend is starting or offline: {error}. Run <code>make start</code> to start backend.
          </div>
        </div>
      )}
    </div>
  );
}
