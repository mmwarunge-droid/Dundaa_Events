import React, { useEffect, useMemo, useState } from "react";

import api from "../api/client";

const STEPS = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Business / Organizer" },
  { id: 3, label: "Event Details" },
  { id: 4, label: "Declarations" },
  { id: 5, label: "Documents" }
];

const KYC_DOCUMENT_TYPES = [
  "passport",
  "national_id",
  "drivers_license",
  "selfie",
  "utility_bill",
  "bank_statement",
  "lease_agreement",
  "certificate_of_incorporation",
  "director_id",
  "shareholder_list",
  "bank_verification_statement",
  "venue_agreement",
  "event_permit",
  "insurance",
  "security_plan"
];

const EMPTY_FORM = {
  entity_type: "individual",
  identity_document_type: "national_id",
  phone_number: "",
  email_verified: true,
  phone_verified: false,
  proof_of_address_type: "utility_bill",
  business_name: "",
  trading_name: "",
  business_registration_number: "",
  tax_identification_number: "",
  business_address: "",
  website_or_social: "",
  event_description: "",
  venue_confirmation_text: "",
  event_date_text: "",
  event_location_text: "",
  ticket_pricing_text: "",
  event_category: "",
  accepted_terms: false,
  accepted_anti_fraud: false,
  accepted_aml: false,
  accepted_refund_policy: false
};

export default function KycWizard({ onStatusChange }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeDraft, setActiveDraft] = useState(null);
  const [archivedDrafts, setArchivedDrafts] = useState([]);
  const [progress, setProgress] = useState(0);
  const [missing, setMissing] = useState([]);
  const [kycDocumentType, setKycDocumentType] = useState("national_id");
  const [kycDocumentFile, setKycDocumentFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [recoveringId, setRecoveringId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDraftState = async () => {
    try {
      setLoading(true);
      setError("");

      const [draftRes, progressRes] = await Promise.all([
        api.get("/kyc/draft"),
        api.get("/kyc/progress")
      ]);

      const draftState = draftRes.data;
      setActiveDraft(draftState.active_draft || null);
      setArchivedDrafts(draftState.archived_drafts || []);

      if (draftState.active_draft) {
        const draft = draftState.active_draft;
        setForm({
          ...EMPTY_FORM,
          ...draft
        });
      } else {
        setForm(EMPTY_FORM);
      }

      setProgress(progressRes.data.progress_percentage || 0);
      setMissing(progressRes.data.missing_required_fields || []);

      onStatusChange?.(draftState.active_draft || null);
    } catch (err) {
      console.error("Failed to load KYC draft state:", err);
      setError("Failed to load KYC draft.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraftState();
  }, []);

  const canSubmit = useMemo(() => progress === 100 && missing.length === 0, [progress, missing]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const refreshProgress = async () => {
    try {
      const res = await api.get("/kyc/progress");
      setProgress(res.data.progress_percentage || 0);
      setMissing(res.data.missing_required_fields || []);
    } catch (err) {
      console.error("Failed to refresh KYC progress:", err);
    }
  };

  const saveDraft = async () => {
    try {
      setSavingDraft(true);
      setError("");
      setSuccess("");

      const res = await api.post("/kyc/draft", form);
      setActiveDraft(res.data);
      setSuccess("Draft saved.");

      await refreshProgress();
      onStatusChange?.(res.data);
    } catch (err) {
      console.error("Failed to save KYC draft:", err);
      setError(err?.response?.data?.detail || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDraft().catch(() => {});
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const res = await api.post("/kyc/submissions", form);
      setActiveDraft(res.data);
      setSuccess("KYC submitted for review.");

      await loadDraftState();
      onStatusChange?.(res.data);
    } catch (err) {
      console.error("Failed to submit KYC:", err);

      const detail = err?.response?.data?.detail;
      if (detail?.missing_required_fields) {
        setMissing(detail.missing_required_fields);
        setProgress(detail.progress_percentage || 0);
        setError("KYC is incomplete. Please complete all required fields.");
      } else {
        setError(detail?.message || detail || "Failed to submit KYC.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();

    if (!activeDraft?.id) {
      setError("Save a draft first before uploading documents.");
      return;
    }

    if (!kycDocumentFile) {
      setError("Choose a document file first.");
      return;
    }

    try {
      setUploadingDoc(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("document_type", kycDocumentType);
      formData.append("file", kycDocumentFile);

      await api.post(`/kyc/submissions/${activeDraft.id}/documents`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setKycDocumentFile(null);
      setSuccess("Document uploaded.");
      await loadDraftState();
    } catch (err) {
      console.error("Failed to upload KYC document:", err);
      setError(err?.response?.data?.detail || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const recoverDraft = async (submissionId) => {
    try {
      setRecoveringId(submissionId);
      setError("");
      setSuccess("");

      await api.post(`/kyc/draft/${submissionId}/recover`);
      setSuccess("Archived draft recovered.");
      await loadDraftState();
    } catch (err) {
      console.error("Failed to recover draft:", err);
      setError(err?.response?.data?.detail || "Failed to recover draft.");
    } finally {
      setRecoveringId(null);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <p style={{ color: "var(--muted)", margin: 0 }}>Loading KYC wizard...</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      {error && (
        <div
          className="card"
          style={{
            padding: 14,
            background: "#fff4f4",
            borderColor: "rgba(214,69,69,0.18)",
            boxShadow: "none"
          }}
        >
          <strong style={{ color: "var(--danger)" }}>KYC issue</strong>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{error}</p>
        </div>
      )}

      {success && (
        <div
          className="card"
          style={{
            padding: 14,
            background: "var(--accent-soft)",
            borderColor: "rgba(0,194,168,0.14)",
            boxShadow: "none"
          }}
        >
          <strong style={{ color: "var(--success)" }}>Success</strong>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{success}</p>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>KYC Progress</h2>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Save as draft, resume later, and submit only when complete.
            </p>
          </div>

          <span className="badge">{progress}% Complete</span>
        </div>

        <div
          style={{
            width: "100%",
            height: 12,
            borderRadius: 999,
            background: "rgba(17,17,17,0.08)",
            overflow: "hidden",
            marginTop: 18
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--primary), var(--accent))"
            }}
          />
        </div>

        <div className="quick-tabs" style={{ marginTop: 18 }}>
          {STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`quick-tab ${step === item.id ? "active" : ""}`}
              onClick={() => setStep(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {missing.length > 0 && (
          <div
            className="card"
            style={{
              padding: 14,
              marginTop: 16,
              background: "#fffaf5",
              borderColor: "rgba(255,107,0,0.12)",
              boxShadow: "none"
            }}
          >
            <strong>Missing required fields</strong>
            <div style={{ color: "var(--muted)", marginTop: 8 }}>
              {missing.join(", ")}
            </div>
          </div>
        )}
      </div>

      <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="grid grid-2">
            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Entity Type</label>
              <select
                className="select"
                value={form.entity_type}
                onChange={(e) => handleChange("entity_type", e.target.value)}
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Identity Document Type</label>
              <select
                className="select"
                value={form.identity_document_type}
                onChange={(e) => handleChange("identity_document_type", e.target.value)}
              >
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver’s License</option>
              </select>
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Phone Number</label>
              <input
                className="input"
                placeholder="Phone number"
                value={form.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Proof of Address Type</label>
              <select
                className="select"
                value={form.proof_of_address_type}
                onChange={(e) => handleChange("proof_of_address_type", e.target.value)}
              >
                <option value="utility_bill">Utility Bill</option>
                <option value="bank_statement">Bank Statement</option>
                <option value="lease_agreement">Lease Agreement</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-2">
            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Business Name</label>
              <input
                className="input"
                placeholder="Business name"
                value={form.business_name}
                onChange={(e) => handleChange("business_name", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Trading Name</label>
              <input
                className="input"
                placeholder="Trading name"
                value={form.trading_name}
                onChange={(e) => handleChange("trading_name", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Business Registration Number</label>
              <input
                className="input"
                placeholder="Business registration number"
                value={form.business_registration_number}
                onChange={(e) => handleChange("business_registration_number", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Tax Identification Number</label>
              <input
                className="input"
                placeholder="Tax identification number"
                value={form.tax_identification_number}
                onChange={(e) => handleChange("tax_identification_number", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Business Address</label>
              <input
                className="input"
                placeholder="Business address"
                value={form.business_address}
                onChange={(e) => handleChange("business_address", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Website or Social Media</label>
              <input
                className="input"
                placeholder="Website or social media"
                value={form.website_or_social}
                onChange={(e) => handleChange("website_or_social", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-2">
            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Event Description</label>
              <textarea
                className="textarea"
                placeholder="Event description"
                value={form.event_description}
                onChange={(e) => handleChange("event_description", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Venue Confirmation</label>
              <textarea
                className="textarea"
                placeholder="Venue confirmation / venue agreement summary"
                value={form.venue_confirmation_text}
                onChange={(e) => handleChange("venue_confirmation_text", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Event Date</label>
              <input
                className="input"
                placeholder="Event date"
                value={form.event_date_text}
                onChange={(e) => handleChange("event_date_text", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Event Location</label>
              <input
                className="input"
                placeholder="Event location"
                value={form.event_location_text}
                onChange={(e) => handleChange("event_location_text", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Ticket Pricing</label>
              <input
                className="input"
                placeholder="Ticket pricing"
                value={form.ticket_pricing_text}
                onChange={(e) => handleChange("ticket_pricing_text", e.target.value)}
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Event Category</label>
              <input
                className="input"
                placeholder="Event category"
                value={form.event_category}
                onChange={(e) => handleChange("event_category", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid" style={{ gap: 12 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.accepted_terms}
                onChange={(e) => handleChange("accepted_terms", e.target.checked)}
              />
              <span>I accept the Terms of Service</span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.accepted_anti_fraud}
                onChange={(e) => handleChange("accepted_anti_fraud", e.target.checked)}
              />
              <span>I accept the Anti-fraud Declaration</span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.accepted_aml}
                onChange={(e) => handleChange("accepted_aml", e.target.checked)}
              />
              <span>I accept AML Compliance</span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.accepted_refund_policy}
                onChange={(e) => handleChange("accepted_refund_policy", e.target.checked)}
              />
              <span>I accept the Refund Policy</span>
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="grid" style={{ gap: 14 }}>
            <div
              className="card"
              style={{
                padding: 14,
                background: "#fffaf5",
                borderColor: "rgba(255,107,0,0.12)",
                boxShadow: "none"
              }}
            >
              <strong>Documents</strong>
              <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                Upload documents after saving your draft. Drafts older than 3 days of inactivity are archived, but recoverable.
              </p>
            </div>

            <div className="grid" style={{ gap: 12 }}>
              <div className="grid" style={{ gap: 8 }}>
                <label style={{ fontWeight: 700 }}>Document Type</label>
                <select
                  className="select"
                  value={kycDocumentType}
                  onChange={(e) => setKycDocumentType(e.target.value)}
                >
                  {KYC_DOCUMENT_TYPES.map((docType) => (
                    <option key={docType} value={docType}>
                      {docType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="upload-zone">
                <div className="upload-zone-text">
                  <strong>Upload document file</strong>
                  <span>Accepted: JPG, PNG, PDF, WEBP</span>
                </div>

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.webp"
                  onChange={(e) => setKycDocumentFile(e.target.files?.[0] || null)}
                />

                <div className="upload-file-name">
                  {kycDocumentFile ? kycDocumentFile.name : "No file selected"}
                </div>
              </div>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleUploadDocument}
                disabled={uploadingDoc}
              >
                {uploadingDoc ? "Uploading..." : "Upload Document"}
              </button>
            </div>

            {activeDraft?.documents?.length ? (
              <div className="grid" style={{ gap: 8 }}>
                {activeDraft.documents.map((doc) => (
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
            ) : null}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={saveDraft}
            disabled={savingDraft}
          >
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>

          <button
            className="btn"
            type="submit"
            disabled={submitting || !canSubmit}
          >
            {submitting ? "Submitting..." : "Submit KYC"}
          </button>
        </div>
      </form>

      {archivedDrafts.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Archived drafts</h3>

          <div className="grid" style={{ gap: 12 }}>
            {archivedDrafts.map((draft) => (
              <div
                key={draft.id}
                className="card"
                style={{ padding: 14, boxShadow: "none", borderColor: "rgba(17,17,17,0.08)" }}
              >
                <p><strong>Draft #{draft.id}</strong></p>
                <p><strong>Archived at:</strong> {draft.archived_at || "N/A"}</p>
                <p><strong>Progress:</strong> {draft.progress_percentage}%</p>

                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => recoverDraft(draft.id)}
                  disabled={recoveringId === draft.id}
                >
                  {recoveringId === draft.id ? "Recovering..." : "Recover Draft"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}