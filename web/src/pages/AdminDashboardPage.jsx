import React, { useEffect, useMemo, useState } from "react";

import api from "../api/client";
import useToast from "../hooks/useToast";

import CtaGroup from "../components/ui/CtaGroup";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import PageSection from "../components/ui/PageSection";
import StatusBanner from "../components/ui/StatusBanner";

const PAYMENT_METHOD_OPTIONS = ["M-Pesa", "Bank", "Card", "MoMo"];

const KYC_FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending only" },
  { key: "rejected", label: "Rejected" },
  { key: "draft_archived", label: "Draft / Archived" },
  { key: "approved", label: "Approved history" }
];

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function StatusBadge({ children }) {
  return (
    <span
      className="badge"
      style={{
        display: "inline-block",
        marginRight: 8,
        marginBottom: 6
      }}
    >
      {children}
    </span>
  );
}

function DocumentSummaryCard({ summary }) {
  if (!summary) return null;

  return (
    <div
      className="card"
      style={{
        padding: 12,
        background: "rgba(255,255,255,0.03)",
        boxShadow: "none"
      }}
    >
      <strong>Document Completeness</strong>

      <div style={{ marginTop: 10 }}>
        <StatusBadge>Total Docs: {summary.total_documents}</StatusBadge>
        <StatusBadge>Identity: {summary.has_identity_document ? "Yes" : "No"}</StatusBadge>
        <StatusBadge>Proof of Address: {summary.has_proof_of_address ? "Yes" : "No"}</StatusBadge>
        <StatusBadge>Selfie: {summary.has_selfie ? "Yes" : "No"}</StatusBadge>
        <StatusBadge>Business Docs: {summary.business_supporting_docs_count}</StatusBadge>
        <StatusBadge>Completeness: {summary.completeness_label}</StatusBadge>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const toast = useToast();

  const [pendingEvents, setPendingEvents] = useState([]);
  const [kycQueue, setKycQueue] = useState([]);
  const [expandedKycUserId, setExpandedKycUserId] = useState(null);
  const [kycFilter, setKycFilter] = useState("all");
  const [analytics, setAnalytics] = useState(null);

  const [featuredPromotion, setFeaturedPromotion] = useState({
    image_url: "",
    click_url: "",
    title: "",
    text: ""
  });

  const [logFile, setLogFile] = useState(null);
  const [logKeyword, setLogKeyword] = useState("FAILED LOGIN");
  const [logResults, setLogResults] = useState([]);
  const [analyzingLogs, setAnalyzingLogs] = useState(false);

  const [error, setError] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState("");

  const [approvalForms, setApprovalForms] = useState({});

  const load = async () => {
    try {
      setError("");

      const [eventRes, kycQueueRes, analyticsRes, promoRes] = await Promise.all([
        api.get("/admin/events/pending"),
        api.get("/admin/kyc/review-queue"),
        api.get("/admin/analytics/summary"),
        api.get("/featured-promotion/active")
      ]);

      const eventItems = eventRes.data || [];
      const kycItems = kycQueueRes.data || [];

      setPendingEvents(eventItems);
      setKycQueue(kycItems);
      setAnalytics(analyticsRes.data || null);

      if (promoRes.data) {
        setFeaturedPromotion({
          image_url: promoRes.data.image_url || "",
          click_url: promoRes.data.click_url || "",
          title: promoRes.data.title || "",
          text: promoRes.data.text || ""
        });
      }

      const nextForms = {};
      eventItems.forEach((event) => {
        nextForms[event.id] = {
          payment_link: event.payment_link || "",
          price:
            event.price !== null && event.price !== undefined
              ? String(event.price)
              : "",
          payment_method: event.payment_method || ""
        };
      });
      setApprovalForms(nextForms);
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
      const msg =
        err?.response?.data?.detail || "Failed to load admin review queues.";
      setError(msg);
      toast.error(msg);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateApprovalForm = (eventId, field, value) => {
    setApprovalForms((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value
      }
    }));
  };

  const approveKyc = async (submissionId) => {
    const key = `kyc-approve-${submissionId}`;
    setActionLoadingKey(key);

    try {
      await api.post(`/admin/kyc/${submissionId}/approve`, {
        review_notes: "Approved by admin"
      });
      await load();
      toast.success("KYC approved successfully.");
    } catch (err) {
      console.error("Failed to approve KYC:", err);
      const msg = err?.response?.data?.detail || "Failed to approve KYC.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoadingKey("");
    }
  };

  const rejectKyc = async (submissionId) => {
    const notes = window.prompt("Enter rejection reason for this KYC submission:");
    if (notes === null) return;

    const key = `kyc-reject-${submissionId}`;
    setActionLoadingKey(key);

    try {
      await api.post(`/admin/kyc/${submissionId}/reject`, {
        review_notes: notes
      });
      await load();
      toast.success("KYC rejected successfully.");
    } catch (err) {
      console.error("Failed to reject KYC:", err);
      const msg = err?.response?.data?.detail || "Failed to reject KYC.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoadingKey("");
    }
  };

  const approveEvent = async (eventId) => {
    const key = `event-approve-${eventId}`;
    setActionLoadingKey(key);
    setError("");

    try {
      const form = approvalForms[eventId] || {
        payment_link: "",
        price: "",
        payment_method: ""
      };

      const event = pendingEvents.find((item) => item.id === eventId);
      if (event?.has_ticket_sales && !form.payment_link.trim()) {
        throw new Error("A payment link is required before approving a ticketed event.");
      }

      await api.post(`/admin/events/${eventId}/approve`, {
        payment_link: form.payment_link.trim() || null,
        price: form.price === "" ? null : Number(form.price),
        payment_method: form.payment_method || null
      });

      await load();
      toast.success("Event approved successfully.");
    } catch (err) {
      console.error("Failed to approve event:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to approve event.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoadingKey("");
    }
  };

  const rejectEvent = async (eventId) => {
    const notes = window.prompt("Enter rejection reason for this event:");
    if (notes === null) return;

    const key = `event-reject-${eventId}`;
    setActionLoadingKey(key);

    try {
      await api.post(`/admin/events/${eventId}/reject`, {
        review_notes: notes
      });
      await load();
      toast.success("Event rejected successfully.");
    } catch (err) {
      console.error("Failed to reject event:", err);
      const msg = err?.response?.data?.detail || "Failed to reject event.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoadingKey("");
    }
  };

  const handleSaveFeaturedPromotion = async (e) => {
    e.preventDefault();

    try {
      await api.put("/featured-promotion/active", featuredPromotion);
      toast.success("Featured promotion updated.");
      await load();
    } catch (err) {
      console.error("Failed to update featured promotion:", err);
      const msg = err?.response?.data?.detail || "Failed to update featured promotion.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleAnalyzeLogs = async (e) => {
    e.preventDefault();
    if (!logFile) {
      toast.error("Please choose a log file first.");
      return;
    }

    try {
      setAnalyzingLogs(true);

      const formData = new FormData();
      formData.append("file", logFile);

      const res = await api.post(
        `/admin/logs/analyze?keyword=${encodeURIComponent(logKeyword || "")}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      setLogResults(res.data.items || []);
      toast.success(`Log analysis complete. ${res.data.matches || 0} matches found.`);
    } catch (err) {
      console.error("Log analysis failed:", err);
      const msg = err?.response?.data?.detail || "Failed to analyze logs.";
      setError(msg);
      toast.error(msg);
    } finally {
      setAnalyzingLogs(false);
    }
  };

  const sortedKycQueue = useMemo(() => [...kycQueue], [kycQueue]);

  const filteredKycQueue = useMemo(() => {
    switch (kycFilter) {
      case "pending":
        return sortedKycQueue.filter(
          (item) =>
            item.latest_status === "pending" ||
            item.pending_attempts_count > 0
        );

      case "rejected":
        return sortedKycQueue.filter(
          (item) =>
            item.latest_status === "rejected" ||
            item.rejected_attempts_count > 0
        );

      case "draft_archived":
        return sortedKycQueue.filter(
          (item) =>
            item.latest_status === "draft" ||
            item.latest_status === "archived" ||
            item.draft_attempts_count > 0 ||
            item.archived_attempts_count > 0
        );

      case "approved":
        return sortedKycQueue.filter(
          (item) =>
            item.latest_status === "approved" ||
            item.approved_attempts_count > 0
        );

      default:
        return sortedKycQueue;
    }
  }, [sortedKycQueue, kycFilter]);

  const activeTabLabel =
    KYC_FILTER_TABS.find((tab) => tab.key === kycFilter)?.label || "All";

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <section className="page-header-bar">
        <div>
          <h1 style={{ margin: 0 }}>Admin Review Portal</h1>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Review KYC, manage events, update promotions, and analyze security logs.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </section>

      {error ? (
        <StatusBanner variant="error" title="Admin issue" message={error} />
      ) : null}

      {analytics ? (
        <div className="grid grid-4">
          <MetricCard title="Users" value={analytics.users_total} description="Total platform users" />
          <MetricCard title="Events" value={analytics.events_total} description="Total events" />
          <MetricCard title="Pending Events" value={analytics.events_pending} description="Awaiting review" />
          <MetricCard title="Pending KYC" value={analytics.kyc_pending} description="Awaiting approval" />
        </div>
      ) : null}

      <PageSection
        title="Featured Promotion"
        subtitle="Manage the promotional banner shown on the events page."
      >
        <form className="grid grid-2" onSubmit={handleSaveFeaturedPromotion}>
          <input
            className="input"
            placeholder="Image URL"
            value={featuredPromotion.image_url}
            onChange={(e) =>
              setFeaturedPromotion({ ...featuredPromotion, image_url: e.target.value })
            }
            required
          />

          <input
            className="input"
            placeholder="Click URL"
            value={featuredPromotion.click_url}
            onChange={(e) =>
              setFeaturedPromotion({ ...featuredPromotion, click_url: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Title"
            value={featuredPromotion.title}
            onChange={(e) =>
              setFeaturedPromotion({ ...featuredPromotion, title: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Text"
            value={featuredPromotion.text}
            onChange={(e) =>
              setFeaturedPromotion({ ...featuredPromotion, text: e.target.value })
            }
          />

          <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>
            Save Featured Promotion
          </button>
        </form>
      </PageSection>

      <PageSection
        title="Cybersecurity Log Analysis"
        subtitle="Upload and scan server logs for suspicious activity."
      >
        <form className="grid grid-2" onSubmit={handleAnalyzeLogs}>
          <input
            className="input"
            type="file"
            accept=".log,.txt"
            onChange={(e) => setLogFile(e.target.files?.[0] || null)}
            required
          />

          <input
            className="input"
            placeholder='Keyword (e.g. "FAILED LOGIN")'
            value={logKeyword}
            onChange={(e) => setLogKeyword(e.target.value)}
          />

          <button className="btn" type="submit" disabled={analyzingLogs} style={{ gridColumn: "1 / -1" }}>
            {analyzingLogs ? "Analyzing..." : "Analyze Logs"}
          </button>
        </form>

        {logResults.length > 0 ? (
          <div className="grid" style={{ gap: 12, marginTop: 18 }}>
            {logResults.map((item, index) => (
              <div key={`${item.timestamp || "na"}-${index}`} className="card" style={{ padding: 14 }}>
                <strong>{item.category || "unknown"}</strong>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>
                  {item.timestamp || "No timestamp"}
                </div>
                <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, overflowX: "auto" }}>
                  {item.line}
                </pre>
              </div>
            ))}
          </div>
        ) : null}
      </PageSection>

      <PageSection
        title="KYC Review Queue"
        subtitle={`Filtered view: ${activeTabLabel}`}
        actions={
          <div className="quick-tabs">
            {KYC_FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`quick-tab ${kycFilter === tab.key ? "active" : ""}`}
                type="button"
                onClick={() => setKycFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      >
        {filteredKycQueue.length === 0 ? (
          <EmptyState
            icon="🛂"
            title="No KYC attempts match the selected filter"
            message="Try another queue view or refresh the page."
          />
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {filteredKycQueue.map((userKyc) => {
              const expanded = expandedKycUserId === userKyc.user_id;
              const latestPendingHistoryItem =
                userKyc.history.find((item) => item.status === "pending") ||
                userKyc.history[0];

              return (
                <div key={userKyc.user_id} className="card" style={{ padding: 18, boxShadow: "none" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap"
                    }}
                  >
                    <div>
                      <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                        {userKyc.username || `User #${userKyc.user_id}`}
                      </h3>

                      <p style={{ margin: 0, color: "var(--muted)" }}>
                        {userKyc.email}
                      </p>

                      <div style={{ marginTop: 10 }}>
                        <StatusBadge>Latest: {userKyc.latest_status}</StatusBadge>
                        <StatusBadge>Progress: {userKyc.latest_progress_percentage}%</StatusBadge>
                        <StatusBadge>Attempts: {userKyc.attempts_count}</StatusBadge>
                      </div>
                    </div>

                    <CtaGroup>
                      {latestPendingHistoryItem ? (
                        <>
                          <button
                            className="btn"
                            type="button"
                            disabled={actionLoadingKey === `kyc-approve-${latestPendingHistoryItem.id}`}
                            onClick={() => approveKyc(latestPendingHistoryItem.id)}
                          >
                            Approve
                          </button>

                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={actionLoadingKey === `kyc-reject-${latestPendingHistoryItem.id}`}
                            onClick={() => rejectKyc(latestPendingHistoryItem.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() =>
                          setExpandedKycUserId(expanded ? null : userKyc.user_id)
                        }
                      >
                        {expanded ? "Hide History" : "Show History"}
                      </button>
                    </CtaGroup>
                  </div>

                  {expanded ? (
                    <div className="grid" style={{ gap: 12, marginTop: 16 }}>
                      {userKyc.history.map((historyItem) => (
                        <div key={historyItem.id} className="card" style={{ padding: 14, boxShadow: "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <strong>Submission #{historyItem.id}</strong>
                            <span style={{ color: "var(--muted)" }}>
                              {formatDateTime(historyItem.last_updated_at)}
                            </span>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <StatusBadge>Status: {historyItem.status}</StatusBadge>
                            <StatusBadge>Progress: {historyItem.progress_percentage}%</StatusBadge>
                          </div>

                          {historyItem.review_notes ? (
                            <p style={{ marginTop: 12, color: "var(--muted)" }}>
                              {historyItem.review_notes}
                            </p>
                          ) : null}

                          <DocumentSummaryCard summary={historyItem.document_summary} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Pending Event Approval"
        subtitle="Approve ticketed events after verification."
      >
        {pendingEvents.length === 0 ? (
          <EmptyState
            icon="🎫"
            title="No pending events"
            message="All ticketed events are currently reviewed."
          />
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {pendingEvents.map((event) => {
              const form = approvalForms[event.id] || {
                payment_link: "",
                price: "",
                payment_method: ""
              };

              return (
                <div key={event.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ marginTop: 0, marginBottom: 8 }}>{event.title}</h3>
                      <p style={{ margin: 0, color: "var(--muted)" }}>
                        Owner: {event.owner_username || "Unknown"}
                      </p>
                    </div>

                    <CtaGroup>
                      <button
                        className="btn"
                        type="button"
                        disabled={actionLoadingKey === `event-approve-${event.id}`}
                        onClick={() => approveEvent(event.id)}
                      >
                        Approve
                      </button>

                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={actionLoadingKey === `event-reject-${event.id}`}
                        onClick={() => rejectEvent(event.id)}
                      >
                        Reject
                      </button>
                    </CtaGroup>
                  </div>

                  <div className="grid grid-3" style={{ marginTop: 14 }}>
                    <input
                      className="input"
                      placeholder="Payment link"
                      value={form.payment_link}
                      onChange={(e) => updateApprovalForm(event.id, "payment_link", e.target.value)}
                    />

                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={form.price}
                      onChange={(e) => updateApprovalForm(event.id, "price", e.target.value)}
                    />

                    <select
                      className="select"
                      value={form.payment_method}
                      onChange={(e) => updateApprovalForm(event.id, "payment_method", e.target.value)}
                    >
                      <option value="">Select payment method</option>
                      {PAYMENT_METHOD_OPTIONS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>
    </div>
  );
}