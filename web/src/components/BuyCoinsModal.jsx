import React, { useState } from "react";

import api from "../api/client";

const PAYMENT_METHOD_OPTIONS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" }
];

export default function BuyCoinsModal({ isOpen, onClose, onSuccess }) {
  const [coins, setCoins] = useState("10");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const amountKes = Number(coins || 0) * 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post("/wallet/buy-coins", {
        coins: Number(coins),
        payment_method: paymentMethod
      });

      setResult(res.data);
      onSuccess?.();
    } catch (err) {
      console.error("Buy coins failed:", err);
      setError(err?.response?.data?.detail || "Failed to buy coins.");
    } finally {
      setSubmitting(false);
    }
  };

  const nextAction = result?.next_action;

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
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 24
        }}
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
            <h2 style={{ margin: 0 }}>Buy Dundaa Coins</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              1 Coin = KES 10
            </p>
          </div>

          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error && (
          <p style={{ color: "tomato" }}>{error}</p>
        )}

        {result ? (
          <div className="grid" style={{ gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <p><strong>Reference:</strong> {result.reference}</p>
              <p><strong>Coins:</strong> {result.coins}</p>
              <p style={{ marginBottom: 0 }}><strong>Total:</strong> KES {result.amount_kes}</p>
            </div>

            {nextAction?.type === "mpesa_prompt" && (
              <div className="card" style={{ padding: 16 }}>
                <strong>M-Pesa Prompt</strong>
                <p style={{ marginBottom: 0 }}>
                  A payment prompt should be sent to the user.
                </p>
              </div>
            )}

            {nextAction?.type === "card_checkout" && (
              <div className="card" style={{ padding: 16 }}>
                <strong>Card Payment</strong>
                <p style={{ marginBottom: 0 }}>
                  Redirect the user to card payment flow.
                </p>
              </div>
            )}

            {nextAction?.type === "bank_transfer" && (
              <div className="card" style={{ padding: 16 }}>
                <strong>Bank Transfer</strong>
                <p style={{ marginBottom: 0 }}>
                  Display Dundaa bank account details.
                </p>
              </div>
            )}
          </div>
        ) : (
          <form className="grid" onSubmit={handleSubmit}>
            <input
              className="input"
              type="number"
              min="1"
              max="100000"
              value={coins}
              onChange={(e) => setCoins(e.target.value)}
              placeholder="Coins to buy"
            />

            <div className="card" style={{ padding: 16 }}>
              <strong>Total: KES {amountKes || 0}</strong>
            </div>

            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Processing..." : "Buy Coins"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}