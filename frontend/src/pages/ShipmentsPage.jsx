import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Plus, Route, Navigation } from 'lucide-react';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getShipments()
      .then(data => {
        setShipments(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Logistics Freight Shipments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage consignments, green routing, and corridor assignments</p>
        </div>
        <Link to="/shipments/new" className="btn btn-primary">
          <Plus size={16} />
          <span>New Shipment</span>
        </Link>
      </div>

      <div className="card table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Payload</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Loading shipments...</td></tr>
            ) : shipments.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>No shipments found. Run <code>make seed</code> or create a new shipment.</td></tr>
            ) : (
              shipments.map(s => (
                <tr key={s.id}>
                  <td><b>{s.shipmentCode}</b></td>
                  <td>{s.customerId}</td>
                  <td>{s.originName}</td>
                  <td>{s.destinationName}</td>
                  <td>{s.cargoWeightTons} tons</td>
                  <td><span className="badge badge-green">{s.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/planning/${s.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        <Route size={14} /> Plan
                      </Link>
                      <Link to={`/dispatch/${s.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        <Navigation size={14} /> Dispatch
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
