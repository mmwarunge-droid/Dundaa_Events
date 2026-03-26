import React, { useState } from "react";

import api from "../api/client";

export default function CampaignShareButton({ campaign }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (!campaign?.share_url) return;

    try {
      setLoading(true);

      await api.post(`/campaigns/${campaign.id}/share/click`, {
        source: "copy_link",
        referrer: "campaign_ui"
      });

      await navigator.clipboard.writeText(campaign.share_url);
      setCopied(true);

      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Failed to share campaign:", err);

      try {
        await navigator.clipboard.writeText(campaign.share_url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch (clipboardErr) {
        console.error("Clipboard copy failed:", clipboardErr);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-secondary"
      type="button"
      onClick={handleCopy}
      disabled={!campaign?.share_url || loading}
    >
      {copied ? "Copied!" : loading ? "Sharing..." : "Copy Link"}
    </button>
  );
}