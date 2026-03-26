import React, { useState } from "react";

import api from "../api/client";

export default function VoteModal({
  isOpen,
  onClose,
  contestant,
  wallet,
  onSuccess
}) {
  const [coins, setCoins] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !contestant) return null;

  const selectedCoins = Number(coins || 0);
  const insufficient = selectedCoins > Number(wallet?.coin_balance || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.post("/vote", {
        contestant_id: contestant.id,
        coins: selectedCoins
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Vote failed:", err);
      setError(err?.response?.data?.detail || "Failed to cast vote.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.66)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 520, padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginBottom: 16
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Vote for {contestant.display_name}</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              1 Coin = 1 Vote
            </p>
          </div>

          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error && (
          <p style={{ color: "tomato" }}>{error}</p>
        )}

        <form className="grid" onSubmit={handleSubmit}>
          <input
            className="input"
            type="number"
            min="1"
            max={wallet?.coin_balance || 1}
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
          />

          <div className="card" style={{ padding: 16 }}>
            <p><strong>Current balance:</strong> {wallet?.coin_balance || 0} coins</p>
            <p style={{ marginBottom: 0 }}>
              <strong>Selected votes:</strong> {selectedCoins || 0}
            </p>
          </div>

          {insufficient && (
            <p style={{ color: "tomato" }}>
              You do not have enough coins for this vote.
            </p>
          )}

          <button
            className="btn"
            type="submit"
            disabled={submitting || insufficient || selectedCoins <= 0}
          >
            {submitting ? "Voting..." : "Confirm Vote"}
          </button>
        </form>
      </div>
    </div>
  );
}