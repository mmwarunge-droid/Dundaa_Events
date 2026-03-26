import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api/client";
import CommentList from "../components/CommentList";
import GuestCheckoutModal from "../components/GuestCheckoutModal";
import RatingStars from "../components/RatingStars";
import ShareButton from "../components/ShareButton";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function resolvePosterUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err) {
      console.error("Failed to load event:", err);
      setError(err?.response?.data?.detail || "Failed to load event.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const posterSrc = useMemo(
    () => resolvePosterUrl(event?.poster_url),
    [event?.poster_url]
  );

  const canShowGuestCheckout = !!event?.can_guest_checkout;
  const canShowPaymentLink =
    event?.has_ticket_sales &&
    event?.is_live &&
    event?.approval_status === "approved" &&
    !!event?.payment_link;

  const isOwner = user?.id === event?.owner_id;

  const submitComment = async (e) => {
    e.preventDefault();

    if (!user) {
      setError("Please login to comment.");
      return;
    }

    if (!commentBody.trim()) return;

    try {
      setCommentLoading(true);
      setError("");

      await api.post(`/events/${id}/comment`, {
        body: commentBody.trim()
      });

      setCommentBody("");
      await loadEvent();
    } catch (err) {
      console.error("Comment submit failed:", err);
      setError(err?.response?.data?.detail || "Failed to post comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  const submitRating = async (value) => {
    if (!user) {
      setError("Please login to rate this event.");
      return;
    }

    try {
      setRatingLoading(true);
      setError("");

      await api.post(`/events/${id}/rate`, { value });
      await loadEvent();
    } catch (err) {
      console.error("Rating submit failed:", err);
      setError(err?.response?.data?.detail || "Failed to submit rating.");
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p style={{ color: "var(--muted)" }}>Loading event...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p style={{ color: "tomato" }}>{error}</p>
        <Link className="btn" to="/events">
          Back to Events
        </Link>
      </div>
    );
  }

  if (!event) return null;

  return (
    <>
      <div className="container grid" style={{ gap: 28 }}>
        {error && (
          <p style={{ color: "tomato", margin: 0 }}>
            {error}
          </p>
        )}

        <section className="market-hero" style={{ alignItems: "start" }}>
          <div className="card" style={{ padding: 24, borderRadius: 28 }}>
            {posterSrc ? (
              <img
                src={posterSrc}
                alt={event.title}
                style={{
                  width: "100%",
                  maxHeight: 440,
                  objectFit: "cover",
                  borderRadius: 22,
                  marginBottom: 18
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  minHeight: 360,
                  borderRadius: 22,
                  marginBottom: 18,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "linear-gradient(135deg, rgba(255,107,0,0.12), rgba(0,194,168,0.08))",
                  color: "var(--muted)",
                  fontWeight: 800,
                  fontSize: "1.2rem"
                }}
              >
                Dundaa Event
              </div>
            )}

            <div className="card-meta">
              {event.category && <span className="badge">{event.category}</span>}
              {event.location_name && <span className="badge">{event.location_name}</span>}
              {event.event_date && <span className="badge">{event.event_date}</span>}
              {event.has_ticket_sales && <span className="badge">Ticketed</span>}
              {canShowGuestCheckout && <span className="badge">Guest Checkout</span>}
            </div>

            <h1 style={{ marginTop: 10, marginBottom: 10, fontSize: "clamp(2rem, 4vw, 3.3rem)", lineHeight: 1.04 }}>
              {event.title}
            </h1>

            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Hosted by <strong style={{ color: "var(--text)" }}>{event.owner_username || "Creator"}</strong>
            </p>

            <p style={{ fontSize: "1.04rem", lineHeight: 1.7 }}>
              {event.description}
            </p>

            {event.rejection_reason && isOwner && (
              <div
                className="card"
                style={{
                  padding: 14,
                  marginTop: 16,
                  background: "#fff4f4",
                  borderColor: "rgba(214,69,69,0.18)",
                  boxShadow: "none"
                }}
              >
                <strong style={{ color: "var(--danger)" }}>Review note</strong>
                <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                  {event.rejection_reason}
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <ShareButton event={event} />

              {canShowGuestCheckout && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Buy as Guest
                </button>
              )}

              {canShowPaymentLink && (
                <a
                  className="btn btn-secondary"
                  href={event.payment_link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ticket Link
                </a>
              )}
            </div>
          </div>

          <div className="market-search-card">
            <h3>Quick event details</h3>
            <p>Everything you need before checkout.</p>

            <div className="grid" style={{ gap: 14 }}>
              <div className="card" style={{ padding: 16, boxShadow: "none" }}>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Price</div>
                <div className="price-emphasis">
                  {event.price !== null && event.price !== undefined
                    ? `KES ${event.price}`
                    : event.has_ticket_sales
                    ? "Ticket info soon"
                    : "Free"}
                </div>
              </div>

              <div className="card" style={{ padding: 16, boxShadow: "none" }}>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Payment Method</div>
                <div style={{ fontWeight: 800 }}>
                  {event.payment_method || "To be confirmed"}
                </div>
              </div>

              <div className="card" style={{ padding: 16, boxShadow: "none" }}>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Average Rating</div>
                <div style={{ fontWeight: 800 }}>
                  {event.average_rating || 0}
                </div>
              </div>

              {event.google_map_link && (
                <a
                  href={event.google_map_link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  Open location map
                </a>
              )}

              <div className="card" style={{ padding: 16, background: "var(--accent-soft)", borderColor: "rgba(0,194,168,0.14)", boxShadow: "none" }}>
                <strong style={{ color: "var(--success)" }}>Why Dundaa feels safer</strong>
                <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                  Clear payments, quick checkout options, and stronger event review flows help create trust.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-2">
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Ratings</h2>
            <p style={{ color: "var(--muted)" }}>
              Leave feedback and help others discover great experiences.
            </p>

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
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Current average</div>
              <div className="price-emphasis">{event.average_rating || 0}</div>
            </div>

            <RatingStars disabled={ratingLoading} onRate={submitRating} />

            {!user && (
              <p style={{ color: "var(--muted)", marginTop: 14 }}>
                Login to rate this event.
              </p>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Comments</h2>
            <p style={{ color: "var(--muted)" }}>
              Ask questions, react, and share your thoughts.
            </p>

            {user ? (
              <form className="grid" onSubmit={submitComment}>
                <textarea
                  className="textarea"
                  placeholder="Write a comment"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                />
                <button className="btn" type="submit" disabled={commentLoading}>
                  {commentLoading ? "Posting..." : "Post Comment"}
                </button>
              </form>
            ) : (
              <p style={{ color: "var(--muted)" }}>
                Login to comment on this event.
              </p>
            )}

            <div style={{ marginTop: 18 }}>
              <CommentList comments={event.comments || []} />
            </div>
          </div>
        </section>

        <section className="grid" style={{ gap: 16 }}>
          <div className="section-head">
            <div>
              <h2>Why attend through Dundaa?</h2>
              <p>Built for discovery, confidence, and quick action.</p>
            </div>
          </div>

          <div className="trust-grid">
            <div className="trust-card">
              <h3>Fast booking flow</h3>
              <p>Move from discovery to checkout with fewer steps and clearer next actions.</p>
            </div>
            <div className="trust-card">
              <h3>Trusted event discovery</h3>
              <p>Structured event listings and review states help users feel more confident.</p>
            </div>
            <div className="trust-card">
              <h3>Guest-friendly checkout</h3>
              <p>Buy quickly without being forced through a long account setup process first.</p>
            </div>
          </div>
        </section>
      </div>

      <GuestCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        event={event}
      />
    </>
  );
}