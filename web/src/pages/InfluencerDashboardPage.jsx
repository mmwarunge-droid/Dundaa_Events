import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import KycWizard from "../components/KycWizard";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

import CtaGroup from "../components/ui/CtaGroup";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import PageSection from "../components/ui/PageSection";
import StatusBanner from "../components/ui/StatusBanner";

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
  const [kycSubmissions, setKycSubmissions] = useState([]);

  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);

  const [cashout, setCashout] = useState({
    amount: "1000",
    provider: "mpesa",
    destination_reference: ""
  });

  const [myEventsFilter, setMyEventsFilter] = useState({
    query: "",
    category: "All",
    status: "All"
  });

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
    payment_link: "",
    has_ticket_sales: false
  });

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

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const resolvePosterUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE_URL}${url}`;
  };

  const latestKyc = kycSubmissions?.[0] || null;
  const hasApprovedKyc = latestKyc?.status === "approved";
  const hasPendingKyc = latestKyc?.status === "pending";
  const hasRejectedKyc = latestKyc?.status === "rejected";

  const load = async () => {
    try {
      const [starsRes, txRes, eventsRes, kycRes] = await Promise.all([
        api.get("/stars"),
        api.get("/transactions"),
        api.get("/events"),
        api.get("/kyc/me")
      ]);

      setStars(starsRes.data);
      setTransactions(txRes.data);

      const ownedEvents = (eventsRes.data || []).filter(
        (event) => event.owner_id === user?.id
      );
      setMyEvents(ownedEvents);
      setKycSubmissions(kycRes.data || []);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setPublishing(true);

    try {
      if (form.has_ticket_sales && !hasApprovedKyc) {
        throw new Error(
          "KYC approval is required before publishing an event with ticket sales."
        );
      }

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("has_ticket_sales", String(form.has_ticket_sales));

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
        payment_link: "",
        has_ticket_sales: false
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await load();
    } catch (err) {
      console.error("Failed to publish event:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to publish event."
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleDecay = async () => {
    try {
      await api.post("/stars/decay");
      await load();
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
      await load();
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
      payment_link: event.payment_link || "",
      has_ticket_sales: Boolean(event.has_ticket_sales)
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
      payment_link: "",
      has_ticket_sales: false
    });
  };

  const handleSaveEvent = async (eventId) => {
    setError("");
    setActionLoadingId(eventId);

    try {
      if (editForm.has_ticket_sales && !hasApprovedKyc) {
        throw new Error(
          "KYC approval is required before enabling ticket sales for this event."
        );
      }

      await api.put(`/events/${eventId}`, {
        ...editForm,
        category: editForm.category || null,
        event_date: editForm.event_date || null,
        price: editForm.price === "" ? null : Number(editForm.price),
        payment_method: editForm.payment_method || null,
        payment_link: editForm.payment_link || null
      });

      setEditingEventId(null);
      await load();
    } catch (err) {
      console.error("Event update failed:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to update event."
      );
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
      await load();
    } catch (err) {
      console.error("Event delete failed:", err);
      setError(err?.response?.data?.detail || "Failed to delete event.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const isThisWeek = (eventDateString) => {
    if (!eventDateString) return false;

    const today = new Date();
    const target = new Date(eventDateString);
    if (Number.isNaN(target.getTime())) return false;

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    const day = today.getDay();
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
            Launch events, grow visibility, manage payouts, and complete KYC.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </section>

      {error ? (
        <StatusBanner variant="error" title="Dashboard issue" message={error} />
      ) : null}

      <div className="grid grid-3">
        <MetricCard
          title="Influencer Tier"
          value={stars?.tier || user?.influencer_tier || "none"}
          description={`Active 5-Star Equivalent: ${stars?.active_five_star_equivalent || 0}`}
          action={
            <button className="btn btn-secondary" onClick={handleDecay}>
              Recalculate Decay
            </button>
          }
        />
        <MetricCard
          title="Wallet Balance"
          value={`KES ${user?.wallet_balance || 0}`}
          description="Earnings available for eligible payout."
        />
        <MetricCard
          title="KYC Status"
          value={latestKyc?.status || "not_submitted"}
          description={
            hasApprovedKyc
              ? "Approved — you can publish ticketed events."
              : hasPendingKyc
              ? "Pending admin review."
              : hasRejectedKyc
              ? `Rejected. ${latestKyc?.review_notes || ""}`
              : "Submit KYC to unlock ticketed events and creator monetization."
          }
        />
      </div>

      <div className="grid grid-2">
        <PageSection
          title="Post an Event"
          subtitle="Create a polished listing that is easy to discover and trust."
        >
          <form className="grid grid-2" onSubmit={handleCreate}>
            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Event Title</label>
              <input
                className="input"
                placeholder="Event title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Poster URL</label>
              <input
                className="input"
                placeholder="Poster URL"
                value={form.poster_url}
                onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Description</label>
              <textarea
                className="textarea"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div className="grid" style={{ gap: 12 }}>
              <label style={{ fontWeight: 700 }}>Poster Upload</label>

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
            </div>

            <div
              className="card"
              style={{
                padding: 16,
                background: "#fffaf5",
                borderColor: "rgba(255,107,0,0.12)",
                boxShadow: "none"
              }}
            >
              <strong>Ticketing</strong>
              <div className="grid" style={{ gap: 12, marginTop: 12 }}>
                <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={form.has_ticket_sales}
                    onChange={(e) =>
                      setForm({ ...form, has_ticket_sales: e.target.checked })
                    }
                  />
                  <span>Enable ticket sales</span>
                </label>

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

                {form.has_ticket_sales && !hasApprovedKyc ? (
                  <StatusBanner
                    variant="error"
                    title="KYC Required"
                    message="Complete and get approval for KYC before publishing a ticketed event."
                  />
                ) : null}
              </div>
            </div>

            <button className="btn" type="submit" disabled={publishing}>
              {publishing ? "Publishing..." : "Publish Event"}
            </button>
          </form>
        </PageSection>

        <div className="grid" style={{ gap: 20 }}>
          <PageSection
            title="Cash Out"
            subtitle="Request payout for your available earnings."
          >
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
          </PageSection>

          <StatusBanner
            variant="success"
            title="Creator confidence"
            message="Dundaa gives you cleaner publishing, stronger trust signals, KYC-backed monetization, and easier event management in one place."
          />
        </div>
      </div>

      <PageSection card>
        <KycWizard
          onStatusChange={(submission) => {
            if (submission) {
              setKycSubmissions((prev) => {
                const others = (prev || []).filter((item) => item.id !== submission.id);
                return [submission, ...others];
              });
            } else {
              load();
            }
          }}
        />
      </PageSection>

      <PageSection
        title="My Events"
        subtitle="Track, edit, and organize the events you have created."
      >
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
          <EmptyState
            icon="🎟️"
            title="No events match the current filters"
            message="Try a different search, category, or status."
          />
        ) : (
          <div className="grid grid-3">
            {filteredMyEvents.map((event) => {
              const posterSrc = resolvePosterUrl(event.poster_url);
              const isPdfPoster = event.poster_type === "pdf";
              const isEditing = editingEventId === event.id;

              return (
                <div key={event.id} className="event-card">
                  {!isEditing ? (
                    <>
                      {posterSrc && !isPdfPoster ? (
                        <img
                          src={posterSrc}
                          alt={event.title}
                          className="event-card-image"
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
                          className="event-card-image"
                          style={{
                            display: "grid",
                            placeItems: "center",
                            background:
                              "linear-gradient(135deg, rgba(255,107,0,0.10), rgba(0,194,168,0.08))",
                            color: "var(--muted)",
                            fontWeight: 700
                          }}
                        >
                          Dundaa Event
                        </div>
                      )}

                      <div className="card-meta">
                        {event.location_name ? <span className="badge">{event.location_name}</span> : null}
                        {event.category ? <span className="badge">{event.category}</span> : null}
                        {event.event_date ? <span className="badge">{event.event_date}</span> : null}
                        <span className="badge">{event.approval_status}</span>
                        {event.has_ticket_sales ? <span className="badge">Ticketed</span> : null}
                      </div>

                      <h4 className="card-title">{event.title}</h4>

                      <p className="card-copy">
                        {event.description?.slice(0, 90)}...
                      </p>

                      {event.rejection_reason ? (
                        <StatusBanner
                          variant="error"
                          title="Review note"
                          message={event.rejection_reason}
                        />
                      ) : null}

                      {event.price !== null && event.price !== undefined ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ color: "var(--muted)", fontSize: 13 }}>Price</div>
                          <div className="price-emphasis">KES {event.price}</div>
                        </div>
                      ) : null}

                      <CtaGroup style={{ marginTop: 14 }}>
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
                      </CtaGroup>
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

                      <CtaGroup style={{ marginTop: 14 }}>
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
                      </CtaGroup>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Transactions"
        subtitle="Track payouts, purchases, and creator-side financial activity."
      >
        {transactions.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No transactions yet"
            message="Your payouts, purchases, and financial activity will appear here."
          />
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="card"
                style={{
                  padding: 14,
                  boxShadow: "none",
                  borderColor: "rgba(17,17,17,0.08)"
                }}
              >
                <strong>{tx.tx_type}</strong>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  {tx.provider} • KES {tx.gross_amount} • {tx.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}