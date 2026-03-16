import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
ProtectedRoute
--------------
This version waits for auth bootstrap to finish before deciding whether
to redirect or render protected content.

Without this, the UI can briefly mis-handle routes while the profile request
is still in flight.
*/

export default function ProtectedRoute({ children }) {
  const { token, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="container" style={{ padding: "32px 0" }}>
        Loading...
      </div>
    );
  }

  return token ? children : <Navigate to="/login" replace />;
}