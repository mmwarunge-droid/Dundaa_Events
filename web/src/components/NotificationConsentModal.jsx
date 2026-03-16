import React from "react";

/*
NotificationConsentModal
------------------------
Modal asking the user whether Dundaa can send notifications and event alerts.

Props:
- isOpen: boolean
- onSelect: function(boolean)

Behavior:
- Returns null when closed
- YES passes true
- NO passes false
- Uses high z-index so clicks are not blocked by page content underneath
*/

export default function NotificationConsentModal({ isOpen, onSelect }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.72)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 20
      }}
    >
      <div
        className="card"
        style={{
          width: "min(92vw, 560px)",
          padding: 28,
          borderRadius: 24,
          position: "relative",
          zIndex: 10000,
          pointerEvents: "auto"
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: 12,
            lineHeight: 1.2
          }}
        >
          Do you consent to Dundaa sending you notifications and event alerts?
        </h3>

        <p
          style={{
            color: "var(--muted)",
            marginBottom: 22
          }}
        >
          You can change this preference later from your profile settings.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            onClick={() => onSelect(true)}
          >
            YES
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onSelect(false)}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}