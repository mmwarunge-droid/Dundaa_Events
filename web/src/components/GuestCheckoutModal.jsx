import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const PAYMENT_METHOD_OPTIONS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" }
];

export default function GuestCheckoutModal({
  isOpen,
  onClose,
  event,
  defaultQuantity = 1
}) {
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(defaultQuantity);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");

  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !event?.id) return;

    setQuantity(defaultQuantity);
    setBuyerName("");
    setBuyerEmail("");
    setBuyerPhone("");
    setPaymentMethod("mpesa");
    setResult(null);
    setError("");
  }, [isOpen, event?.id, defaultQuantity]);

  useEffect(() => {
    if (!isOpen || !event?.id) return;

    let cancelled = false;

    const fetchQuote = async () => {
      try {
        setLoadingQuote(true);
        setError("");

        const res = await api.post("/guest/checkout/quote", {
          event_id: event.id,
          quantity
        });

        if (!cancelled) {
          setQuote(res.data);
        }
      } catch (err) {
        console.error("Quote fetch failed:", err);
        if (!cancelled) {
          setError(
            err?.response?.data?.detail || "Failed to calculate checkout total."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingQuote(false);
        }
      }
    };

    fetchQuote();

    return () => {
      cancelled = true;
    };
  }, [isOpen, event?.id, quantity]);

  const canSubmit = useMemo(() => {
    return (
      !!buyerName.trim() &&
      !!buyerEmail.trim() &&
      !!buyerPhone.trim() &&
      quantity >= 1 &&
      !!paymentMethod &&
      !submitting
    );
  }, [buyerName, buyerEmail, buyerPhone, quantity, paymentMethod, submitting]);

  if (!isOpen || !event) return null;

  const nextAction = result?.next_action;

  const increment = () => setQuantity((prev) => Math.min(prev + 1, 20));
  const decrement = () => setQuantity((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post("/guest/checkout", {
        event_id: event.id,
        quantity,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
        buyer_phone: buyerPhone.trim(),
        payment_method: paymentMethod,
        referral_slug: event.share_slug || null
      });

      setResult(res.data);
    } catch (err) {
      console.error("Guest checkout failed:", err);
      setError(err?.response?.data?.detail || "Checkout failed.");
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
            <h2 style={{ margin: 0 }}>Fast Guest Checkout</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              Book quickly without creating an account first.
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
            <strong style={{ color: "var(--danger)" }}>Checkout issue</strong>
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
              <h3 style={{ marginTop: 0 }}>Checkout Created</h3>
              <p><strong>Reference:</strong> {result.reference}</p>
              <p><strong>Total:</strong> KES {result.total_amount}</p>
              <p style={{ marginBottom: 0 }}><strong>Status:</strong> {result.status}</p>
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
                  Redirect this order into your card-entry flow using reference{" "}
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
                  Continue the Dundaa experience
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
              <strong>Why this feels simple</strong>
              <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                Clear totals, quick quantity controls, and a direct payment path help
                users move from interest to checkout faster.
              </p>
            </div>

            <form className="grid" style={{ gap: 14 }} onSubmit={handleSubmit}>
              <div className="card" style={{ padding: 18, boxShadow: "none" }}>
                <h3 style={{ marginTop: 0 }}>{event.title}</h3>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}
                >
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>Quantity</div>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        marginTop: 8
                      }}
                    >
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={decrement}
                        disabled={quantity <= 1}
                      >
                        -
                      </button>

                      <div
                        style={{
                          minWidth: 60,
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: "1.1rem"
                        }}
                      >
                        {quantity}
                      </div>

                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={increment}
                        disabled={quantity >= 20}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div style={{ minWidth: 180 }}>
                    {loadingQuote ? (
                      <p style={{ color: "var(--muted)", margin: 0 }}>Updating total...</p>
                    ) : quote ? (
                      <>
                        <div style={{ color: "var(--muted)", fontSize: 13 }}>Total</div>
                        <div className="price-emphasis">KES {quote.total_amount}</div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Full name</label>
                  <input
                    className="input"
                    placeholder="Enter full name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Email address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="Enter email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
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
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="grid" style={{ gap: 8 }}>
                  <label style={{ fontWeight: 700 }}>Payment method</label>
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
                </div>
              </div>

              <button className="btn" type="submit" disabled={!canSubmit}>
                {submitting ? "Processing..." : "Proceed to Pay"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}