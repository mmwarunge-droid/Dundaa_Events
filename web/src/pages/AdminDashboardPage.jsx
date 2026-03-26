import React, { useEffect, useMemo, useState } from "react";

import api from "../api/client";

import CtaGroup from "../components/ui/CtaGroup";
import EmptyState from "../components/ui/EmptyState";
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
  const [pendingEvents, setPendingEvents] = useState([]);
  const [kycQueue, setKycQueue] = useState([]);
  const [expandedKycUserId, setExpandedKycUserId] = useState(null);
  const [kycFilter, setKycFilter] = useState("all");

  const [error, setError] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState("");

  const [approvalForms, setApprovalForms] = useState({});

  const load = async () => {
    try {
      setError("");

      const [eventRes, kycQueueRes] = await Promise.all([
        api.get("/admin/events/pending"),
        api.get("/admin/kyc/review-queue")
      ]);

      const eventItems = eventRes.data || [];
      const kycItems = kycQueueRes.data || [];

      setPendingEvents(eventItems);
      setKycQueue(kycItems);

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
      setError(
        err?.response?.data?.detail || "Failed to load admin review queues."
      );
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
    } catch (err) {
      console.error("Failed to approve KYC:", err);
      setError(err?.response?.data?.detail || "Failed to approve KYC.");
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
    } catch (err) {
      console.error("Failed to reject KYC:", err);
      setError(err?.response?.data?.detail || "Failed to reject KYC.");
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
    } catch (err) {
      console.error("Failed to approve event:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to approve event."
      );
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
    } catch (err) {
      console.error("Failed to reject event:", err);
      setError(err?.response?.data?.detail || "Failed to reject event.");
    } finally {
      setActionLoadingKey("");
    }
  };

  const sortedKycQueue = useMemo(() => {
    return [...kycQueue];
  }, [kycQueue]);

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
            Review KYC attempts, validate documents, and approve ticketed events.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </section>

      {error ? (
        <StatusBanner variant="error" title="Admin issue" message={error} />
      ) : null}

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
                <div
                  key={userKyc.user_id}
                  className="card"
                  style={{ padding: 18, boxShadow: "none" }}
                >
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

                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Email:</strong> {userKyc.email || "N/A"}
                      </p>
                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Latest Status:</strong> {userKyc.latest_status || "N/A"}
                      </p>
                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Latest Progress:</strong> {userKyc.latest_progress_percentage || 0}%
                      </p>
                    </div>

                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() =>
                        setExpandedKycUserId(expanded ? null : userKyc.user_id)
                      }
                    >
                      {expanded ? "Hide History" : "View History"}
                    </button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <StatusBadge>Attempts: {userKyc.attempts_count}</StatusBadge>
                    <StatusBadge>Pending: {userKyc.pending_attempts_count}</StatusBadge>
                    <StatusBadge>Approved: {userKyc.approved_attempts_count}</StatusBadge>
                    <StatusBadge>Rejected: {userKyc.rejected_attempts_count}</StatusBadge>
                    <StatusBadge>Drafts: {userKyc.draft_attempts_count}</StatusBadge>
                    <StatusBadge>Archived: {userKyc.archived_attempts_count}</StatusBadge>
                  </div>

                  <div
                    className="card"
                    style={{
                      padding: 12,
                      marginTop: 12,
                      background: "#fffaf5",
                      borderColor: "rgba(255,107,0,0.12)",
                      boxShadow: "none"
                    }}
                  >
                    <p style={{ margin: "0 0 6px" }}>
                      <strong>Latest Submitted:</strong> {formatDateTime(userKyc.latest_submitted_at)}
                    </p>
                    <p style={{ margin: "0 0 6px" }}>
                      <strong>Latest Reviewed:</strong> {formatDateTime(userKyc.latest_reviewed_at)}
                    </p>
                    <p style={{ margin: "0 0 6px" }}>
                      <strong>Latest Updated:</strong> {formatDateTime(userKyc.latest_last_updated_at)}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Latest Review Notes:</strong> {userKyc.latest_review_notes || "None"}
                    </p>
                  </div>

                  {latestPendingHistoryItem ? (
                    <div style={{ marginTop: 14 }}>
                      <DocumentSummaryCard summary={latestPendingHistoryItem.document_summary} />
                    </div>
                  ) : null}

                  {latestPendingHistoryItem?.status === "pending" ? (
                    <CtaGroup style={{ marginTop: 16 }}>
                      <button
                        className="btn"
                        onClick={() => approveKyc(latestPendingHistoryItem.id)}
                        disabled={actionLoadingKey === `kyc-approve-${latestPendingHistoryItem.id}`}
                      >
                        {actionLoadingKey === `kyc-approve-${latestPendingHistoryItem.id}`
                          ? "Approving..."
                          : "Approve Latest Pending"}
                      </button>

                      <button
                        className="btn btn-secondary"
                        onClick={() => rejectKyc(latestPendingHistoryItem.id)}
                        disabled={actionLoadingKey === `kyc-reject-${latestPendingHistoryItem.id}`}
                      >
                        {actionLoadingKey === `kyc-reject-${latestPendingHistoryItem.id}`
                          ? "Rejecting..."
                          : "Reject Latest Pending"}
                      </button>
                    </CtaGroup>
                  ) : null}

                  {expanded ? (
                    <div style={{ marginTop: 18 }}>
                      <h4 style={{ marginTop: 0 }}>KYC Progress History</h4>

                      <div className="grid" style={{ gap: 12 }}>
                        {userKyc.history.map((item) => (
                          <div
                            key={item.id}
                            className="card"
                            style={{
                              padding: 14,
                              boxShadow: "none",
                              borderColor: "rgba(17,17,17,0.08)"
                            }}
                          >
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                              <StatusBadge>Submission #{item.id}</StatusBadge>
                              <StatusBadge>Status: {item.status}</StatusBadge>
                              <StatusBadge>Progress: {item.progress_percentage}%</StatusBadge>
                              <StatusBadge>Entity: {item.entity_type}</StatusBadge>
                            </div>

                            <p style={{ margin: "0 0 6px" }}>
                              <strong>Last Updated:</strong> {formatDateTime(item.last_updated_at)}
                            </p>
                            <p style={{ margin: "0 0 6px" }}>
                              <strong>Submitted At:</strong> {formatDateTime(item.submitted_at)}
                            </p>
                            <p style={{ margin: "0 0 6px" }}>
                              <strong>Reviewed At:</strong> {formatDateTime(item.reviewed_at)}
                            </p>
                            <p style={{ margin: "0 0 6px" }}>
                              <strong>Archived At:</strong> {formatDateTime(item.archived_at)}
                            </p>
                            <p style={{ margin: "0 0 10px" }}>
                              <strong>Review Notes:</strong> {item.review_notes || "None"}
                            </p>

                            <DocumentSummaryCard summary={item.document_summary} />

                            {item.documents?.length ? (
                              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                                {item.documents.map((doc) => (
                                  <a
                                    key={doc.id}
                                    href={`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}${doc.file_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary"
                                    style={{ width: "fit-content" }}
                                  >
                                    {doc.document_type} — Open
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <EmptyState
                                icon="📄"
                                title="No documents uploaded"
                                message="This KYC attempt does not have supporting files yet."
                              />
                            )}

                            {item.status === "pending" ? (
                              <CtaGroup style={{ marginTop: 14 }}>
                                <button
                                  className="btn"
                                  onClick={() => approveKyc(item.id)}
                                  disabled={actionLoadingKey === `kyc-approve-${item.id}`}
                                >
                                  {actionLoadingKey === `kyc-approve-${item.id}` ? "Approving..." : "Approve"}
                                </button>

                                <button
                                  className="btn btn-secondary"
                                  onClick={() => rejectKyc(item.id)}
                                  disabled={actionLoadingKey === `kyc-reject-${item.id}`}
                                >
                                  {actionLoadingKey === `kyc-reject-${item.id}` ? "Rejecting..." : "Reject"}
                                </button>
                              </CtaGroup>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Pending Ticketed Events"
        subtitle="Approve public ticket visibility only after payment details are ready."
      >
        {pendingEvents.length === 0 ? (
          <EmptyState
            icon="🎫"
            title="No pending ticketed events"
            message="There are no event approvals waiting for action right now."
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
                <div key={event.id} className="card" style={{ padding: 16, boxShadow: "none" }}>
                  <h3 style={{ marginTop: 0 }}>{event.title}</h3>
                  <p><strong>Owner:</strong> {event.owner_username || `User #${event.owner_id}`}</p>
                  <p><strong>Location:</strong> {event.location_name || "N/A"}</p>
                  <p><strong>Category:</strong> {event.category || "N/A"}</p>
                  <p><strong>Date:</strong> {event.event_date || "N/A"}</p>
                  <p><strong>Ticket Sales:</strong> {event.has_ticket_sales ? "Yes" : "No"}</p>
                  <p><strong>Status:</strong> {event.approval_status}</p>
                  <p><strong>Description:</strong> {event.description}</p>

                  <div
                    className="card"
                    style={{
                      gap: 10,
                      marginTop: 14,
                      padding: 14,
                      background: "#fffaf5",
                      borderColor: "rgba(255,107,0,0.12)",
                      boxShadow: "none"
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>Approval Details</h4>

                    <div className="grid" style={{ gap: 10 }}>
                      <input
                        className="input"
                        placeholder="Payment link (required for ticketed events)"
                        value={form.payment_link}
                        onChange={(e) =>
                          updateApprovalForm(event.id, "payment_link", e.target.value)
                        }
                      />

                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Approved price"
                        value={form.price}
                        onChange={(e) =>
                          updateApprovalForm(event.id, "price", e.target.value)
                        }
                      />

                      <select
                        className="select"
                        value={form.payment_method}
                        onChange={(e) =>
                          updateApprovalForm(event.id, "payment_method", e.target.value)
                        }
                      >
                        <option value="">Select payment method</option>
                        {PAYMENT_METHOD_OPTIONS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>

                      <p style={{ color: "var(--muted)", margin: 0 }}>
                        Payment link appears publicly only after the event is approved and live.
                      </p>
                    </div>
                  </div>

                  <CtaGroup style={{ marginTop: 16 }}>
                    <button
                      className="btn"
                      onClick={() => approveEvent(event.id)}
                      disabled={actionLoadingKey === `event-approve-${event.id}`}
                    >
                      {actionLoadingKey === `event-approve-${event.id}` ? "Approving..." : "Approve Event"}
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => rejectEvent(event.id)}
                      disabled={actionLoadingKey === `event-reject-${event.id}`}
                    >
                      {actionLoadingKey === `event-reject-${event.id}` ? "Rejecting..." : "Reject Event"}
                    </button>
                  </CtaGroup>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>
    </div>
  );
}