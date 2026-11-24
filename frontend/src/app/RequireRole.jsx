import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleIsolation404Page from '../shared/components/feedback/RoleIsolation404Page';
import CcadroLogo from '../shared/components/ui/CcadroLogo';

/**
 * Universal RBAC Guard across all CCADRO Role Systems:
 * 1. If verifying a background token/session -> render a clean branded loading state to avoid black flash.
 * 2. If unauthenticated (!user) -> ALWAYS redirect to /login with state: { from: location.pathname }
 *    so user can authenticate smoothly without hitting a dark 404 dead-end.
 * 3. If authenticated but role mismatch -> render RoleIsolation404Page with explicit 404 security warning
 *    and clear buttons to switch account (logout/relogin) or return to their own portal.
 * 4. If authorized -> render protected children.
 */
export default function RequireRole({ allowedRoles = [], children }) {
  const { user, sessionChecking } = useAuth();
  const location = useLocation();

  if (sessionChecking) {
    return (
      <div
        data-testid="session-checking-loading"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 45%, #0d1322 0%, #070a13 100%)',
          color: '#f8fafc',
          gap: 16
        }}
      >
        <CcadroLogo size={48} />
        <div style={{ fontSize: '0.92rem', color: '#94a3b8', fontWeight: 600 }}>
          Đang xác thực phiên làm việc...
        </div>
      </div>
    );
  }

  // Not logged in -> ALWAYS redirect to /login for all role systems
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Role mismatch -> show explicit 404 Role Isolation Security warning
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <RoleIsolation404Page allowedRoles={allowedRoles} />;
  }

  return children;
}
