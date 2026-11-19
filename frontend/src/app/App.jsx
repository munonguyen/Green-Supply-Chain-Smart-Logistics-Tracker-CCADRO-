import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import ConsoleLayout from '../shared/layout/ConsoleLayout';
import NotFoundPage from '../shared/components/NotFoundPage';
import RequireRole from './RequireRole';
import LandingPage from '../systems/public/features/marketing/LandingPage';
import NetZeroPage from '../systems/public/features/marketing/NetZeroPage';
import SolutionsPage from '../systems/public/features/marketing/SolutionsPage';
import CarbonStatsPage from '../systems/public/features/marketing/CarbonStatsPage';
import NewsPage from '../systems/public/features/marketing/NewsPage';
import LoginPage from '../systems/public/features/auth/LoginPage';
import RegisterPage from '../systems/public/features/auth/RegisterPage';
import CareersApplyPage from '../systems/public/features/careers/CareersApplyPage';
import CustomerPortalPage from '../systems/customer/features/portal/CustomerPortalPage';
import ShipperPortalPage from '../systems/hub/features/portal/ShipperPortalPage';
import DriverTerminalPage from '../systems/driver/features/terminal/DriverTerminalPage';
import DashboardPage from '../systems/admin/features/dashboard/DashboardPage';
import ShipmentsPage from '../systems/operations/features/shipments/ShipmentsPage';
import NewShipmentPage from '../systems/operations/features/shipments/NewShipmentPage';
import PlanningPage from '../systems/operations/features/planning/PlanningPage';
import DispatchPage from '../systems/operations/features/dispatch/DispatchPage';
import ContainerManagementPage from '../systems/operations/features/containers/ContainerManagementPage';
import TripTrackingPage from '../systems/operations/features/tracking/TripTrackingPage';
import TripCarbonPage from '../systems/operations/features/carbon/TripCarbonPage';
import BenchmarkPage from '../systems/operations/features/carbon/BenchmarkPage';
import GovernanceAndSafetyPage from '../systems/admin/features/governance/GovernanceAndSafetyPage';
import OperationSelectionPage from '../systems/operations/shared/OperationSelectionPage';

const INTERNAL_CONSOLE_ROLES = ['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR'];

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
            <Route path="/careers" element={<CareersApplyPage />} />

            {/* 3. Dedicated External User / B2B Customer Portal */}
            <Route
              path="/customer"
              element={
                <RequireRole external allowedRoles={['CUSTOMER']}>
                  <CustomerPortalPage />
                </RequireRole>
              }
            />
            <Route path="/user-portal" element={<Navigate to="/customer" replace />} />

            {/* 3a. Dedicated Hub Operations & Last-Mile Shipper Portal (Role & Hub Isolated) */}
            <Route
              path="/shipper"
              element={
                <RequireRole external allowedRoles={['HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR', 'SHIPPER']}>
                  <ShipperPortalPage />
                </RequireRole>
              }
            />

            {/* 3b. Dedicated Internal Driver Terminal / Cabin HUD */}
            <Route
              path="/driver"
              element={
                <RequireRole allowedRoles={['DRIVER']}>
                  <DriverTerminalPage />
                </RequireRole>
              }
            />

            {/* 4. Internal Monitoring & Operations System */}
            {['dispatch','planning','tracking','carbon'].map((mode) => <Route key={mode} path={`/operations/${mode}`} element={
              <RequireRole allowedRoles={mode === 'tracking' ? ['ADMIN','DISPATCHER','SAFETY_MANAGER','ESG_AUDITOR'] : mode === 'carbon' ? ['ADMIN','DISPATCHER','ESG_AUDITOR'] : ['ADMIN','DISPATCHER']}>
                <ConsoleLayout><OperationSelectionPage mode={mode} /></ConsoleLayout>
              </RequireRole>
            } />)}
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
                <RequireRole allowedRoles={['ADMIN','DISPATCHER','ESG_AUDITOR']}>
                  <ConsoleLayout>
                    <ShipmentsPage />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/containers"
              element={
                <RequireRole allowedRoles={['ADMIN', 'DISPATCHER']}>
                  <ConsoleLayout><ContainerManagementPage /></ConsoleLayout>
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
                    <GovernanceAndSafetyPage defaultTab="PRETRIP" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="USERS" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/admin/drivers"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="DRIVERS" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/admin/controllers"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="CONTROLLERS" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="STAFF" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/admin/branches"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="BRANCHES" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/admin/applications"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="APPLICATIONS" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ConsoleLayout>
                    <GovernanceAndSafetyPage defaultTab="RBAC" defaultRbacSubTab="COMPANIES" />
                  </ConsoleLayout>
                </RequireRole>
              }
            />
            <Route path="/users" element={<Navigate to="/admin/users" replace />} />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
