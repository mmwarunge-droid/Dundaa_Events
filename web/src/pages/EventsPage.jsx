import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import SearchBar from "../components/SearchBar";
import EventCard from "../components/EventCard";

/*
EventsPage
----------
Public-facing authenticated event discovery page.

This page is now focused on:
- browsing events
- searching events
- viewing the featured promotion
- redirecting creators to the dashboard to post events

The event publishing form has been moved to the dashboard.
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

  // Load event feed from backend.
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
      {/* Page heading + CTA to dashboard */}
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

      {/* Featured promotional placement */}
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

      {/* Search */}
      <div>
        <SearchBar query={query} setQuery={setQuery} />
      </div>

      {/* Error state */}
      {error && (
        <p style={{ color: "tomato", margin: 0 }}>
          {error}
        </p>
      )}

      {/* Event listing */}
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