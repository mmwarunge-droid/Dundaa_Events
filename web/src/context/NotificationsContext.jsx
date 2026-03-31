import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import api from "../api/client";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);

function buildWsUrl(apiBaseUrl, token) {
  const httpUrl = apiBaseUrl || "http://127.0.0.1:8000";
  const wsBase = httpUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  return `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`;
}

export function NotificationsProvider({ children }) {
  const { token, user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);

  const loadNotifications = async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      await api.post("/notifications/bootstrap");

      const res = await api.get("/notifications");
      setNotifications(res.data.items || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const markRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [token, user?.id]);

  useEffect(() => {
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    const wsUrl = buildWsUrl(
      import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
      token
    );

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      socket.send("ping");
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = (err) => {
      console.error("Notification websocket error:", err);
      setConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.event === "notification.created" && payload.notification) {
          setNotifications((prev) => [payload.notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          return;
        }
      } catch (err) {
        console.error("Failed to parse websocket payload:", err);
      }
    };

    return () => {
      socket.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    connected,
    loadNotifications,
    markRead,
    markAllRead
  }), [notifications, unreadCount, connected]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }

  return context;
}