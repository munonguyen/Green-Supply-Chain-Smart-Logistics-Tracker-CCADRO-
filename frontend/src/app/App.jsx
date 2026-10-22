import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import DashboardPage from '../pages/DashboardPage';
import ShipmentsPage from '../pages/ShipmentsPage';
import NewShipmentPage from '../pages/NewShipmentPage';
import PlanningPage from '../pages/PlanningPage';
import DispatchPage from '../pages/DispatchPage';
import TripTrackingPage from '../pages/TripTrackingPage';
import TripCarbonPage from '../pages/TripCarbonPage';
import BenchmarkPage from '../pages/BenchmarkPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Header />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/shipments/new" element={<NewShipmentPage />} />
            <Route path="/planning/:shipmentId" element={<PlanningPage />} />
            <Route path="/dispatch/:shipmentId" element={<DispatchPage />} />
            <Route path="/trips/:tripId" element={<TripTrackingPage />} />
            <Route path="/trips/:tripId/carbon" element={<TripCarbonPage />} />
            <Route path="/analytics/benchmark" element={<BenchmarkPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
