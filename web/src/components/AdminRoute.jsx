import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ADMIN_ROLES = new Set([
  "admin",
  "super_admin",
  "admin_kyc",
  "admin_analytics",
  "admin_operations"
]);

export default function AdminRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="container" style={{ padding: "32px 0" }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!ADMIN_ROLES.has(user.role)) {
    return <Navigate to="/events" replace />;
  }

  return children;
}