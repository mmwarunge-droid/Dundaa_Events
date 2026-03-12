import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

/*
AuthContext
-----------
Stores:
- auth token
- authenticated user profile

Also exposes:
- refreshProfile() helper for pages that update user data, such as ProfilePage
*/

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("dundaa_token"));
  const [user, setUser] = useState(null);

  const logout = () => {
    setToken(null);
  };

  const refreshProfile = async () => {
    const res = await api.get("/profile");
    setUser(res.data);
    return res.data;
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem("dundaa_token", token);

      api.get("/profile")
        .then((res) => setUser(res.data))
        .catch(() => logout());
    } else {
      localStorage.removeItem("dundaa_token");
      setUser(null);
    }
  }, [token]);

  const login = (newToken) => setToken(newToken);

  return (
    <AuthContext.Provider
      value={{ token, user, setUser, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}