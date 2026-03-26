import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import EventCard from "../components/EventCard";
import PaginationControls from "../components/PaginationControls";
import SearchBar from "../components/SearchBar";
import { useAuth } from "../context/AuthContext";

const FEATURED_AD = {
  eyebrow: "Featured Promotion",
  title: "Grow your brand with Dundaa influencer marketing",
  text:
    "Get your event or business seen by targeted audiences through creator partnerships, boosted visibility, and premium placements inside the Dundaa experience.",
  ctaLabel: "Visit Sponsor Website",
  ctaUrl: "https://example.com"
};

export default function EventsPage() {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [locationName, setLocationName] = useState("");
  const [ticketedOnly, setTicketedOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/events/discover", {
        params: {
          page,
          page_size: pageSize,
          query: query || undefined,
          category: category || undefined,
          location_name: locationName || undefined,
          ticketed_only: ticketedOnly || undefined
        }
      });

      setEvents(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError("Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, pageSize, query, category, locationName, ticketedOnly]);

  useEffect(() => {
    setPage(1);
  }, [query, category, locationName, ticketedOnly]);

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <section className="page-header-bar">
        <div>
          <h1 style={{ margin: 0 }}>Uko na Form???</h1>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Tupeleke na mutaratara
          </p>
        </div>

        {user ? (
          <Link to="/dashboard" className="btn">
            Post an event
          </Link>
        ) : (
          <Link to="/signup" className="btn">
            Create account
          </Link>
        )}
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

      <div className="card" style={{ padding: 16 }}>
        <SearchBar query={query} setQuery={setQuery} />

        <div className="grid grid-3" style={{ marginTop: 8 }}>
          <input
            className="input"
            placeholder="Filter by location"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />

          <input
            className="input"
            placeholder="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "12px 0"
            }}
          >
            <input
              type="checkbox"
              checked={ticketedOnly}
              onChange={(e) => setTicketedOnly(e.target.checked)}
            />
            <span>Ticketed events only</span>
          </label>
        </div>
      </div>

      {error && (
        <p style={{ color: "tomato", margin: 0 }}>
          {error}
        </p>
      )}

      {!error && (
        <div style={{ color: "var(--muted)" }}>
          {loading ? "Loading events..." : `${total} events found`}
        </div>
      )}

      <div className="grid grid-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {!loading && events.length === 0 && !error && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No events match the current search and filters.
          </p>
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}