import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Save, ArrowLeft } from 'lucide-react';

export default function NewShipmentPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    shipmentCode: `SH${Math.floor(100 + Math.random() * 900)}`,
    customerId: 'CUST-GREEN-LOG',
    originName: 'Cang Cat Lai, District 2, HCMC',
    originAddress: 'Nguyen Thi Dinh, District 2, Ho Chi Minh City',
    originLongitude: 106.795677,
    originLatitude: 10.762622,
    destinationName: 'VSIP 1 Industrial Park, Binh Duong',
    destinationAddress: 'Dai lo Huu Nghi, Thuan An, Binh Duong',
    destinationLongitude: 106.697426,
    destinationLatitude: 10.931215,
    cargoWeightTons: 16.5,
    cargoVolumeM3: 35.0
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createShipment(formData);
      navigate(`/planning/${created.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate('/shipments')} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back to Shipments
        </button>

        <div className="card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px' }}>Register New Freight Consignment</h2>

          {error && <div className="badge badge-red" style={{ marginBottom: '16px' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Shipment Code</label>
                <input
                  type="text"
                  value={formData.shipmentCode}
                  onChange={e => setFormData({ ...formData, shipmentCode: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Customer ID</label>
                <input
                  type="text"
                  value={formData.customerId}
                  onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Origin Name & Coordinates</label>
              <input
                type="text"
                value={formData.originName}
                onChange={e => setFormData({ ...formData, originName: e.target.value })}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', marginBottom: '8px' }}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input type="number" step="any" placeholder="Origin Longitude" value={formData.originLongitude} onChange={e => setFormData({ ...formData, originLongitude: parseFloat(e.target.value) })} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} required />
                <input type="number" step="any" placeholder="Origin Latitude" value={formData.originLatitude} onChange={e => setFormData({ ...formData, originLatitude: parseFloat(e.target.value) })} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} required />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Destination Name & Coordinates</label>
              <input
                type="text"
                value={formData.destinationName}
                onChange={e => setFormData({ ...formData, destinationName: e.target.value })}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', marginBottom: '8px' }}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input type="number" step="any" placeholder="Dest Longitude" value={formData.destinationLongitude} onChange={e => setFormData({ ...formData, destinationLongitude: parseFloat(e.target.value) })} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} required />
                <input type="number" step="any" placeholder="Dest Latitude" value={formData.destinationLatitude} onChange={e => setFormData({ ...formData, destinationLatitude: parseFloat(e.target.value) })} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Cargo Weight (Tons)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cargoWeightTons}
                  onChange={e => setFormData({ ...formData, cargoWeightTons: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Cargo Volume (m³)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cargoVolumeM3}
                  onChange={e => setFormData({ ...formData, cargoVolumeM3: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '12px', justifyContent: 'center' }}>
              <Save size={16} />
              <span>{submitting ? 'Creating Shipment...' : 'Save & Proceed to Route Planning'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
