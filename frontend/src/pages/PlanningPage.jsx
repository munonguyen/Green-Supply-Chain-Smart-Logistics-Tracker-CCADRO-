import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import MapView from '../components/map/MapView';
import RoutePolyline from '../components/map/RoutePolyline';
import OriginMarker from '../components/map/OriginMarker';
import DestinationMarker from '../components/map/DestinationMarker';
import { Leaf, Clock, Gauge, Award, CheckCircle, Navigation } from 'lucide-react';

export default function PlanningPage() {
  const { shipmentId } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shipmentId) return;

    api
      .calculateRoutes(shipmentId)
      .then((routes) => {
        setCandidates(routes);
        setLoading(false);
      })
      .catch(() => {
        // Fallback default mock coordinates if shipmentId is placeholder demo
        const fallbackRoutes = [
          {
            candidateName: 'Eco-Green Recommended Corridor (Optimal CO₂)',
            providerName: 'MOCK',
            distanceMeters: 28500,
            durationSeconds: 2700,
            estimatedFuelLiters: 9.12,
            estimatedCo2Kg: 23.95,
            compositeScore: 0.925,
            waypoints: [
              { latitude: 10.762622, longitude: 106.795677 },
              { latitude: 10.82, longitude: 106.76 },
              { latitude: 10.88, longitude: 106.72 },
              { latitude: 10.931215, longitude: 106.697426 }
            ]
          },
          {
            candidateName: 'Fastest Highway Route',
            providerName: 'MOCK',
            distanceMeters: 31200,
            durationSeconds: 2400,
            estimatedFuelLiters: 11.2,
            estimatedCo2Kg: 29.4,
            compositeScore: 0.812,
            waypoints: [
              { latitude: 10.762622, longitude: 106.795677 },
              { latitude: 10.84, longitude: 106.78 },
              { latitude: 10.931215, longitude: 106.697426 }
            ]
          }
        ];
        setCandidates(fallbackRoutes);
        setLoading(false);
      });
  }, [shipmentId]);

  const activeCandidate = candidates[selectedIdx] || candidates[0];
  const polylineCoords = activeCandidate?.waypoints?.map((wp) => [wp.latitude, wp.longitude]) || [
    [10.762622, 106.795677],
    [10.931215, 106.697426]
  ];

  return (
    <div className="page-body">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            UC05: Multi-Criteria Route Optimization
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Balancing Carbon Emissions (kgCO₂e), Distance, and Estimated Travel Time
          </p>
        </div>
        <Link to={`/dispatch/${shipmentId}`} className="btn btn-primary">
          <Navigation size={16} /> Proceed to Dispatch
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div>
          <div className="card" style={{ padding: '12px' }}>
            <MapView center={[10.84, 106.74]} zoom={11}>
              <OriginMarker position={[10.762622, 106.795677]} title="Cat Lai Port" />
              <DestinationMarker position={[10.931215, 106.697426]} title="VSIP 1 Binh Duong" />
              <RoutePolyline positions={polylineCoords} color="#10b981" weight={6} />
            </MapView>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Generated Route Candidates</h3>

          {loading ? (
            <div className="card">Calculating optimal routes...</div>
          ) : (
            candidates.map((cand, idx) => (
              <div
                key={idx}
                className="card"
                onClick={() => setSelectedIdx(idx)}
                style={{
                  cursor: 'pointer',
                  border:
                    selectedIdx === idx
                      ? '2px solid var(--accent-green)'
                      : '1px solid var(--border-color)',
                  background: selectedIdx === idx ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}
                >
                  <b style={{ fontSize: '0.92rem' }}>{cand.candidateName}</b>
                  {selectedIdx === idx && <CheckCircle size={18} color="var(--accent-green)" />}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginTop: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Gauge size={14} color="var(--accent-blue)" />
                    <span>{(cand.distanceMeters / 1000).toFixed(1)} km</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} color="var(--accent-amber)" />
                    <span>{Math.round(cand.durationSeconds / 60)} mins</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Leaf size={14} color="var(--accent-green)" />
                    <b style={{ color: 'var(--accent-green-light)' }}>
                      {cand.estimatedCo2Kg} kg CO₂
                    </b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} color="var(--accent-amber)" />
                    <span>Score: {cand.compositeScore}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
