import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import GuestCheckoutModal from "./GuestCheckoutModal";
import ShareButton from "./ShareButton";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Resolve image/file URLs.
 * - absolute URLs are returned as-is
 * - relative backend paths are prefixed with the API base URL
 */
function resolvePosterUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;

  return `${normalizedBase}${normalizedPath}`;
}

export default function EventCard({ event }) {
  const { user } = useAuth();

  const [imageBroken, setImageBroken] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const isOwner = user?.id === event.owner_id;

  // Prefer smaller optimized thumbnail for card views, then fall back to main poster.
  const preferredPosterUrl = event.poster_thumb_url || event.poster_url || null;
  const posterSrc = resolvePosterUrl(preferredPosterUrl);

  const isPdfPoster = event.poster_type === "pdf";

  const canShowGuestCheckout = !!event.can_guest_checkout;
  const canShowPaymentLink =
    event.has_ticket_sales &&
    event.is_live &&
    event.approval_status === "approved" &&
    !!event.payment_link;

  const hasFeaturedPromo =
    !!event.featured_promo_image_url && !!event.featured_promo_click_url;

  const featuredPromoImageSrc = resolvePosterUrl(event.featured_promo_image_url);

  const trimmedDescription = useMemo(() => {
    const text = event.description || "";
    return text.length > 110 ? `${text.slice(0, 110)}...` : text;
  }, [event.description]);

  const eventDateLabel = event.event_date || "Date TBA";
  const locationLabel = event.location_name || "Location TBA";
  const priceLabel =
    event.price !== null && event.price !== undefined
      ? `KES ${event.price}`
      : event.has_ticket_sales
      ? "Ticket info soon"
      : "Free";

  return (
    <>
      <div className="event-card">
        {posterSrc && !isPdfPoster && !imageBroken ? (
          <img
            src={posterSrc}
            alt={event.title}
            onError={() => setImageBroken(true)}
            className="event-card-image"
            loading="lazy"
          />
        ) : posterSrc && isPdfPoster ? (
          <a
            href={posterSrc}
            target="_blank"
            rel="noreferrer"
            className="pdf-poster-card"
            style={{ marginBottom: 14 }}
          >
            <span className="pdf-poster-label">PDF Poster</span>
            <span className="pdf-poster-link">Open Poster</span>
          </a>
        ) : (
          <div
            className="event-card-image"
            style={{
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, rgba(255,107,0,0.10), rgba(0,194,168,0.08))",
              color: "var(--muted)",
              fontWeight: 700
            }}
          >
            Dundaa Event
          </div>
        )}

        <div className="card-meta">
          {event.category && <span className="badge">{event.category}</span>}
          <span className="badge">{locationLabel}</span>
          <span className="badge">{eventDateLabel}</span>
          {event.has_ticket_sales && <span className="badge">Ticketed</span>}
          {canShowGuestCheckout && <span className="badge">Guest Checkout</span>}
          {event.share_click_count > 0 && (
            <span className="badge">{event.share_click_count} Shares</span>
          )}
          {!event.is_live && isOwner && (
            <span className="badge">{event.approval_status}</span>
          )}
        </div>

        <h3 className="card-title">{event.title}</h3>

        <p className="card-copy">{trimmedDescription}</p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 8
          }}
        >
          <div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Price</div>
            <div className="price-emphasis">{priceLabel}</div>
          </div>

          {event.payment_method && (
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Payment</div>
              <div style={{ fontWeight: 700 }}>{event.payment_method}</div>
            </div>
          )}
        </div>

        {event.owner_username && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(17,17,17,0.08)",
              color: "var(--muted)",
              fontSize: 14
            }}
          >
            Hosted by{" "}
            <strong style={{ color: "var(--text)" }}>{event.owner_username}</strong>
          </div>
        )}

        {event.rejection_reason && isOwner && (
          <div
            className="card"
            style={{
              marginTop: 14,
              padding: 12,
              background: "#fff4f4",
              borderColor: "rgba(214,69,69,0.18)",
              boxShadow: "none"
            }}
          >
            <strong style={{ color: "var(--danger)" }}>Review note</strong>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              {event.rejection_reason}
            </p>
          </div>
        )}

        {hasFeaturedPromo && (
          <a
            href={event.featured_promo_click_url}
            target="_blank"
            rel="noreferrer"
            className="card"
            style={{
              marginTop: 14,
              padding: 12,
              display: "block",
              textDecoration: "none",
              color: "inherit",
              boxShadow: "none",
              borderColor: "rgba(255,107,0,0.14)",
              background: "#fffaf5"
            }}
          >
            {featuredPromoImageSrc && (
              <img
                src={featuredPromoImageSrc}
                alt="Featured promotion"
                loading="lazy"
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 10
                }}
              />
            )}

            <div style={{ fontWeight: 700, color: "var(--primary)" }}>
              Featured Promotion
            </div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>
              Tap to learn more
            </div>
          </a>
        )}

        <div className="card-actions">
          <Link className="btn" to={`/events/${event.id}`}>
            View Event
          </Link>

          <ShareButton event={event} />

          {canShowGuestCheckout && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setCheckoutOpen(true)}
            >
              Buy as Guest
            </button>
          )}

          {canShowPaymentLink && (
            <a
              className="btn btn-secondary"
              href={event.payment_link}
              target="_blank"
              rel="noreferrer"
            >
              Ticket Link
            </a>
          )}
        </div>
      </div>

      <GuestCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        event={event}
      />
    </>
  );
}