import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Route,
  Navigation,
  Activity,
  Leaf,
  BarChart3,
  PlusCircle
} from 'lucide-react';

export default function Sidebar() {
  const demoShipmentId = 'c0000000-0000-0000-0000-000000000001';
  const demoTripId = 'f0000000-0000-0000-0000-000000000001';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">C</div>
        <div className="logo-text">
          <h1>CCADRO</h1>
          <span>Green Supply Chain</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={18} />
          <span>System Overview</span>
        </NavLink>

        <NavLink to="/shipments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <Package size={18} />
          <span>Shipment Fleet</span>
        </NavLink>

        <NavLink to="/shipments/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <PlusCircle size={18} />
          <span>New Shipment</span>
        </NavLink>

        <NavLink to={`/planning/${demoShipmentId}`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Route size={18} />
          <span>Green Routing (UC05)</span>
        </NavLink>

        <NavLink to={`/dispatch/${demoShipmentId}`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Navigation size={18} />
          <span>Dispatch & Assign</span>
        </NavLink>

        <NavLink to={`/trips/${demoTripId}`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <Activity size={18} />
          <span>GPS Tracking (UC09)</span>
        </NavLink>

        <NavLink to={`/trips/${demoTripId}/carbon`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Leaf size={18} />
          <span>Carbon Audit (UC12)</span>
        </NavLink>

        <NavLink to="/analytics/benchmark" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} />
          <span>Corridor Benchmarks</span>
        </NavLink>
      </nav>
    </aside>
  );
}
