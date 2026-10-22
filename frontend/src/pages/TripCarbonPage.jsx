import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Leaf, Award, FileText, CheckCircle, ArrowLeft } from 'lucide-react';

export default function TripCarbonPage() {
  const { tripId } = useParams();
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEmissionFactors()
      .then(data => {
        setFactors(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-body">
      <Link to={`/trips/${tripId}`} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} /> Back to Live Tracking
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>UC12: Carbon Emission Accounting (GLEC v3)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Post-trip emission verification and tonne-km calculation standard</p>
        </div>
        <div className="badge badge-green" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
          <CheckCircle size={16} /> ISO 14083 / GLEC Standard
        </div>
      </div>

      <div className="grid-3">
        <div className="card stat-card">
          <div>
            <div className="stat-label">Total Verified Emissions</div>
            <div className="stat-value" style={{ color: 'var(--accent-green-light)' }}>23.95 kg</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CO₂ equivalent (Well-to-Wheel)</span>
          </div>
          <Leaf size={36} color="var(--accent-green)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Freight Work Intensity</div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>427.5</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tonne-Kilometers (15t × 28.5km)</span>
          </div>
          <Award size={36} color="var(--accent-blue)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">GLEC Emission Factor</div>
            <div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--accent-amber)' }}>
              0.080000
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kgCO₂e / tonne-km (Euro 5 Diesel)</span>
          </div>
          <FileText size={36} color="var(--accent-amber)" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
          Active Emission Factors in Database (Seed EF001)
        </h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Factor Code</th>
                <th>Fuel Type</th>
                <th>Standard</th>
                <th>Empty Factor (kg/km)</th>
                <th>Full Factor (kg/km)</th>
                <th>Default Tonne-Km</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Loading factors...</td></tr>
              ) : factors.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No factors in database. Run <code>make seed</code>.</td></tr>
              ) : (
                factors.map(f => (
                  <tr key={f.id}>
                    <td><b>{f.factorCode}</b></td>
                    <td>{f.fuelType}</td>
                    <td>{f.euroStandard}</td>
                    <td>{f.emptyFactorKgPerKm}</td>
                    <td>{f.fullFactorKgPerKm}</td>
                    <td><b style={{ color: 'var(--accent-green-light)' }}>{f.defaultTonneKmFactor}</b></td>
                    <td>{f.sourceReference}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
