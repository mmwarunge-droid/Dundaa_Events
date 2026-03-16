import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

/*
AuthContext
-----------
Centralized auth + session bootstrap state.

Features:
- auth bootstrap state
- login/logout token persistence
- profile refresh helper
- welcome message support
- notification consent persistence

Important behavior:
- protected routes should wait until bootstrap completes
- logout clears token immediately
- notification consent updates user state so the modal closes immediately
*/

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("dundaa_token"));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  const logout = () => {
    localStorage.removeItem("dundaa_token");
    setToken(null);
    setUser(null);
    setWelcomeMessage("");
    setAuthLoading(false);
  };

  const refreshProfile = async () => {
    const res = await api.get("/profile");
    setUser(res.data);
    return res.data;
  };

  const login = (newToken, message = "") => {
    localStorage.setItem("dundaa_token", newToken);
    setToken(newToken);
    setWelcomeMessage(message || "");
  };

  const clearWelcomeMessage = () => {
    setWelcomeMessage("");
  };

  const submitNotificationConsent = async (value) => {
    try {
      const res = await api.put("/profile/notification-consent", {
        notification_consent: value
      });

      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to save notification consent:", err);
      throw err;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setAuthLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setAuthLoading(true);
        }

        localStorage.setItem("dundaa_token", token);

        const res = await api.get("/profile");

        if (!cancelled) {
          setUser(res.data);
        }
      } catch (err) {
        console.error("Auth bootstrap failed:", err);

        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setUser,
        authLoading,
        login,
        logout,
        refreshProfile,
        welcomeMessage,
        clearWelcomeMessage,
        submitNotificationConsent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}