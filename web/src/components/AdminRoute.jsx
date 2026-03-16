import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/*
AdminRoute
----------
Simple role gate for admin-only pages.

Only users with role:
- admin
- super_admin
can access wrapped routes.
*/

export default function AdminRoute({ children }) {
  const { user, authLoading, token } = useAuth();

  if (authLoading) {
    return (
      <div className="container" style={{ padding: "32px 0" }}>
        Loading...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin" && user?.role !== "super_admin") {
    return <Navigate to="/events" replace />;
  }

  return children;
}