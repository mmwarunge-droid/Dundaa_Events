import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  // Prevent unauthenticated users from accessing protected pages.
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
