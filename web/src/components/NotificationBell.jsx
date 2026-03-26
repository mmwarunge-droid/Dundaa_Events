import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../context/NotificationsContext";

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    connected,
    markRead,
    markAllRead
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleClickItem = async (item) => {
    if (!item.is_read) {
      await markRead(item.id);
    }

    setOpen(false);

    if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        style={{
          position: "relative",
          minWidth: 52,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 22,
              height: 22,
              borderRadius: 999,
              background: "var(--primary)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
              padding: "0 6px",
              boxShadow: "0 8px 16px rgba(255,107,0,0.22)"
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 12px)",
            width: 380,
            maxWidth: "92vw",
            padding: 16,
            zIndex: 2000,
            borderRadius: 20
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 12
            }}
          >
            <div>
              <strong style={{ fontSize: 16 }}>Notifications</strong>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                {connected ? "Live updates connected" : "Offline"}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={markAllRead}
            >
              Read all
            </button>
          </div>

          {notifications.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 16,
                background: "#fffaf5",
                borderColor: "rgba(255,107,0,0.12)",
                boxShadow: "none"
              }}
            >
              <p style={{ color: "var(--muted)", margin: 0 }}>
                No notifications yet.
              </p>
            </div>
          ) : (
            <div className="grid" style={{ gap: 10, maxHeight: 440, overflowY: "auto" }}>
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClickItem(item)}
                  style={{
                    textAlign: "left",
                    border: "1px solid rgba(17,17,17,0.08)",
                    background: item.is_read ? "#fff" : "#fff8f2",
                    borderRadius: 16,
                    padding: 14,
                    cursor: "pointer",
                    color: "inherit"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "start"
                    }}
                  >
                    <strong>{item.title}</strong>
                    {!item.is_read && (
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "var(--primary)",
                          flexShrink: 0,
                          marginTop: 6
                        }}
                      />
                    )}
                  </div>

                  <div style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
                    {item.message}
                  </div>

                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>
                    {formatTime(item.created_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}