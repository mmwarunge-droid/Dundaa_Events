import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import CampaignCard from "../components/CampaignCard";
import PaginationControls from "../components/PaginationControls";
import SearchBar from "../components/SearchBar";
import { useAuth } from "../context/AuthContext";

const FUNDRAISER_FILTERS = [
  { label: "All", value: "all" },
  { label: "Free event support", value: "free_event_crowdfund" },
  { label: "Creator fundraisers", value: "creator_fundraiser" }
];

export default function CampaignsPage() {
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);

  const [query, setQuery] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [form, setForm] = useState({
    title: "",
    description: "",
    cause_description: "",
    beneficiary_name: "",
    campaign_type: "creator_fundraiser",
    cover_image_url: "",
    goal_amount: "",
    deadline: "",
    linked_event_id: "",
    allow_anonymous: true,
    recurring_enabled: false
  });

  const [showLaunchForm, setShowLaunchForm] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadDiscover = async () => {
    try {
      setLoading(true);
      setError("");

      const resolvedType =
        activeFilter !== "all" ? activeFilter : campaignType || undefined;

      const res = await api.get("/campaigns/discover", {
        params: {
          page,
          page_size: pageSize,
          query: query || undefined,
          campaign_type: resolvedType
        }
      });

      setCampaigns(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
      setError("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  const loadMine = async () => {
    if (!user) return;

    try {
      const res = await api.get("/campaigns/mine");
      setMyCampaigns(res.data || []);
    } catch (err) {
      console.error("Failed to load creator campaigns:", err);
    }
  };

  const reloadAll = async () => {
    await loadDiscover();
    await loadMine();
  };

  useEffect(() => {
    loadDiscover();
  }, [page, pageSize, query, campaignType, activeFilter]);

  useEffect(() => {
    if (user) {
      loadMine();
    }
  }, [user?.id]);

  useEffect(() => {
    setPage(1);
  }, [query, campaignType, activeFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      await api.post("/campaigns", {
        ...form,
        goal_amount: Number(form.goal_amount),
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        linked_event_id: form.linked_event_id ? Number(form.linked_event_id) : null
      });

      setForm({
        title: "",
        description: "",
        cause_description: "",
        beneficiary_name: "",
        campaign_type: "creator_fundraiser",
        cover_image_url: "",
        goal_amount: "",
        deadline: "",
        linked_event_id: "",
        allow_anonymous: true,
        recurring_enabled: false
      });

      setShowLaunchForm(false);
      await reloadAll();
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setError(err?.response?.data?.detail || "Failed to create fundraiser.");
    } finally {
      setCreating(false);
    }
  };

  const featuredCampaigns = useMemo(() => campaigns.slice(0, 3), [campaigns]);
  const moreCampaigns = useMemo(() => campaigns.slice(3), [campaigns]);

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <section className="market-hero">
        <div className="market-hero-main">
          <span
            className="badge"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.16)"
            }}
          >
            Support meaningful causes
          </span>

          <h1>Back free events, creators, and community-led experiences.</h1>

          <p>
            Discover campaigns that help bring events to life, support artists,
            and fund causes people care about — all through a clean, simple
            donation experience.
          </p>

          <div className="market-hero-actions">
            <Link className="btn" to="/campaigns">
              Explore fundraisers
            </Link>

            {user ? (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowLaunchForm((prev) => !prev)}
              >
                {showLaunchForm ? "Close launch form" : "Launch fundraiser"}
              </button>
            ) : (
              <Link className="btn btn-secondary" to="/signup">
                Join Dundaa
              </Link>
            )}
          </div>

          <div className="market-hero-meta">
            <span className="hero-chip">Fast donations</span>
            <span className="hero-chip">Trusted payouts</span>
            <span className="hero-chip">Verified creators</span>
          </div>
        </div>

        <div className="market-search-card">
          <h3>Find a fundraiser to support</h3>
          <p>Search by cause, creator, or fundraiser type.</p>

          <div className="grid" style={{ gap: 12 }}>
            <SearchBar query={query} setQuery={setQuery} />

            <select
              className="select"
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
            >
              <option value="">All fundraiser types</option>
              <option value="free_event_crowdfund">Free event crowdfund</option>
              <option value="creator_fundraiser">Creator fundraiser</option>
            </select>

            <div className="quick-tabs">
              {FUNDRAISER_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`quick-tab ${activeFilter === filter.value ? "active" : ""}`}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p style={{ color: "tomato", margin: 0 }}>
          {error}
        </p>
      )}

      {user && showLaunchForm && (
        <section className="card" style={{ padding: 24 }}>
          <div className="section-head" style={{ marginBottom: 18 }}>
            <div>
              <h2>Launch a fundraiser</h2>
              <p>Create a polished campaign that is easy to discover and support.</p>
            </div>
          </div>

          <form className="grid grid-2" onSubmit={handleCreate}>
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <select
              className="select"
              value={form.campaign_type}
              onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
            >
              <option value="creator_fundraiser">Creator fundraiser</option>
              <option value="free_event_crowdfund">Free event crowdfund</option>
            </select>

            <textarea
              className="textarea"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />

            <textarea
              className="textarea"
              placeholder="Cause description"
              value={form.cause_description}
              onChange={(e) => setForm({ ...form, cause_description: e.target.value })}
            />

            <input
              className="input"
              placeholder="Beneficiary name"
              value={form.beneficiary_name}
              onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })}
            />

            <input
              className="input"
              placeholder="Cover image URL"
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
            />

            <input
              className="input"
              type="number"
              min="1"
              step="0.01"
              placeholder="Goal amount"
              value={form.goal_amount}
              onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
              required
            />

            <input
              className="input"
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />

            {form.campaign_type === "free_event_crowdfund" && (
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Linked free event ID"
                value={form.linked_event_id}
                onChange={(e) => setForm({ ...form, linked_event_id: e.target.value })}
                required
              />
            )}

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.allow_anonymous}
                onChange={(e) => setForm({ ...form, allow_anonymous: e.target.checked })}
              />
              <span>Allow anonymous donations</span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.recurring_enabled}
                onChange={(e) => setForm({ ...form, recurring_enabled: e.target.checked })}
              />
              <span>Enable recurring contributions</span>
            </label>

            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Launching..." : "Launch Fundraiser"}
            </button>
          </form>
        </section>
      )}

      {user && myCampaigns.length > 0 && (
        <section className="grid" style={{ gap: 16 }}>
          <div className="section-head">
            <div>
              <h2>My fundraisers</h2>
              <p>Keep track of the campaigns you have launched.</p>
            </div>
          </div>

          <div className="grid grid-3">
            {myCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onChanged={reloadAll}
              />
            ))}
          </div>
        </section>
      )}

      <section className="grid" style={{ gap: 16 }}>
        <div className="section-head">
          <div>
            <h2>Featured fundraisers</h2>
            <p>{loading ? "Loading fundraisers..." : `${total} fundraisers found`}</p>
          </div>
        </div>

        <div className="grid grid-3">
          {featuredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onChanged={reloadAll}
            />
          ))}
        </div>
      </section>

      <section className="grid" style={{ gap: 16 }}>
        <div className="section-head">
          <div>
            <h2>More causes to support</h2>
            <p>Support creators, free events, and community-driven ideas.</p>
          </div>
        </div>

        <div className="grid grid-3">
          {moreCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onChanged={reloadAll}
            />
          ))}
        </div>

        {!loading && campaigns.length === 0 && (
          <div className="card" style={{ padding: 24 }}>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              No fundraisers match the current search and filters.
            </p>
          </div>
        )}
      </section>

      <section className="grid" style={{ gap: 16 }}>
        <div className="section-head">
          <div>
            <h2>Why support on Dundaa?</h2>
            <p>Built to make giving feel simple, trustworthy, and immediate.</p>
          </div>
        </div>

        <div className="trust-grid">
          <div className="trust-card">
            <h3>Trusted payments</h3>
            <p>Clear payment paths and donation flows that feel reliable and easy to follow.</p>
          </div>

          <div className="trust-card">
            <h3>Support verified creators</h3>
            <p>Give users stronger confidence with platform verification and trust signals.</p>
          </div>

          <div className="trust-card">
            <h3>Simple contribution flow</h3>
            <p>Whether one-time or recurring, supporters can act quickly with less friction.</p>
          </div>
        </div>
      </section>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}