import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import CampaignShareButton from "./CampaignShareButton";
import DonateModal from "./DonateModal";

export default function CampaignCard({ campaign, onChanged }) {
  const [donateOpen, setDonateOpen] = useState(false);

  const progress = useMemo(() => {
    return Math.min(Number(campaign.progress_percentage || 0), 100);
  }, [campaign.progress_percentage]);

  const raised = Number(campaign.current_amount || 0);
  const goal = Number(campaign.goal_amount || 0);

  return (
    <>
      <div className="campaign-card">
        {campaign.cover_image_url ? (
          <img
            src={campaign.cover_image_url}
            alt={campaign.title}
            className="campaign-card-image"
          />
        ) : (
          <div
            className="campaign-card-image"
            style={{
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, rgba(0,194,168,0.10), rgba(255,107,0,0.10))",
              color: "var(--muted)",
              fontWeight: 700
            }}
          >
            Dundaa Fundraiser
          </div>
        )}

        <div className="card-meta">
          <span className="badge">{campaign.campaign_type}</span>
          {campaign.owner_verified && <span className="badge">Verified</span>}
          {campaign.allow_anonymous && <span className="badge">Anonymous Donations</span>}
          {campaign.recurring_enabled && <span className="badge">Recurring</span>}
          {campaign.deadline && <span className="badge">Deadline Set</span>}
        </div>

        <h3 className="card-title">{campaign.title}</h3>

        <p className="card-copy">
          {campaign.cause_description || campaign.description}
        </p>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              width: "100%",
              height: 10,
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
              gap: 10,
              marginTop: 10,
              flexWrap: "wrap"
            }}
          >
            <div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Raised</div>
              <div className="price-emphasis">KES {raised}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Goal</div>
              <div style={{ fontWeight: 800 }}>KES {goal}</div>
            </div>
          </div>

          <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 14 }}>
            {campaign.progress_percentage}% funded
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid rgba(17,17,17,0.08)",
            color: "var(--muted)",
            fontSize: 14
          }}
        >
          Beneficiary:{" "}
          <strong style={{ color: "var(--text)" }}>
            {campaign.beneficiary_name || campaign.owner_username || "Creator"}
          </strong>
        </div>

        <div className="card-actions">
          <Link className="btn" to={`/campaigns/${campaign.id}`}>
            View Campaign
          </Link>

          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setDonateOpen(true)}
          >
            Donate
          </button>

          <CampaignShareButton campaign={campaign} />
        </div>
      </div>

      <DonateModal
        isOpen={donateOpen}
        onClose={() => setDonateOpen(false)}
        campaign={campaign}
        onSuccess={onChanged}
      />
    </>
  );
}