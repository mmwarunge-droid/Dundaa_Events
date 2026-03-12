import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
InfluencerDashboardPage
-----------------------
Creator / influencer control center.

This page handles:
- posting events
- viewing influencer tier
- viewing wallet balance
- cashing out
- reviewing transactions
- viewing only the events created by the logged-in user
- editing and deleting owned events directly from "My Events"
- searching and filtering "My Events"
*/

const CATEGORY_OPTIONS = [
  "Club Events",
  "Church Events",
  "Outdoor Activities",
  "Sports",
  "Restaurants and Cafes",
  "Indoor Activities",
  "Corporate Events",
  "Hobbies"
];

const PAYMENT_METHOD_OPTIONS = ["M-Pesa", "Bank", "Card"];

const MY_EVENT_STATUS_OPTIONS = [
  "All",
  "Upcoming",
  "This Week",
  "This Month",
  "Past"
];

export default function InfluencerDashboardPage() {
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const [stars, setStars] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);

  const [cashout, setCashout] = useState({
    amount: "1000",
    provider: "mpesa",
    destination_reference: ""
  });

  // Search/filter state for "My Events".
  const [myEventsFilter, setMyEventsFilter] = useState({
    query: "",
    category: "All",
    status: "All"
  });

  // Event publishing form state.
  const [form, setForm] = useState({
    title: "",
    description: "",
    poster_url: "",
    poster_file: null,
    google_map_link: "",
    location_name: "",
    category: "",
    event_date: "",
    price: "",
    payment_method: "",
    payment_link: ""
  });

  // Inline edit form state for My Events.
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
    payment_link: ""
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const resolvePosterUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE_URL}${url}`;
  };

  // Load dashboard data.
  const load = async () => {
    try {
      const [starsRes, txRes, eventsRes] = await Promise.all([
        api.get("/stars"),
        api.get("/transactions"),
        api.get("/events")
      ]);

      setStars(starsRes.data);
      setTransactions(txRes.data);

      const ownedEvents = (eventsRes.data || []).filter(
        (event) => event.owner_id === user?.id
      );
      setMyEvents(ownedEvents);
    } catch (err) {
      console.error("Dashboard load failed:", err);
      setError("Failed to load dashboard data.");
    }
  };

  useEffect(() => {
    if (user?.id) {
      load();
    }
  }, [user?.id]);

  const handlePosterFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setForm((prev) => ({ ...prev, poster_file: null }));
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf"
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Poster file must be JPG, PNG, or PDF.");
      return;
    }

    setError("");
    setForm((prev) => ({ ...prev, poster_file: file }));
  };

  // Publish a new event.
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setPublishing(true);

    try {
      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("description", form.description);

      if (form.poster_url.trim()) {
        formData.append("poster_url", form.poster_url.trim());
      }

      if (form.poster_file) {
        formData.append("poster_file", form.poster_file);
      }

      if (form.google_map_link.trim()) {
        formData.append("google_map_link", form.google_map_link.trim());
      }

      if (form.location_name.trim()) {
        formData.append("location_name", form.location_name.trim());
      }

      if (form.category) {
        formData.append("category", form.category);
      }

      if (form.event_date) {
        formData.append("event_date", form.event_date);
      }

      if (form.price !== "") {
        formData.append("price", String(Number(form.price)));
      }

      if (form.payment_method) {
        formData.append("payment_method", form.payment_method);
      }

      if (form.payment_link.trim()) {
        formData.append("payment_link", form.payment_link.trim());
      }

      await api.post("/events", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setForm({
        title: "",
        description: "",
        poster_url: "",
        poster_file: null,
        google_map_link: "",
        location_name: "",
        category: "",
        event_date: "",
        price: "",
        payment_method: "",
        payment_link: ""
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      load();
    } catch (err) {
      console.error("Failed to publish event:", err);
      setError(err?.response?.data?.detail || "Failed to publish event.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDecay = async () => {
    try {
      await api.post("/stars/decay");
      load();
    } catch (err) {
      console.error("Decay recalculation failed:", err);
      setError("Failed to recalculate star decay.");
    }
  };

  const handleCashout = async (e) => {
    e.preventDefault();

    try {
      await api.post("/influencer/cashout", {
        ...cashout,
        amount: Number(cashout.amount)
      });
      load();
    } catch (err) {
      console.error("Cashout failed:", err);
      setError(err?.response?.data?.detail || "Cashout request failed.");
    }
  };

  const startEditingEvent = (event) => {
    setEditingEventId(event.id);
    setEditForm({
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
  };

  const cancelEditingEvent = () => {
    setEditingEventId(null);
    setEditForm({
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
  };

  const handleSaveEvent = async (eventId) => {
    setError("");
    setActionLoadingId(eventId);

    try {
      await api.put(`/events/${eventId}`, {
        ...editForm,
        category: editForm.category || null,
        event_date: editForm.event_date || null,
        price: editForm.price === "" ? null : Number(editForm.price),
        payment_method: editForm.payment_method || null,
        payment_link: editForm.payment_link || null
      });

      setEditingEventId(null);
      load();
    } catch (err) {
      console.error("Event update failed:", err);
      setError(err?.response?.data?.detail || "Failed to update event.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setActionLoadingId(eventId);

    try {
      await api.delete(`/events/${eventId}`);
      if (editingEventId === eventId) {
        setEditingEventId(null);
      }
      load();
    } catch (err) {
      console.error("Event delete failed:", err);
      setError(err?.response?.data?.detail || "Failed to delete event.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper date logic for dashboard filters.
  const isThisWeek = (eventDateString) => {
    if (!eventDateString) return false;

    const today = new Date();
    const target = new Date(eventDateString);
    if (Number.isNaN(target.getTime())) return false;

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    const day = today.getDay(); // 0 Sunday ... 6 Saturday
    const daysUntilSunday = 7 - day === 7 ? 0 : 7 - day;
    end.setDate(today.getDate() + daysUntilSunday);
    end.setHours(23, 59, 59, 999);

    return target >= start && target <= end;
  };

  const isThisMonth = (eventDateString) => {
    if (!eventDateString) return false;

    const today = new Date();
    const target = new Date(eventDateString);
    if (Number.isNaN(target.getTime())) return false;

    return (
      target.getFullYear() === today.getFullYear() &&
      target.getMonth() === today.getMonth()
    );
  };

  const isPast = (eventDateString) => {
    if (!eventDateString) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(eventDateString);
    if (Number.isNaN(target.getTime())) return false;

    return target < today;
  };

  const isUpcoming = (eventDateString) => {
    if (!eventDateString) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(eventDateString);
    if (Number.isNaN(target.getTime())) return false;

    return target >= today;
  };

  // Filtered event list for "My Events".
  const filteredMyEvents = useMemo(() => {
    const q = myEventsFilter.query.trim().toLowerCase();

    return myEvents.filter((event) => {
      const matchesQuery =
        !q ||
        event.title?.toLowerCase().includes(q) ||
        event.description?.toLowerCase().includes(q) ||
        event.location_name?.toLowerCase().includes(q) ||
        event.category?.toLowerCase().includes(q);

      const matchesCategory =
        myEventsFilter.category === "All" ||
        event.category === myEventsFilter.category;

      let matchesStatus = true;

      switch (myEventsFilter.status) {
        case "Upcoming":
          matchesStatus = isUpcoming(event.event_date);
          break;
        case "This Week":
          matchesStatus = isThisWeek(event.event_date);
          break;
        case "This Month":
          matchesStatus = isThisMonth(event.event_date);
          break;
        case "Past":
          matchesStatus = isPast(event.event_date);
          break;
        default:
          matchesStatus = true;
      }

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [myEvents, myEventsFilter]);

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <section className="page-header-bar">
        <div>
          <h1 style={{ margin: 0 }}>Creator Dashboard</h1>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Publish events, monitor your growth, and manage payouts.
          </p>
        </div>
      </section>

      {error && (
        <p style={{ color: "tomato", margin: 0 }}>
          {error}
        </p>
      )}

      <div className="grid grid-3">
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Influencer Tier</h3>
          <p style={{ fontSize: "1.15rem", marginBottom: 8 }}>
            <strong>{stars?.tier || user?.influencer_tier || "none"}</strong>
          </p>
          <p style={{ color: "var(--muted)" }}>
            Active 5-Star Equivalent: {stars?.active_five_star_equivalent || 0}
          </p>
          <button className="btn" onClick={handleDecay}>
            Recalculate Decay
          </button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Wallet Balance</h3>
          <p style={{ fontSize: "1.4rem", marginBottom: 8 }}>
            <strong>KES {user?.wallet_balance || 0}</strong>
          </p>
          <p style={{ color: "var(--muted)" }}>
            Earnings available for eligible payout.
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>My Posted Events</h3>
          <p style={{ fontSize: "1.4rem", marginBottom: 8 }}>
            <strong>{myEvents.length}</strong>
          </p>
          <p style={{ color: "var(--muted)" }}>
            Events currently associated with your account.
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card" style={{ padding: 24 }}>
          <h2>Post an Event</h2>

          <form className="grid grid-2" onSubmit={handleCreate}>
            <input
              className="input"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <div className="grid" style={{ gap: 12 }}>
              <input
                className="input"
                placeholder="Poster URL"
                value={form.poster_url}
                onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
              />

              <div className="upload-zone">
                <div className="upload-zone-text">
                  <strong>Upload poster from your device</strong>
                  <span>Accepted: JPG, PNG, PDF</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="upload-input"
                  onChange={handlePosterFileChange}
                />

                <button
                  type="button"
                  className="btn btn-secondary upload-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </button>

                <div className="upload-file-name">
                  {form.poster_file ? form.poster_file.name : "No file selected"}
                </div>
              </div>
            </div>

            <textarea
              className="textarea"
              placeholder="Description (~100 words)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="grid" style={{ gap: 12 }}>
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

            <button className="btn" type="submit" disabled={publishing}>
              {publishing ? "Publishing..." : "Publish Event"}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2>Cash Out</h2>
          <form className="grid" onSubmit={handleCashout}>
            <input
              className="input"
              value={cashout.amount}
              onChange={(e) =>
                setCashout({ ...cashout, amount: e.target.value })
              }
            />

            <select
              className="select"
              value={cashout.provider}
              onChange={(e) =>
                setCashout({ ...cashout, provider: e.target.value })
              }
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
            </select>

            <input
              className="input"
              placeholder="Phone / account reference"
              value={cashout.destination_reference}
              onChange={(e) =>
                setCashout({
                  ...cashout,
                  destination_reference: e.target.value
                })
              }
            />

            <button className="btn" type="submit">
              Request Cashout
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 16
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>My Events</h3>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              Events you have created on Dundaa.
            </p>
          </div>

          <button className="btn btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>

        {/* Search and filter controls for My Events */}
        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <input
            className="input"
            placeholder="Search my events"
            value={myEventsFilter.query}
            onChange={(e) =>
              setMyEventsFilter({ ...myEventsFilter, query: e.target.value })
            }
          />

          <select
            className="select"
            value={myEventsFilter.category}
            onChange={(e) =>
              setMyEventsFilter({ ...myEventsFilter, category: e.target.value })
            }
          >
            <option value="All">All categories</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={myEventsFilter.status}
            onChange={(e) =>
              setMyEventsFilter({ ...myEventsFilter, status: e.target.value })
            }
          >
            {MY_EVENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {filteredMyEvents.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No events match the current filters.
          </p>
        ) : (
          <div className="grid grid-3">
            {filteredMyEvents.map((event) => {
              const posterSrc = resolvePosterUrl(event.poster_url);
              const isPdfPoster = event.poster_type === "pdf";
              const isEditing = editingEventId === event.id;

              return (
                <div key={event.id} className="card" style={{ padding: 16 }}>
                  {!isEditing ? (
                    <>
                      {posterSrc && !isPdfPoster ? (
                        <img
                          src={posterSrc}
                          alt={event.title}
                          style={{
                            width: "100%",
                            height: 160,
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
                            height: 160,
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
                        {event.location_name && <div className="badge">{event.location_name}</div>}
                        {event.category && <div className="badge">{event.category}</div>}
                        {event.event_date && <div className="badge">{event.event_date}</div>}
                      </div>

                      <h4 style={{ marginTop: 0, marginBottom: 8 }}>{event.title}</h4>

                      <p style={{ color: "var(--muted)", marginTop: 0 }}>
                        {event.description?.slice(0, 90)}...
                      </p>

                      {event.price !== null && event.price !== undefined && (
                        <p style={{ marginBottom: 8 }}>
                          Price: <strong>KES {event.price}</strong>
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link className="btn" to={`/events/${event.id}`}>
                          View Event
                        </Link>

                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => startEditingEvent(event)}
                        >
                          Edit
                        </button>

                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={actionLoadingId === event.id}
                        >
                          {actionLoadingId === event.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 style={{ marginTop: 0 }}>Edit Event</h4>

                      <div className="grid" style={{ gap: 10 }}>
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

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => handleSaveEvent(event.id)}
                          disabled={actionLoadingId === event.id}
                        >
                          {actionLoadingId === event.id ? "Saving..." : "Save"}
                        </button>

                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={cancelEditingEvent}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3>Transactions</h3>

        <div className="grid">
          {transactions.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              No transactions yet.
            </p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="card" style={{ padding: 12 }}>
                <strong>{tx.tx_type}</strong> - {tx.provider} - KES {tx.gross_amount} - {tx.status}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}