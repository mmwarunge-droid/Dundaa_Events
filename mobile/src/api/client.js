import axios from "axios";

// Shared API client for mobile requests.
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000",
});

export default api;
mobile/src/context/AuthContext.js
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Token and user state for the mobile app.
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ token, setToken, user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
