import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../api/client";
import CommentList from "../components/CommentList";
import RatingStars from "../components/RatingStars";
import { useAuth } from "../context/AuthContext";

/*
EventDetailPage
---------------
Phase 2 additions:
- event approval/ticketing state is visible
- Buy Tickets button appears only when the event is ticketed and approved/live
- owners can still see rejection reasons on their own events
*/

const CATEGORY_OPTIONS = [
  "Club",
  "Church",
  "Outdoor Activities",
  "Restaurant",
  "Indoor Activities",
  "Corporate",
  "Hobbies"
];

const PAYMENT_METHOD_OPTIONS = ["MoMo", "Bank", "Card", "M-Pesa"];

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function resolvePosterUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    poster_url: "",
    google_map_link: "",
    location_name: "",
    category: "",
    event_date: "",
    price: "",
    payment_method: "",
    payment_link: "",
    has_ticket_sales: false
  });

  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/events/${id}`);
      setEvent(res.data);

      setEditForm({
        title: res.data.title || "",
        description: res.data.description || "",
        poster_url: res.data.poster_url || "",
        google_map_link: res.data.google_map_link || "",
        location_name: res.data.location_name || "",
        category: res.data.category || "",
        event_date: res.data.event_date || "",
        price: res.data.price ?? "",
        payment_method: res.data.payment_method || "",
        payment_link: res.data.payment_link || "",
        has_ticket_sales: Boolean(res.data.has_ticket_sales)
      });
    } catch (err) {
      console.error("Failed to load event:", err);

      const backendError =
        err?.response?.data?.detail ||
        "Failed to load event details.";

      setError(backendError);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchEvent();
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwner = user?.id === event?.owner_id;
  const isPdfPoster = event?.poster_type === "pdf";
  const posterSrc = resolvePosterUrl(event?.poster_url);

  const canShowBuyTickets =
    event?.has_ticket_sales &&
    event?.is_live &&
    event?.approval_status === "approved";

  const submitRating = async () => {
    try {
      setError("");
      await api.post(`/events/${id}/rate`, { value: rating });
      fetchEvent();
    } catch (err) {
      console.error("Rating failed:", err);
      setError(err?.response?.data?.detail || "Failed to submit rating.");
    }
  };

  const submitComment = async () => {
    try {
      setError("");
      await api.post(`/events/${id}/comment`, { body: comment });
      setComment("");
      fetchEvent();
    } catch (err) {
      console.error("Comment failed:", err);
      setError(err?.response?.data?.detail || "Failed to post comment.");
    }
  };

  const saveEdits = async () => {
    setError("");
    setActionLoading(true);

    try {
      await api.put(`/events/${id}`, {
        ...editForm,
        category: editForm.category || null,
        event_date: editForm.event_date || null,
        price: editForm.price === "" ? null : Number(editForm.price),
        payment_method: editForm.payment_method || null,
        payment_link: editForm.payment_link || null
      });

      setIsEditing(false);
      fetchEvent();
    } catch (err) {
      console.error("Update failed:", err);
      setError(err?.response?.data?.detail || "Failed to update event.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setActionLoading(true);

    try {
      await api.delete(`/events/${id}`);
      navigate("/events");
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err?.response?.data?.detail || "Failed to delete event.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        Loading event...
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 24, maxWidth: 700 }}>
          <h2 style={{ marginTop: 0 }}>Unable to open this event</h2>
          <p style={{ color: "tomato" }}>{error}</p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <button className="btn" type="button" onClick={fetchEvent}>
              Retry
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => navigate("/events")}
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        Event not found.
      </div>
    );
  }

  return (
    <div className="container grid grid-2">
      <div className="card" style={{ padding: 24 }}>
        {error && (
          <p style={{ color: "tomato", marginBottom: 12 }}>{error}</p>
        )}

        {!isEditing ? (
          <>
            {posterSrc && !isPdfPoster && (
              <img
                src={posterSrc}
                alt={event.title}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  marginBottom: 16,
                  maxHeight: 320,
                  objectFit: "cover"
                }}
              />
            )}

            {posterSrc && isPdfPoster && (
              <a
                href={posterSrc}
                target="_blank"
                rel="noreferrer"
                className="pdf-poster-card"
                style={{ marginBottom: 16 }}
              >
                <span className="pdf-poster-label">PDF Poster</span>
                <span className="pdf-poster-link">Open PDF</span>
              </a>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {event.location_name && <div className="badge">{event.location_name}</div>}
              {event.category && <div className="badge">{event.category}</div>}
              {event.event_date && <div className="badge">{event.event_date}</div>}
              <div className="badge">{event.approval_status}</div>
              {event.has_ticket_sales && <div className="badge">Ticketed</div>}
            </div>

            <h2>{event.title}</h2>
            <p>{event.description}</p>

            {event.rejection_reason && isOwner && (
              <p style={{ color: "tomato" }}>
                Rejection reason: {event.rejection_reason}
              </p>
            )}

            {event.price !== null && event.price !== undefined && (
              <p>Price: <strong>KES {event.price}</strong></p>
            )}

            {event.payment_method && (
              <p>Payment method: <strong>{event.payment_method}</strong></p>
            )}

            <div
              className="card"
              style={{
                padding: 16,
                marginTop: 18,
                marginBottom: 18,
                background: "rgba(255,255,255,0.02)"
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 10 }}>Contact the organizer</h3>

              <p style={{ marginBottom: 8 }}>
                <strong>Organizer:</strong> {event.owner_username || "Event organizer"}
              </p>

              <p style={{ margin: 0, color: "var(--muted)" }}>
                {event.owner_contact_info || "Organizer contact details have not been added yet."}
              </p>
            </div>

            <p>Average Rating: {event.average_rating}</p>
            <p>Ranking Score: {event.ranking_score}</p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
              {event.google_map_link && (
                <a
                  className="btn"
                  href={event.google_map_link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Map
                </a>
              )}

              {canShowBuyTickets && (
                <a
                  className="btn btn-secondary"
                  href={event.payment_link || "#"}
                  target={event.payment_link ? "_blank" : undefined}
                  rel={event.payment_link ? "noreferrer" : undefined}
                  onClick={(e) => {
                    if (!event.payment_link) e.preventDefault();
                  }}
                >
                  Buy Tickets
                </a>
              )}
            </div>

            {isOwner && (
              <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Event
                </button>

                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Deleting..." : "Delete Event"}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2>Edit Event</h2>

            <div className="grid" style={{ gap: 12 }}>
              <input
                className="input"
                placeholder="Event title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />

              <textarea
                className="textarea"
                placeholder="Description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />

              <input
                className="input"
                placeholder="Poster URL"
                value={editForm.poster_url}
                onChange={(e) =>
                  setEditForm({ ...editForm, poster_url: e.target.value })
                }
              />

              <input
                className="input"
                placeholder="Google Map link"
                value={editForm.google_map_link}
                onChange={(e) =>
                  setEditForm({ ...editForm, google_map_link: e.target.value })
                }
              />

              <input
                className="input"
                placeholder="Location name"
                value={editForm.location_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, location_name: e.target.value })
                }
              />

              <select
                className="select"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <input
                className="input"
                type="date"
                value={editForm.event_date}
                onChange={(e) =>
                  setEditForm({ ...editForm, event_date: e.target.value })
                }
              />

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={editForm.has_ticket_sales}
                  onChange={(e) =>
                    setEditForm({ ...editForm, has_ticket_sales: e.target.checked })
                  }
                />
                <span>Enable ticket sales for this event</span>
              </label>

              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: e.target.value })
                }
              />

              <select
                className="select"
                value={editForm.payment_method}
                onChange={(e) =>
                  setEditForm({ ...editForm, payment_method: e.target.value })
                }
              >
                <option value="">Select payment method</option>
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>

              <input
                className="input"
                placeholder="Payment link"
                value={editForm.payment_link}
                onChange={(e) =>
                  setEditForm({ ...editForm, payment_link: e.target.value })
                }
              />
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                onClick={saveEdits}
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError("");
                  fetchEvent();
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid" style={{ gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3>Rate this event</h3>
          <RatingStars value={rating} onChange={setRating} />
          <button
            className="btn"
            onClick={submitRating}
            style={{ marginTop: 12 }}
          >
            Submit Rating
          </button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3>Comment</h3>
          <textarea
            className="textarea"
            maxLength={280}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            className="btn"
            onClick={submitComment}
            style={{ marginTop: 12 }}
          >
            Post Comment
          </button>
        </div>

        <div>
          <h3>Comments</h3>
          <CommentList comments={event.comments || []} />
        </div>
      </div>
    </div>
  );
}