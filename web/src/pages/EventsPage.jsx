import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import EventCard from "../components/EventCard";
import SearchBar from "../components/SearchBar";

/*
EventsPage
----------
Phase 2 behavior:
- public feed only shows events returned by backend visibility rules
- non-live ticketed events remain hidden to other users
- owners still see their own hidden/pending events because the backend keeps
  owner visibility for compatibility
*/

const FEATURED_AD = {
  eyebrow: "Featured Promotion",
  title: "Grow your brand with Dundaa influencer marketing",
  text:
    "Get your event or business seen by targeted audiences through creator partnerships, boosted visibility, and premium placements inside the Dundaa experience.",
  ctaLabel: "Visit Sponsor Website",
  ctaUrl: "https://example.com"
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      const res = await api.get("/events", { params: { query } });
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError("Failed to load events.");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [query]);

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <section className="page-header-bar">
        <div>
          <h1 style={{ margin: 0 }}>Uko na Form???</h1>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Tupeleke na mutaratara
          </p>
        </div>

        <Link to="/dashboard" className="btn">
          Post an event
        </Link>
      </section>

      <section className="promo-ad card">
        <div className="promo-ad-orb promo-ad-orb-left" />
        <div className="promo-ad-orb promo-ad-orb-right" />

        <div className="promo-ad-content">
          <span className="promo-ad-chip">{FEATURED_AD.eyebrow}</span>
          <h2>{FEATURED_AD.title}</h2>
          <p>{FEATURED_AD.text}</p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <a
              href={FEATURED_AD.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="btn"
            >
              {FEATURED_AD.ctaLabel}
            </a>

            <span style={{ color: "var(--muted)" }}>
              Premium placement area for paid adverts
            </span>
          </div>
        </div>
      </section>

      <div>
        <SearchBar query={query} setQuery={setQuery} />
      </div>

      {error && (
        <p style={{ color: "tomato", margin: 0 }}>
          {error}
        </p>
      )}

      <div className="grid grid-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onEventChanged={fetchEvents}
          />
        ))}
      </div>
    </div>
  );
}