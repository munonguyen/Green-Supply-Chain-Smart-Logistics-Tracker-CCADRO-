import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import MapView from '../components/map/MapView';
import RoutePolyline from '../components/map/RoutePolyline';
import VehicleMarker from '../components/map/VehicleMarker';
import OriginMarker from '../components/map/OriginMarker';
import DestinationMarker from '../components/map/DestinationMarker';
import DeviationMarker from '../components/map/DeviationMarker';
import { Activity, AlertTriangle, Leaf, RefreshCw } from 'lucide-react';

export default function TripTrackingPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const [simulationMode, setSimulationMode] = useState('normal'); // 'normal' | 'deviation'

  const focusLat = parseFloat(searchParams.get('focusLat'));
  const focusLon = parseFloat(searchParams.get('focusLon'));
  const incidentBannerTitle = searchParams.get('incident');
  const hasEmergencyFocus = !Number.isNaN(focusLat) && !Number.isNaN(focusLon);

  useEffect(() => {
    if (hasEmergencyFocus) {
      setSimulationMode('deviation');
    }
  }, [hasEmergencyFocus, focusLat, focusLon]);

  // Route baseline coordinates (Cat Lai Port -> VSIP 1 Binh Duong)
  const plannedRoute = [
    [10.762622, 106.795677],
    [10.82, 106.76],
    [10.88, 106.72],
    [10.931215, 106.697426]
  ];

  // Vehicle positions based on mode
  const normalPosition = [10.85, 106.74];
  const deviationPosition = hasEmergencyFocus ? [focusLat, focusLon] : [10.8525, 106.743]; // 300m off-route

  const currentVehiclePos = simulationMode === 'deviation' ? deviationPosition : normalPosition;

  return (
    <div className="page-body">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            UC09: Live GPS Tracking & Deviation Alerting
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time telemetry stream, buffer analysis, and reroute trigger
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSimulationMode(simulationMode === 'normal' ? 'deviation' : 'normal')}
            className={`btn ${simulationMode === 'deviation' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} /> Toggle Simulator: {simulationMode.toUpperCase()}
          </button>

          <Link to={`/trips/${tripId}/carbon`} className="btn btn-secondary">
            <Leaf size={14} color="var(--accent-green)" /> View Carbon Accounting
          </Link>
        </div>
      </div>

      {simulationMode === 'deviation' && (
        <div
          className="card"
          style={{
            border: '1px solid var(--accent-red)',
            background: 'rgba(239, 68, 68, 0.12)',
            marginBottom: '20px',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fca5a5' }}>
            <AlertTriangle size={24} color="var(--accent-red)" />
            <div>
              <b style={{ fontSize: '1rem', color: 'white' }}>
                {incidentBannerTitle || 'RED DEVIATION DETECTED: 300m Off Planned Route'}
              </b>
              <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                Vehicle V001 exceeded 200m buffer limit ({deviationPosition[0].toFixed(4)},{' '}
                {deviationPosition[1].toFixed(4)}). Dynamic reroute calculation recommended (UC10).
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        <div className="card" style={{ padding: '12px' }}>
          <MapView
            center={[10.85, 106.74]}
            zoom={12}
            focusPosition={hasEmergencyFocus ? [focusLat, focusLon] : null}
            focusZoom={15}
          >
            <OriginMarker position={[10.762622, 106.795677]} title="Cat Lai Port" />
            <DestinationMarker position={[10.931215, 106.697426]} title="VSIP 1 Binh Duong" />
            <RoutePolyline positions={plannedRoute} color="#10b981" weight={5} />
            <VehicleMarker
              position={currentVehiclePos}
              title="Truck V001 (51C-888.99)"
              heading={335}
            />
            {simulationMode === 'deviation' && (
              <DeviationMarker position={deviationPosition} distanceMeters={300} severity="RED" />
            )}
          </MapView>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 600,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Activity size={18} color="var(--accent-blue)" /> Telemetry Metrics
            </h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Speed</span>
                <b>54.2 km/h</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Heading</span>
                <b>335° NW</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Route Distance</span>
                <b>{simulationMode === 'deviation' ? '300m (ALERT)' : '12m (ON_ROUTE)'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trip Progress</span>
                <b>48% Completed</b>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '12px' }}>
              GPS Buffer Limits
            </h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '6px'
                }}
              >
                <span style={{ color: 'var(--accent-amber)' }}>Yellow Warning</span>
                <b>&gt; 50 meters</b>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '6px'
                }}
              >
                <span style={{ color: 'var(--accent-red)' }}>Red Critical Alert</span>
                <b>&gt; 200 meters</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
