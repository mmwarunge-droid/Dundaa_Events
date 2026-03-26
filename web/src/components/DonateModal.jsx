import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const PAYMENT_METHOD_OPTIONS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" }
];

export default function DonateModal({ isOpen, onClose, campaign, onSuccess }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    donor_name: "",
    donor_email: "",
    donor_phone: "",
    amount: "",
    payment_method: "mpesa",
    contribution_type: "one_time",
    is_anonymous: false
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return (
      !!form.donor_name.trim() &&
      !!form.donor_email.trim() &&
      !!form.donor_phone.trim() &&
      Number(form.amount) > 0 &&
      !!form.payment_method &&
      !submitting
    );
  }, [form, submitting]);

  if (!isOpen || !campaign) return null;

  const nextAction = result?.next_action;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post(`/campaigns/${campaign.id}/donate`, {
        ...form,
        amount: Number(form.amount)
      });

      setResult(res.data);
      onSuccess?.();
    } catch (err) {
      console.error("Donation failed:", err);
      setError(err?.response?.data?.detail || "Donation failed.");
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
        background: "rgba(17,17,17,0.55)",
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
          maxWidth: 620,
          padding: 28,
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 24
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
            <h2 style={{ margin: 0 }}>Support this fundraiser</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              {campaign.title}
            </p>
          </div>

          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error && (
          <div
            className="card"
            style={{
              padding: 14,
              marginBottom: 16,
              background: "#fff4f4",
              borderColor: "rgba(214,69,69,0.18)",
              boxShadow: "none"
            }}
          >
            <strong style={{ color: "var(--danger)" }}>Donation issue</strong>
            <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{error}</p>
          </div>
        )}

        {result ? (
          <div className="grid" style={{ gap: 14 }}>
            <div
              className="card"
              style={{
                padding: 16,
                background: "var(--accent-soft)",
                borderColor: "rgba(0,194,168,0.14)",
                boxShadow: "none"
              }}
            >
              <h3 style={{ marginTop: 0 }}>Donation Recorded</h3>
              <p><strong>Reference:</strong> {result.reference}</p>
              <p><strong>Amount:</strong> KES {result.total_amount}</p>
              <p><strong>Status:</strong> {result.status}</p>
              <p style={{ marginBottom: 0 }}>
                <strong>Contribution:</strong> {result.contribution_type}
              </p>
            </div>

            {nextAction?.type === "mpesa_prompt" && (
              <div className="trust-card">
                <h3>M-Pesa Prompt</h3>
                <p>
                  A payment prompt should be sent to <strong>{nextAction.phone}</strong>.
                  Use reference <strong>{nextAction.reference}</strong>.
                </p>
              </div>
            )}

            {nextAction?.type === "card_checkout" && (
              <div className="trust-card">
                <h3>Card Payment</h3>
                <p>
                  Redirect this donation into your card-entry flow using reference{" "}
                  <strong>{nextAction.reference}</strong>.
                </p>
              </div>
            )}

            {nextAction?.type === "bank_transfer" && (
              <div className="trust-card">
                <h3>Bank Transfer</h3>
                <p><strong>Account Name:</strong> {nextAction.bank_details?.account_name}</p>
                <p><strong>Account Number:</strong> {nextAction.bank_details?.account_number}</p>
                <p><strong>Bank:</strong> {nextAction.bank_details?.bank_name}</p>
                <p><strong>Branch:</strong> {nextAction.bank_details?.branch}</p>
                <p style={{ marginBottom: 0 }}>
                  Use reference <strong>{nextAction.reference}</strong> when paying.
                </p>
              </div>
            )}

            {!user && (
              <div
                className="card"
                style={{
                  padding: 18,
                  background: "#fffaf5",
                  borderColor: "rgba(255,107,0,0.12)",
                  boxShadow: "none"
                }}
              >
                <strong style={{ color: "var(--primary)" }}>
                  Stay connected on Dundaa
                </strong>
                <p style={{ color: "var(--muted)" }}>
                  Chat with fellow users and know of upcoming events by creating an account in a few simple steps.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link className="btn" to="/signup" onClick={onClose}>
                    Create Account
                  </Link>
                  <Link className="btn btn-secondary" to="/" onClick={onClose}>
                    Continue Browsing
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              className="card"
              style={{
                padding: 16,
                marginBottom: 16,
                background: "#fffaf5",
                borderColor: "rgba(255,107,0,0.12)",
                boxShadow: "none"
              }}
            >
              <strong>Why this donation flow works</strong>
              <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                Clear amount entry, direct payment options, and trust-focused campaign details
                help supporters contribute with less hesitation.
              </p>
            </div>

            <form className="grid" style={{ gap: 14 }} onSubmit={handleSubmit}>
              <div className="card" style={{ padding: 18, boxShadow: "none" }}>
                <h3 style={{ marginTop: 0 }}>{campaign.title}</h3>
                <div style={{ color: "var(--muted)", marginBottom: 10 }}>
                  Goal: KES {campaign.goal_amount} • Raised: KES {campaign.current_amount}
                </div>
                <div className="price-emphasis">
                  Support this cause in a few quick steps
                </div>
              </div>

              <div className="grid grid-2">
                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Full name</label>
                  <input
                    className="input"
                    placeholder="Enter full name"
                    value={form.donor_name}
                    onChange={(e) => handleChange("donor_name", e.target.value)}
                    required
                  />
                </div>

                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Email address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="Enter email"
                    value={form.donor_email}
                    onChange={(e) => handleChange("donor_email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Phone number</label>
                  <input
                    className="input"
                    placeholder="Enter phone number"
                    value={form.donor_phone}
                    onChange={(e) => handleChange("donor_phone", e.target.value)}
                    required
                  />
                </div>

                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Donation amount</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Payment method</label>
                  <select
                    className="select"
                    value={form.payment_method}
                    onChange={(e) => handleChange("payment_method", e.target.value)}
                  >
                    {PAYMENT_METHOD_OPTIONS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Contribution type</label>
                  <select
                    className="select"
                    value={form.contribution_type}
                    onChange={(e) => handleChange("contribution_type", e.target.value)}
                  >
                    <option value="one_time">One-time</option>
                    {campaign.recurring_enabled && (
                      <option value="recurring">Recurring</option>
                    )}
                  </select>
                </div>
              </div>

              {campaign.allow_anonymous && (
                <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={form.is_anonymous}
                    onChange={(e) => handleChange("is_anonymous", e.target.checked)}
                  />
                  <span>Donate anonymously</span>
                </label>
              )}

              <button className="btn" type="submit" disabled={!canSubmit}>
                {submitting ? "Processing..." : "Donate"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}