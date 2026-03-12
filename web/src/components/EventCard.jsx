import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
EventCard
---------
Displays a single event preview card.

Fix included:
- uploaded posters stored as /uploads/... are resolved against backend URL
- PDF posters render as a clickable PDF preview card
- quick edit/delete remain available for owners
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

const PAYMENT_METHOD_OPTIONS = ["MoMo", "Bank", "Card"];

// Backend base URL used for uploaded local poster files.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Convert relative backend upload paths into absolute URLs for the browser.
function resolvePosterUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

export default function EventCard({ event, onEventChanged }) {
  const { user } = useAuth();

  const [imageBroken, setImageBroken] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    poster_url: "",
    google_map_link: "",
    location_name: "",
    category: "",
    event_date: "",
    price: "",
    payment_method: "",
    payment_link: ""
  });

  useEffect(() => {
    setForm({
      title: event.title || "",
      description: event.description || "",
      poster_url: event.poster_url || "",
      google_map_link: event.google_map_link || "",
      location_name: event.location_name || "",
      category: event.category || "",
      event_date: event.event_date || "",
      price: event.price ?? "",
      payment_method: event.payment_method || "",
      payment_link: event.payment_link || ""
    });

    // Reset broken-image state if event changes.
    setImageBroken(false);
  }, [event]);

  const isOwner = user?.id === event?.owner_id;
  const isPdfPoster = event.poster_type === "pdf";
  const posterSrc = resolvePosterUrl(event.poster_url);

  const handleQuickSave = async () => {
    setError("");
    setLoading(true);

    try {
      await api.put(`/events/${event.id}`, {
        ...form,
        category: form.category || null,
        event_date: form.event_date || null,
        price: form.price === "" ? null : Number(form.price),
        payment_method: form.payment_method || null,
        payment_link: form.payment_link || null
      });

      setIsEditing(false);
      onEventChanged?.();
    } catch (err) {
      console.error("Quick update failed:", err);
      setError(err?.response?.data?.detail || "Failed to update event.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDelete = async () => {
    const confirmed = window.confirm("Delete this event permanently?");
    if (!confirmed) return;

    setError("");
    setLoading(true);

    try {
      await api.delete(`/events/${event.id}`);
      onEventChanged?.();
    } catch (err) {
      console.error("Quick delete failed:", err);
      setError(err?.response?.data?.detail || "Failed to delete event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      {error && (
        <p style={{ color: "tomato", marginBottom: 12 }}>{error}</p>
      )}

      {!isEditing ? (
        <>
          {posterSrc && !isPdfPoster && !imageBroken ? (
            <img
              src={posterSrc}
              alt={event.title}
              onError={() => setImageBroken(true)}
              style={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                borderRadius: 14,
                marginBottom: 12
              }}
            />
          ) : posterSrc && isPdfPoster ? (
            <a
              href={posterSrc}
              target="_blank"
              rel="noreferrer"
              className="pdf-poster-card"
              style={{ marginBottom: 12 }}
            >
              <span className="pdf-poster-label">PDF Poster</span>
              <span className="pdf-poster-link">Open PDF</span>
            </a>
          ) : (
            <div
              style={{
                width: "100%",
                height: 180,
                borderRadius: 14,
                marginBottom: 12,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(255,255,255,0.03))",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#b6b6b6",
                fontWeight: 600
              }}
            >
              No poster preview
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <div className="badge">{event.location_name || "Event"}</div>
            {event.category && <div className="badge">{event.category}</div>}
            {event.event_date && <div className="badge">{event.event_date}</div>}
          </div>

          <h3>{event.title}</h3>

          <p style={{ color: "#b6b6b6", minHeight: 60 }}>
            {event.description.slice(0, 120)}...
          </p>

          {event.price !== null && event.price !== undefined && (
            <p style={{ marginBottom: 6 }}>
              Price: <strong>KES {event.price}</strong>
            </p>
          )}

          {event.payment_method && (
            <p style={{ marginBottom: 6 }}>
              Pay via: <strong>{event.payment_method}</strong>
            </p>
          )}

          <p>⭐ {event.average_rating || 0} | Rank {event.ranking_score || 0}</p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <Link className="btn" to={`/events/${event.id}`}>
              View Event
            </Link>

            {isOwner && (
              <>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>

                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleQuickDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <h3 style={{ marginTop: 0 }}>Quick Edit</h3>

          <div className="grid" style={{ gap: 10 }}>
            <input
              className="input"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <textarea
              className="textarea"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <input
              className="input"
              placeholder="Poster URL"
              value={form.poster_url}
              onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
            />

            <input
              className="input"
              placeholder="Google Map link"
              value={form.google_map_link}
              onChange={(e) => setForm({ ...form, google_map_link: e.target.value })}
            />

            <input
              className="input"
              placeholder="Location name"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />

            <select
              className="select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />

            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />

            <select
              className="select"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
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
              value={form.payment_link}
              onChange={(e) => setForm({ ...form, payment_link: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              className="btn"
              type="button"
              onClick={handleQuickSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError("");
                setForm({
                  title: event.title || "",
                  description: event.description || "",
                  poster_url: event.poster_url || "",
                  google_map_link: event.google_map_link || "",
                  location_name: event.location_name || "",
                  category: event.category || "",
                  event_date: event.event_date || "",
                  price: event.price ?? "",
                  payment_method: event.payment_method || "",
                  payment_link: event.payment_link || ""
                });
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}