import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getDefaultPortalPath } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import LandingPage from '../pages/LandingPage';
import NetZeroPage from '../pages/NetZeroPage';
import SolutionsPage from '../pages/SolutionsPage';
import CarbonStatsPage from '../pages/CarbonStatsPage';
import NewsPage from '../pages/NewsPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import CustomerPortalPage from '../pages/CustomerPortalPage';
import ShipperPortalPage from '../pages/ShipperPortalPage';
import DriverTerminalPage from '../pages/DriverTerminalPage';
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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="app-container">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <main className="main-content">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />
        {children}
      </main>
    </div>
  );
}

const INTERNAL_CONSOLE_ROLES = ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'];

function RequireRole({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultPortalPath(user)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Public Corporate Pages (Separated by Menu) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/dinh-huong" element={<NetZeroPage />} />
            <Route path="/giai-phap" element={<SolutionsPage />} />
            <Route path="/thong-ke-carbon" element={<CarbonStatsPage />} />
            <Route path="/tin-tuc" element={<NewsPage />} />

            {/* 2. Enterprise Authentication & Partner Registration */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 3. Dedicated External User / B2B Customer Portal */}
            <Route
              path="/customer"
              element={
                <RequireRole allowedRoles={['CUSTOMER', 'ADMIN']}>
                  <CustomerPortalPage />
                </RequireRole>
              }
            />
            <Route path="/user-portal" element={<Navigate to="/customer" replace />} />

            {/* 3a. Dedicated Third-Party Destination Shipper / 3PL Handover Portal */}
            <Route
              path="/shipper"
              element={
                <RequireRole allowedRoles={['SHIPPER', 'ADMIN']}>
                  <ShipperPortalPage />
                </RequireRole>
              }
            />

            {/* 3b. Dedicated Internal Driver Terminal / Cabin HUD */}
            <Route
              path="/driver"
              element={
                <RequireRole allowedRoles={['DRIVER', 'ADMIN']}>
                  <DriverTerminalPage />
                </RequireRole>
              }
            />

            {/* 4. Internal Monitoring & Operations System */}
            <Route
              path="/portal"
              element={
                <RequireRole allowedRoles={INTERNAL_CONSOLE_ROLES}>
                  <ConsoleLayout>
                    <DashboardPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route path="/dashboard" element={<Navigate to="/portal" replace />} />

            <Route
              path="/shipments"
              element={
                <RequireRole allowedRoles={INTERNAL_CONSOLE_ROLES}>
                  <ConsoleLayout>
                    <ShipmentsPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/shipments/new"
              element={
                <RequireRole allowedRoles={['ADMIN', 'DISPATCHER']}>
                  <ConsoleLayout>
                    <NewShipmentPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/planning/:shipmentId"
              element={
                <RequireRole allowedRoles={['ADMIN', 'DISPATCHER']}>
                  <ConsoleLayout>
                    <PlanningPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/dispatch/:shipmentId"
              element={
                <RequireRole allowedRoles={['ADMIN', 'DISPATCHER']}>
                  <ConsoleLayout>
                    <DispatchPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/trips/:tripId"
              element={
                <RequireRole allowedRoles={INTERNAL_CONSOLE_ROLES}>
                  <ConsoleLayout>
                    <TripTrackingPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/trips/:tripId/tracking"
              element={
                <RequireRole allowedRoles={INTERNAL_CONSOLE_ROLES}>
                  <ConsoleLayout>
                    <TripTrackingPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/trips/:tripId/carbon"
              element={
                <RequireRole allowedRoles={['ADMIN', 'DISPATCHER', 'ESG_AUDITOR']}>
                  <ConsoleLayout>
                    <TripCarbonPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/analytics/benchmark"
              element={
                <RequireRole allowedRoles={['ADMIN', 'DISPATCHER', 'ESG_AUDITOR']}>
                  <ConsoleLayout>
                    <BenchmarkPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/governance"
              element={
                <RequireRole allowedRoles={['ADMIN', 'SAFETY_MANAGER']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage />
                  </ConsoleLayout>
                </RequireRole>
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
