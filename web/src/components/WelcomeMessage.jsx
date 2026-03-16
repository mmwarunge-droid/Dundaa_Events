import React, { useEffect } from "react";

/*
WelcomeMessage
--------------
Temporary 3-second welcome banner shown after:
- signup
- login
- reactivation

The component auto-closes via the onDone callback.
*/

export default function WelcomeMessage({ message, onDone, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      onDone?.();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        maxWidth: 560,
        width: "calc(100% - 32px)",
        background: "rgba(20,20,20,0.96)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        textAlign: "center"
      }}
    >
      <strong>{message}</strong>
    </div>
  );
}