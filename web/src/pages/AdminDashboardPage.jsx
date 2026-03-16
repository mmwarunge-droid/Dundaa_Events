import React, { useEffect, useState } from "react";

import api from "../api/client";

/*
AdminDashboardPage
------------------
Phase 2 admin portal foundation.

Current capabilities:
- review pending KYC submissions
- approve / reject KYC
- review pending ticketed events
- approve / reject events
*/

export default function AdminDashboardPage() {
  const [pendingKyc, setPendingKyc] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [error, setError] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState("");

  const load = async () => {
    try {
      setError("");

      const [kycRes, eventRes] = await Promise.all([
        api.get("/admin/kyc/pending"),
        api.get("/admin/events/pending")
      ]);

      setPendingKyc(kycRes.data || []);
      setPendingEvents(eventRes.data || []);
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

    try {
      await api.post(`/admin/events/${eventId}/approve`);
      await load();
    } catch (err) {
      console.error("Failed to approve event:", err);
      setError(err?.response?.data?.detail || "Failed to approve event.");
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

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <section className="page-header-bar">
        <div>
          <h1 style={{ margin: 0 }}>Admin Review Portal</h1>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Review organizer KYC submissions and approve ticketed events before they go live.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </section>

      {error && (
        <p style={{ color: "tomato", margin: 0 }}>
          {error}
        </p>
      )}

      <section className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Pending KYC Submissions</h2>

        {pendingKyc.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No pending KYC submissions.
          </p>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {pendingKyc.map((submission) => (
              <div key={submission.id} className="card" style={{ padding: 16 }}>
                <h3 style={{ marginTop: 0 }}>
                  Submission #{submission.id} — User #{submission.user_id}
                </h3>

                <p><strong>Entity Type:</strong> {submission.entity_type}</p>
                <p><strong>Status:</strong> {submission.status}</p>
                <p><strong>Business Name:</strong> {submission.business_name || "N/A"}</p>
                <p><strong>Phone Verified:</strong> {submission.phone_verified ? "Yes" : "No"}</p>
                <p><strong>Email Verified:</strong> {submission.email_verified ? "Yes" : "No"}</p>
                <p><strong>Event Category:</strong> {submission.event_category || "N/A"}</p>
                <p><strong>Ticket Pricing:</strong> {submission.ticket_pricing_text || "N/A"}</p>
                <p><strong>Review Notes:</strong> {submission.review_notes || "None"}</p>

                <div style={{ marginTop: 12 }}>
                  <strong>Documents</strong>
                  <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                    {submission.documents?.length ? (
                      submission.documents.map((doc) => (
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
                      ))
                    ) : (
                      <p style={{ color: "var(--muted)", margin: 0 }}>
                        No documents uploaded yet.
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                  <button
                    className="btn"
                    onClick={() => approveKyc(submission.id)}
                    disabled={actionLoadingKey === `kyc-approve-${submission.id}`}
                  >
                    {actionLoadingKey === `kyc-approve-${submission.id}` ? "Approving..." : "Approve KYC"}
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => rejectKyc(submission.id)}
                    disabled={actionLoadingKey === `kyc-reject-${submission.id}`}
                  >
                    {actionLoadingKey === `kyc-reject-${submission.id}` ? "Rejecting..." : "Reject KYC"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Pending Ticketed Events</h2>

        {pendingEvents.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No pending events awaiting approval.
          </p>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {pendingEvents.map((event) => (
              <div key={event.id} className="card" style={{ padding: 16 }}>
                <h3 style={{ marginTop: 0 }}>{event.title}</h3>
                <p><strong>Owner:</strong> {event.owner_username || `User #${event.owner_id}`}</p>
                <p><strong>Location:</strong> {event.location_name || "N/A"}</p>
                <p><strong>Category:</strong> {event.category || "N/A"}</p>
                <p><strong>Date:</strong> {event.event_date || "N/A"}</p>
                <p><strong>Ticket Sales:</strong> {event.has_ticket_sales ? "Yes" : "No"}</p>
                <p><strong>Status:</strong> {event.approval_status}</p>
                <p><strong>Description:</strong> {event.description}</p>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}