import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotFoundPage from '../shared/components/NotFoundPage';

/** Presentation guard only. Every API must enforce authentication independently. */
export default function RequireRole({ allowedRoles, external = false, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return external
      ? <Navigate to="/login" replace state={{ from: location.pathname }} />
      : <NotFoundPage />;
  }
  if (!allowedRoles.includes(user.role)) return <NotFoundPage />;
  return children;
}
