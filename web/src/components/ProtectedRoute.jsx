import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
ProtectedRoute
--------------
Wait for auth bootstrap to finish, then allow access only when a valid
authenticated user exists.

If the user is not authenticated, redirect to login and preserve the
attempted destination.
*/

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="container" style={{ padding: "32px 0" }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}