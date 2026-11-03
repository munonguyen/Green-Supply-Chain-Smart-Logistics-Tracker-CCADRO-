import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BarChart3, TrendingDown, Target } from 'lucide-react';

export default function BenchmarkPage() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCarbonBenchmarks()
      .then((data) => {
        setBenchmarks(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-body">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
          UC13: Freight Corridor Carbon Benchmarking
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Comparative analytics against regional corridor averages and best-in-class green fleets
        </p>
      </div>

      <div className="grid-3">
        <div className="card stat-card">
          <div>
            <div className="stat-label">HCMC - Binh Duong Corridor</div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
              0.0820
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Average kgCO₂e / tonne-km
            </span>
          </div>
          <BarChart3 size={36} color="var(--accent-blue)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Best-In-Class Benchmark</div>
            <div className="stat-value" style={{ color: 'var(--accent-green-light)' }}>
              0.0680
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Green optimized fleet target
            </span>
          </div>
          <Target size={36} color="var(--accent-green)" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Potential Carbon Savings</div>
            <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
              -17.1%
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              via CCADRO Green Routing
            </span>
          </div>
          <TrendingDown size={36} color="var(--accent-amber)" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
          Corridor Benchmarks in Database
        </h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Benchmark Corridor</th>
                <th>Origin Zone</th>
                <th>Destination Zone</th>
                <th>Corridor Average</th>
                <th>Best in Class</th>
                <th>Reporting Period</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Loading benchmarks...
                  </td>
                </tr>
              ) : benchmarks.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    No benchmarks loaded. Run <code>make seed</code>.
                  </td>
                </tr>
              ) : (
                benchmarks.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.benchmarkName}</b>
                    </td>
                    <td>{b.originZone}</td>
                    <td>{b.destinationZone}</td>
                    <td>{b.averageCo2ePerTonneKm} kgCO₂e/t-km</td>
                    <td>
                      <b style={{ color: 'var(--accent-green-light)' }}>
                        {b.bestInClassCo2ePerTonneKm} kgCO₂e/t-km
                      </b>
                    </td>
                    <td>{b.periodMonth}</td>
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
