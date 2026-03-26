import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/client";
import CampaignShareButton from "../components/CampaignShareButton";
import DonateModal from "../components/DonateModal";

export default function CampaignDetailPage() {
  const { id } = useParams();

  const [campaign, setCampaign] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);
  const [error, setError] = useState("");

  const loadCampaign = async () => {
    try {
      setLoading(true);
      setError("");

      const [campaignRes, activityRes] = await Promise.all([
        api.get(`/campaigns/${id}`),
        api.get(`/campaigns/${id}/activity`)
      ]);

      setCampaign(campaignRes.data);
      setActivity(activityRes.data || []);
    } catch (err) {
      console.error("Failed to load campaign:", err);
      setError(err?.response?.data?.detail || "Failed to load fundraiser.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const progress = useMemo(() => {
    return Math.min(Number(campaign?.progress_percentage || 0), 100);
  }, [campaign?.progress_percentage]);

  if (loading) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p style={{ color: "var(--muted)" }}>Loading fundraiser...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p style={{ color: "tomato" }}>{error || "Campaign not found."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="container grid" style={{ gap: 28 }}>
        <section className="market-hero" style={{ alignItems: "start" }}>
          <div className="card" style={{ padding: 24, borderRadius: 28 }}>
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
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
                    "linear-gradient(135deg, rgba(0,194,168,0.10), rgba(255,107,0,0.12))",
                  color: "var(--muted)",
                  fontWeight: 800,
                  fontSize: "1.2rem"
                }}
              >
                Dundaa Fundraiser
              </div>
            )}

            <div className="card-meta">
              <span className="badge">{campaign.campaign_type}</span>
              {campaign.owner_verified && <span className="badge">Verified</span>}
              {campaign.allow_anonymous && <span className="badge">Anonymous donations</span>}
              {campaign.recurring_enabled && <span className="badge">Recurring enabled</span>}
            </div>

            <h1 style={{ marginTop: 10, marginBottom: 10, fontSize: "clamp(2rem, 4vw, 3.2rem)", lineHeight: 1.04 }}>
              {campaign.title}
            </h1>

            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Created by{" "}
              <strong style={{ color: "var(--text)" }}>
                {campaign.owner_username || "Creator"}
              </strong>
            </p>

            <p style={{ fontSize: "1.04rem", lineHeight: 1.7 }}>
              {campaign.description}
            </p>

            {campaign.cause_description && (
              <div
                className="card"
                style={{
                  padding: 16,
                  marginTop: 16,
                  background: "#fffaf5",
                  borderColor: "rgba(255,107,0,0.12)",
                  boxShadow: "none"
                }}
              >
                <strong>Cause</strong>
                <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                  {campaign.cause_description}
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <button className="btn" type="button" onClick={() => setDonateOpen(true)}>
                Donate Now
              </button>

              <CampaignShareButton campaign={campaign} />
            </div>
          </div>

          <div className="market-search-card">
            <h3>Fundraiser snapshot</h3>
            <p>Quick context before you support.</p>

            <div className="grid" style={{ gap: 14 }}>
              <div className="card" style={{ padding: 16, boxShadow: "none" }}>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Raised</div>
                <div className="price-emphasis">KES {campaign.current_amount}</div>
              </div>

              <div className="card" style={{ padding: 16, boxShadow: "none" }}>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Goal</div>
                <div style={{ fontWeight: 800 }}>KES {campaign.goal_amount}</div>
              </div>

              <div className="card" style={{ padding: 16, boxShadow: "none" }}>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Beneficiary</div>
                <div style={{ fontWeight: 800 }}>
                  {campaign.beneficiary_name || campaign.owner_username || "Creator"}
                </div>
              </div>

              {campaign.deadline && (
                <div className="card" style={{ padding: 16, boxShadow: "none" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Deadline</div>
                  <div style={{ fontWeight: 800 }}>{campaign.deadline}</div>
                </div>
              )}

              <div
                className="card"
                style={{
                  padding: 16,
                  background: "var(--accent-soft)",
                  borderColor: "rgba(0,194,168,0.14)",
                  boxShadow: "none"
                }}
              >
                <strong style={{ color: "var(--success)" }}>Why supporting feels safer</strong>
                <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                  Clear donation flow, structured campaign details, and stronger trust signals help supporters act with more confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 24 }}>
          <div className="section-head">
            <div>
              <h2>Progress</h2>
              <p>See how close this fundraiser is to its goal.</p>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div
              style={{
                width: "100%",
                height: 14,
                borderRadius: 999,
                background: "rgba(17,17,17,0.08)",
                overflow: "hidden"
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

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 12
              }}
            >
              <div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Raised</div>
                <div className="price-emphasis">KES {campaign.current_amount}</div>
              </div>

              <div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Goal</div>
                <div style={{ fontWeight: 800 }}>KES {campaign.goal_amount}</div>
              </div>

              <div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Progress</div>
                <div style={{ fontWeight: 800 }}>{campaign.progress_percentage}%</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-2">
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Recent support</h2>
            <p style={{ color: "var(--muted)" }}>
              Real-time donation activity helps build trust and momentum.
            </p>

            {activity.length === 0 ? (
              <p style={{ color: "var(--muted)", margin: 0 }}>
                No donations recorded yet.
              </p>
            ) : (
              <div className="grid" style={{ gap: 12 }}>
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: 14,
                      boxShadow: "none",
                      borderColor: "rgba(17,17,17,0.08)"
                    }}
                  >
                    <strong>{item.donor_display_name}</strong>
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>
                      KES {item.amount} • {item.contribution_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Why support on Dundaa?</h2>

            <div className="grid" style={{ gap: 12 }}>
              <div className="trust-card">
                <h3>Fast contribution flow</h3>
                <p>Supporters can act quickly without getting lost in a complex process.</p>
              </div>

              <div className="trust-card">
                <h3>Creator trust signals</h3>
                <p>Clear fundraiser structure and platform verification help reduce uncertainty.</p>
              </div>

              <div className="trust-card">
                <h3>Public momentum</h3>
                <p>Visible activity and progress encourage more discovery and more support.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <DonateModal
        isOpen={donateOpen}
        onClose={() => setDonateOpen(false)}
        campaign={campaign}
        onSuccess={loadCampaign}
      />
    </>
  );
}