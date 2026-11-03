import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ShipmentsPage from '../pages/ShipmentsPage';
import NewShipmentPage from '../pages/NewShipmentPage';
import PlanningPage from '../pages/PlanningPage';
import DispatchPage from '../pages/DispatchPage';
import TripTrackingPage from '../pages/TripTrackingPage';
import TripCarbonPage from '../pages/TripCarbonPage';
import BenchmarkPage from '../pages/BenchmarkPage';
import GovernanceAndSafetyPage from '../pages/GovernanceAndSafetyPage';

function ConsoleLayout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header />
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Public Corporate Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. Enterprise Authentication */}
            <Route path="/login" element={<LoginPage />} />

            {/* 3. Internal Operations Console */}
            <Route
              path="/portal"
              element={
                <ConsoleLayout>
                  <DashboardPage />
                </ConsoleLayout>
              }
            />
            <Route path="/dashboard" element={<Navigate to="/portal" replace />} />

            <Route
              path="/shipments"
              element={
                <ConsoleLayout>
                  <ShipmentsPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/shipments/new"
              element={
                <ConsoleLayout>
                  <NewShipmentPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/planning/:shipmentId"
              element={
                <ConsoleLayout>
                  <PlanningPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/dispatch/:shipmentId"
              element={
                <ConsoleLayout>
                  <DispatchPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/trips/:tripId"
              element={
                <ConsoleLayout>
                  <TripTrackingPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/trips/:tripId/tracking"
              element={
                <ConsoleLayout>
                  <TripTrackingPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/trips/:tripId/carbon"
              element={
                <ConsoleLayout>
                  <TripCarbonPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/analytics/benchmark"
              element={
                <ConsoleLayout>
                  <BenchmarkPage />
                </ConsoleLayout>
              }
            />
            <Route
              path="/governance"
              element={
                <ConsoleLayout>
                  <GovernanceAndSafetyPage />
                </ConsoleLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
