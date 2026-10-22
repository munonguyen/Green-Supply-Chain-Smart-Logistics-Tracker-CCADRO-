import { useParams, Link } from 'react-router-dom';
import { Truck, UserCheck, ShieldCheck, Activity } from 'lucide-react';

export default function DispatchPage() {
  const { shipmentId: _shipmentId } = useParams();
  const demoTripId = 'f0000000-0000-0000-0000-000000000001';

  return (
    <div className="page-body">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>Dispatch Execution & Asset Assignment</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Assigning qualified vehicle and driver to verified green route version
        </p>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Assigned Fleet Assets</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Truck size={20} color="var(--accent-blue)" />
                <b>Vehicle V001</b>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Plate: 51C-888.99<br/>
                Engine: Diesel Euro 5<br/>
                Payload Capacity: 20.0 tons
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <UserCheck size={20} color="var(--accent-green)" />
                <b>Driver D001</b>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Name: Nguyen Van Tai<br/>
                Phone: 0901234567<br/>
                Status: Qualified & Available
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--accent-green-dim)', borderRadius: '8px', border: '1px solid var(--border-highlight)', marginBottom: '24px' }}>
            <ShieldCheck size={20} color="var(--accent-green)" />
            <span style={{ fontSize: '0.88rem' }}>
              Green Route Version 1 locked. Ready for GPS tracking stream.
            </span>
          </div>

          <Link to={`/trips/${demoTripId}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            <Activity size={16} />
            <span>Launch Live Trip Tracking Console (UC09)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
