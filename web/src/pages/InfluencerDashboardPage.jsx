import React, { useEffect, useMemo, useRef, useState } from "react";
import KycWizard from "../components/KycWizard";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import useToast from "../hooks/useToast";

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
const MFA_METHOD_OPTIONS = ["email", "sms"];

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
  const toast = useToast();

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
    destination_reference: "",
    mfa_method: "email"
  });

  const [withdrawalChallenge, setWithdrawalChallenge] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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
  has_ticket_sales: false,
  kyc_submission_id: ""
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
    has_ticket_sales: false
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const resolvePosterUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE_URL}${url}`;
  };

  const approvedKycSubmissions = useMemo(
  () => (kycSubmissions || []).filter((item) => item.status === "approved"),
  [kycSubmissions]
);

const pendingKycSubmissions = useMemo(
  () => (kycSubmissions || []).filter((item) => item.status === "pending"),
  [kycSubmissions]
);

const draftKycSubmissions = useMemo(
  () => (kycSubmissions || []).filter((item) => item.status === "draft"),
  [kycSubmissions]
);

const latestKyc = kycSubmissions?.[0] || null;
const hasApprovedKyc = approvedKycSubmissions.length > 0;
const hasPendingKyc = pendingKycSubmissions.length > 0;
const hasDraftKyc = draftKycSubmissions.length > 0;
const hasRejectedKyc = latestKyc?.status === "rejected";

  const load = async () => {
    try {
      setError("");

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
      toast.error("Failed to load dashboard data.");
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
      toast.error("Poster file must be JPG, PNG, or PDF.");
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
      const statusMessage = hasPendingKyc
        ? "Your KYC has been submitted for review. You can publish ticket sales after admin approval."
        : "KYC is still in progress. Complete and submit it before publishing ticket sales.";

      throw new Error(statusMessage);
    }

    if (form.has_ticket_sales && !form.kyc_submission_id) {
      throw new Error("Select the approved organisation/KYC profile to use for this ticketed event.");
    }

    const formData = new FormData();

formData.append("title", form.title);
formData.append("description", form.description);
formData.append("has_ticket_sales", String(form.has_ticket_sales));

if (form.has_ticket_sales) {
  formData.append("kyc_submission_id", form.kyc_submission_id);
}

    if (form.poster_url.trim()) formData.append("poster_url", form.poster_url.trim());
    if (form.poster_file) formData.append("poster_file", form.poster_file);
    if (form.google_map_link.trim()) formData.append("google_map_link", form.google_map_link.trim());
    if (form.location_name.trim()) formData.append("location_name", form.location_name.trim());
    if (form.category) formData.append("category", form.category);
    if (form.event_date) formData.append("event_date", form.event_date);
    if (form.price !== "") formData.append("price", String(Number(form.price)));
    if (form.payment_method) formData.append("payment_method", form.payment_method);

    await api.post("/events", formData, {
      headers: { "Content-Type": "multipart/form-data" }
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
      has_ticket_sales: false,
      kyc_submission_id: ""
    });

    if (fileInputRef.current) fileInputRef.current.value = "";

    await load();

    toast.success(
      form.has_ticket_sales
        ? "Event submitted successfully for review."
        : "Event published successfully."
    );
  } catch (err) {
    console.error("Failed to publish event:", err);
    const msg =
      err?.response?.data?.detail ||
      err?.message ||
      "Failed to publish event.";
    setError(msg);
    toast.error(msg);
  } finally {
    setPublishing(false);
  }
};

  const handleDecay = async () => {
    try {
      await api.post("/stars/decay");
      await load();
      toast.success("Star decay recalculated.");
    } catch (err) {
      console.error("Decay recalculation failed:", err);
      setError("Failed to recalculate star decay.");
      toast.error("Failed to recalculate star decay.");
    }
  };

  const handleCashout = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/transactions/withdraw/initiate", {
        amount: Number(cashout.amount),
        provider: cashout.provider,
        destination_reference: cashout.destination_reference,
        mfa_method: cashout.mfa_method
      });

      setWithdrawalChallenge(res.data);
      setOtpCode("");
      toast.info("Verification code sent.");
    } catch (err) {
      console.error("Cashout failed:", err);
      const msg = err?.response?.data?.detail || "Cashout request failed.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!withdrawalChallenge?.challenge_id) return;

    try {
      setVerifyingOtp(true);

      await api.post("/transactions/withdraw/verify", {
        challenge_id: withdrawalChallenge.challenge_id,
        code: otpCode
      });

      setWithdrawalChallenge(null);
      setOtpCode("");
      await load();
      toast.success("Withdrawal verified successfully.");
    } catch (err) {
      console.error("OTP verification failed:", err);
      const msg = err?.response?.data?.detail || "OTP verification failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
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
      has_ticket_sales: false
    });
  };

  const handleSaveEvent = async (eventId) => {
    setError("");
    setActionLoadingId(eventId);

    try {
      if (editForm.has_ticket_sales && !hasApprovedKyc) {
        throw new Error(
          hasPendingKyc
            ? "Your KYC has been submitted for review. Wait for admin approval before enabling ticket sales."
            : "KYC is still in progress. Complete it before enabling ticket sales."
        );
      }

      await api.put(`/events/${eventId}`, {
        ...editForm,
        category: editForm.category || null,
        event_date: editForm.event_date || null,
        price: editForm.price === "" ? null : Number(editForm.price),
        payment_method: editForm.payment_method || null
      });

      setEditingEventId(null);
      await load();
      toast.success("Event updated successfully.");
    } catch (err) {
      console.error("Event update failed:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to update event.";
      setError(msg);
      toast.error(msg);
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
      if (editingEventId === eventId) setEditingEventId(null);
      await load();
      toast.success("Event deleted successfully.");
    } catch (err) {
      console.error("Event delete failed:", err);
      const msg = err?.response?.data?.detail || "Failed to delete event.";
      setError(msg);
      toast.error(msg);
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
          value={kycDisplayStatus}
          description={
            hasApprovedKyc
              ? "Approved — you can publish ticketed events."
              : hasPendingKyc
              ? "Submitted for Review — waiting for admin approval."
              : "In Progress — complete your KYC to unlock ticket sales."
          }
        />
      </div>

      {hasPendingKyc ? (
        <StatusBanner
          variant="info"
          title="Submitted for Review"
          message="Your KYC has been submitted for review. Ticket sales will be unlocked after admin approval."
        />
      ) : null}

      {!hasApprovedKyc && !hasPendingKyc ? (
        <StatusBanner
          variant="warning"
          title="In Progress"
          message="Complete KYC before publishing ticketed events."
        />
      ) : null}

      {hasApprovedKyc ? (
        <StatusBanner
          variant="success"
          title="Success"
          message="Your KYC is approved. You can publish ticketed events."
        />
      ) : null}

      <div className="grid grid-2">
        <PageSection
          title="Post an Event"
          subtitle="Create a polished listing that is easy to discover and trust."
        >
          <form className="grid grid-2" onSubmit={handleCreate}>
            <input
              className="input"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <input
              className="input"
              placeholder="Location name"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />

            <textarea
              className="input"
              placeholder="Event description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              style={{ gridColumn: "1 / -1" }}
              required
            />

            <input
              className="input"
              placeholder="Poster URL (optional)"
              value={form.poster_url}
              onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
            />

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Upload poster</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handlePosterFileChange}
              />
            </div>

            <input
              className="input"
              placeholder="Google Map link"
              value={form.google_map_link}
              onChange={(e) => setForm({ ...form, google_map_link: e.target.value })}
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

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.has_ticket_sales}
                onChange={(e) => setForm({ ...form, has_ticket_sales: e.target.checked })}
              />
              <span>Sell Tickets</span>
            </label>

            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              disabled={!form.has_ticket_sales}
            />

            <select
              className="select"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              disabled={!form.has_ticket_sales}
            >
              <option value="">Select payment method</option>
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            {form.has_ticket_sales && (
  <select
    className="select"
    value={form.kyc_submission_id}
    onChange={(e) =>
      setForm({ ...form, kyc_submission_id: e.target.value })
    }
  >
    <option value="">Select approved organisation</option>

    {approvedKycSubmissions.map((kyc) => (
      <option key={kyc.id} value={kyc.id}>
        {kyc.business_name ||
          kyc.trading_name ||
          kyc.business_registration_number ||
          `Approved KYC #${kyc.id}`}
      </option>
    ))}
  </select>
)}

            <button className="btn" type="submit" disabled={publishing} style={{ gridColumn: "1 / -1" }}>
              {publishing ? "Publishing..." : "Publish Event"}
            </button>
          </form>
        </PageSection>

        <PageSection
          title="Withdraw Funds"
          subtitle="Withdraw earnings with OTP verification."
        >
          <form className="grid" style={{ gap: 12 }} onSubmit={handleCashout}>
            <input
              className="input"
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount"
              value={cashout.amount}
              onChange={(e) => setCashout({ ...cashout, amount: e.target.value })}
              required
            />

            <input
              className="input"
              placeholder="Destination reference"
              value={cashout.destination_reference}
              onChange={(e) => setCashout({ ...cashout, destination_reference: e.target.value })}
              required
            />

            <select
              className="select"
              value={cashout.provider}
              onChange={(e) => setCashout({ ...cashout, provider: e.target.value })}
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
            </select>

            <select
              className="select"
              value={cashout.mfa_method}
              onChange={(e) => setCashout({ ...cashout, mfa_method: e.target.value })}
            >
              {MFA_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {method.toUpperCase()} OTP
                </option>
              ))}
            </select>

            <button className="btn" type="submit">
              Initiate Withdrawal
            </button>
          </form>

          {withdrawalChallenge ? (
            <form className="grid" style={{ gap: 12, marginTop: 18 }} onSubmit={handleVerifyOtp}>
              <input
                className="input"
                placeholder="Enter OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />
              <button className="btn" type="submit" disabled={verifyingOtp}>
                {verifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          ) : null}
        </PageSection>
      </div>

      <PageSection
        title="KYC"
        subtitle="Complete your KYC profile to unlock ticket sales and withdrawals."
      >
        <KycWizard onStatusChange={load} />
      </PageSection>

      <PageSection
        title="My Events"
        subtitle="Manage your published and draft event listings."
      >
        <div className="grid grid-3" style={{ marginBottom: 16 }}>
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
            icon="📅"
            title="No matching events"
            message="Create an event or adjust your filters."
          />
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {filteredMyEvents.map((event) => (
              <div key={event.id} className="card" style={{ padding: 18 }}>
                {editingEventId === event.id ? (
                  <>
                    <div className="grid grid-2" style={{ gap: 12 }}>
                      <input
                        className="input"
                        placeholder="Title"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
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

                      <textarea
                        className="input"
                        placeholder="Description"
                        rows={4}
                        style={{ gridColumn: "1 / -1" }}
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({ ...editForm, description: e.target.value })
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
                        <span>Enable ticket sales</span>
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
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ marginTop: 0, marginBottom: 8 }}>{event.title}</h3>
                        <p style={{ color: "var(--muted)", margin: 0 }}>
                          {event.location_name || "Location TBA"} • {event.event_date || "Date TBA"}
                        </p>
                        <div style={{ marginTop: 10 }}>
                          <span className="badge">{event.approval_status}</span>
                          {!event.is_live ? <span className="badge">Not live</span> : null}
                        </div>
                      </div>

                      <CtaGroup>
                        <button className="btn btn-secondary" type="button" onClick={() => startEditingEvent(event)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={actionLoadingId === event.id}
                        >
                          Delete
                        </button>
                      </CtaGroup>
                    </div>

                    {event.poster_url ? (
                      <img
                        src={resolvePosterUrl(event.poster_url)}
                        alt={event.title}
                        style={{
                          width: "100%",
                          maxHeight: 240,
                          objectFit: "cover",
                          borderRadius: 16,
                          marginTop: 14
                        }}
                      />
                    ) : null}
                  </>
                )}
              </div>
            ))}
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
          <div className="grid" style={{ gap: 14 }}>
            {transactions.map((tx) => (
              <div key={tx.id} className="card" style={{ padding: 16 }}>
                <strong>{tx.tx_type}</strong>
                <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                  {tx.provider} • KES {tx.gross_amount} • {tx.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}