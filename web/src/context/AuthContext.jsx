import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("dundaa_token"));
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
    if (!localStorage.getItem("dundaa_token")) return null;

    const res = await api.get("/profile");
    setUser(res.data);
    return res.data;
  };

  const login = async (newToken, message = "") => {
    localStorage.setItem("dundaa_token", newToken);
    setToken(newToken);
    setWelcomeMessage(message || "");
    setAuthLoading(true);

    try {
      const res = await api.get("/profile", {
        headers: {
          Authorization: `Bearer ${newToken}`
        }
      });

      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Login profile preload failed:", err);
      localStorage.removeItem("dundaa_token");
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const clearWelcomeMessage = () => {
    setWelcomeMessage("");
  };

  const submitNotificationConsent = async (value) => {
    const res = await api.put("/profile/notification-consent", {
      notification_consent: value
    });

    setUser(res.data);
    return res.data;
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("dundaa:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("dundaa:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem("dundaa_token");

      if (!storedToken) {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setAuthLoading(false);
        }
        return;
      }

      if (user && token === storedToken) {
        setAuthLoading(false);
        return;
      }

      try {
        setAuthLoading(true);
        setToken(storedToken);

        const res = await api.get("/profile", {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (!cancelled) {
          setUser(res.data);
        }
      } catch (err) {
        console.error("Auth bootstrap failed:", err);

        if (!cancelled) {
          localStorage.removeItem("dundaa_token");
          setToken(null);
          setUser(null);
          setWelcomeMessage("");
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
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      setUser,
      authLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshProfile,
      welcomeMessage,
      clearWelcomeMessage,
      submitNotificationConsent
    }),
    [token, user, authLoading, welcomeMessage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}