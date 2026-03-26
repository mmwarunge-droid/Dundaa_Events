import React, { useState } from "react";

import api from "../api/client";

export default function ShareButton({ event }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleCopy = async () => {
    if (!event?.share_url) return;

    try {
      setSharing(true);

      await api.post(`/events/${event.id}/share/click`, {
        source: "copy_link",
        referrer: "event_card"
      });

      await navigator.clipboard.writeText(event.share_url);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.error("Failed to copy/share event link:", err);

      try {
        await navigator.clipboard.writeText(event.share_url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch (clipboardErr) {
        console.error("Clipboard copy failed:", clipboardErr);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      className="btn btn-secondary"
      type="button"
      onClick={handleCopy}
      disabled={!event?.share_url || sharing}
    >
      {copied ? "Copied!" : sharing ? "Sharing..." : "Copy Link"}
    </button>
  );
}