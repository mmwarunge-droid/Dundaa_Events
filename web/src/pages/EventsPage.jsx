import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import EventCard from "../components/EventCard";
import PaginationControls from "../components/PaginationControls";
import SearchBar from "../components/SearchBar";
import { useAuth } from "../context/AuthContext";

const FEATURED_AD = {
  eyebrow: "Featured Promotion",
  title: "It’s time. Be Part of the Change!!!",
  text:
    "We are EXERCISING our SOVEREIGN and INALIENABLE RIGHT to DETERMINE the form of governance of our country in line with OUR Constitution for ourselves and our FUTURE GENERATIONS.",
  ctaLabel: "COUNT ME IN",
  ctaUrl: "https://lindamwananchi.com/",
  imageUrl: "/sifuna2.png"
};

function EventCardSkeleton() {
  return (
    <div className="event-card event-card-skeleton" aria-hidden="true">
      <div className="event-card-image" />

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 14
        }}
      >
        <span className="skeleton-chip" style={{ width: 70 }} />
        <span className="skeleton-chip" style={{ width: 90 }} />
        <span className="skeleton-chip" style={{ width: 80 }} />
      </div>

      <div
        className="skeleton-line-lg"
        style={{ marginTop: 16, width: "78%" }}
      />

      <div
        className="skeleton-line"
        style={{ marginTop: 12, width: "100%" }}
      />

      <div
        className="skeleton-line"
        style={{ marginTop: 8, width: "92%" }}
      />

      <div
        className="skeleton-line"
        style={{ marginTop: 8, width: "65%" }}
      />

      <div
        style={{
          marginTop: 20,
          display: "flex",
          gap: 10,
          flexWrap: "wrap"
        }}
      >
        <div className="skeleton-button" style={{ width: 110 }} />
        <div className="skeleton-button" style={{ width: 120 }} />
      </div>
    </div>
  );
}

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

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [debouncedCategory, setDebouncedCategory] = useState(category);
  const [debouncedLocationName, setDebouncedLocationName] = useState(locationName);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategory(category), 400);
    return () => clearTimeout(timer);
  }, [category]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocationName(locationName), 400);
    return () => clearTimeout(timer);
  }, [locationName]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, debouncedCategory, debouncedLocationName, ticketedOnly]);

  useEffect(() => {
    let isMounted = true;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/events/discover", {
          params: {
            page,
            page_size: pageSize,
            query: debouncedQuery || undefined,
            category: debouncedCategory || undefined,
            location_name: debouncedLocationName || undefined,
            ticketed_only: ticketedOnly || undefined
          }
        });

        if (!isMounted) return;

        setEvents(res.data.items || []);
        setTotalPages(res.data.total_pages || 1);
        setTotal(res.data.total || 0);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch events:", err);
        setError("Failed to load events.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, debouncedQuery, debouncedCategory, debouncedLocationName, ticketedOnly]);

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

      <section className="promo-ad">
        <div className="promo-flip-inner">
          <div className="promo-flip-face promo-flip-front">
            <img
              src={FEATURED_AD.imageUrl}
              alt={FEATURED_AD.title}
              className="promo-flip-image"
              loading="lazy"
            />

            <div className="promo-flip-front-badge">
              {FEATURED_AD.eyebrow}
            </div>
          </div>

          <div className="promo-flip-face promo-flip-back">
            <div className="promo-ad-content">
              <span className="promo-ad-chip">{FEATURED_AD.eyebrow}</span>
              <h2>{FEATURED_AD.title}</h2>
              <p>{FEATURED_AD.text}</p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <a
                  href={FEATURED_AD.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="promo-ad-cta"
                >
                  {FEATURED_AD.ctaLabel}
                </a>

                <span style={{ color: "rgba(255,255,255,0.78)" }}>
                  Sisi ndio Nani?
                </span>
              </div>
            </div>
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
        {loading
          ? Array.from({ length: pageSize }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))
          : events.map((event) => (
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

      {!loading && totalPages > 1 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}