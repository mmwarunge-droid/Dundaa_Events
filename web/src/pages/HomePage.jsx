import React from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const CONTACT = {
  phoneDisplay: "+254 713 722 822",
  phoneHref: "tel:+254713722822",
  email: "hello@dundaa.com",
  emailHref: "mailto:hello@dundaa.com",
  socials: [
    {
      name: "Facebook",
      href: "https://www.facebook.com/share/1CdMZ8vw1U/"
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/dundaa/?viewAsMember=true"
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@dundaa_kenya?_r=1&_t=ZS-950SqZzwaiu"
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/dundaa_kenya/"
    }
  ]
};

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="container grid" style={{ gap: 36 }}>
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
            Events. Fundraisers. Fast checkout.
          </span>

          <h1>Discover what’s happening. Book with confidence. Enjoy more.</h1>

          <p>
            Dundaa helps people find events, support fundraisers, and complete
            bookings through simple, trusted, mobile-friendly experiences.
          </p>

          <div className="market-hero-actions">
            <Link className="btn" to="/events">
              Explore events
            </Link>

            <Link className="btn btn-secondary" to="/campaigns">
              View fundraisers
            </Link>

            {!user && (
              <Link className="btn btn-secondary" to="/signup">
                Join Dundaa
              </Link>
            )}
          </div>

          <div className="market-hero-meta">
            <span className="hero-chip">Trusted payments</span>
            <span className="hero-chip">Guest checkout</span>
            <span className="hero-chip">High-energy discovery</span>
          </div>
        </div>

        <div className="market-search-card">
          <h3>Start quickly</h3>
          <p>Choose the path that matches what you want to do next.</p>

          <div className="grid" style={{ gap: 12 }}>
            <Link className="btn" to="/events">
              Find events near me
            </Link>

            <Link className="btn btn-secondary" to="/campaigns">
              Support a fundraiser
            </Link>

            {user ? (
              <Link className="btn btn-secondary" to="/dashboard">
                Post an event
              </Link>
            ) : (
              <Link className="btn btn-secondary" to="/signup">
                Create account
              </Link>
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
              <strong style={{ color: "var(--success)" }}>Why people use Dundaa</strong>
              <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                Fast checkout, clear trust signals, public discovery, and a marketplace built for excitement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid" style={{ gap: 16 }}>
        <div className="section-head">
          <div>
            <h2>What you can do on Dundaa</h2>
            <p>Everything is built around discovery, trust, and action.</p>
          </div>
        </div>

        <div className="grid grid-3">
          <div className="trust-card">
            <h3>Browse exciting events</h3>
            <p>
              Find concerts, church events, sports, outings, and local experiences
              in a layout designed for quick scanning and fast action.
            </p>
          </div>

          <div className="trust-card">
            <h3>Book with confidence</h3>
            <p>
              Clear payment paths, ticket links, and guest checkout make it easy
              to complete a purchase with less friction.
            </p>
          </div>

          <div className="trust-card">
            <h3>Support creators and causes</h3>
            <p>
              Help bring free events and creative ideas to life through simple,
              public fundraiser discovery and contribution flows.
            </p>
          </div>
        </div>
      </section>

      <section className="promo-ad">
  <div className="promo-ad-orb promo-ad-orb-left" />
  <div className="promo-ad-orb promo-ad-orb-right" />

  <div className="promo-ad-content">
    <span className="promo-ad-chip">Creator growth</span>

    <h2>
      Launch events, build momentum,
      <span>and turn attention into bookings.</span>
    </h2>

    <p>
      Dundaa is designed for creators, organizers, and promoters who want
      visibility, trust, and a cleaner path from discovery to conversion.
    </p>

    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 18,
        justifyContent: "center"
      }}
    >
      {user ? (
        <Link className="promo-ad-cta" to="/dashboard">
          Go to dashboard
        </Link>
      ) : (
        <Link className="promo-ad-cta" to="/signup">
          Start creating
        </Link>
      )}

      <Link className="btn btn-secondary" to="/events">
        See live events
      </Link>
    </div>
  </div>
</section>

      <section className="grid" style={{ gap: 16 }}>
        <div className="section-head">
          <div>
            <h2>Why Dundaa feels different</h2>
            <p>Made to balance energy, trust, fun, and simplicity.</p>
          </div>
        </div>

        <div className="trust-grid">
          <div className="trust-card">
            <h3>⚡ Energy</h3>
            <p>
              Orange-led calls to action, stronger content hierarchy, and
              discovery-first layouts that feel alive.
            </p>
          </div>

          <div className="trust-card">
            <h3>🤝 Trust</h3>
            <p>
              Payment reassurance, cleaner booking flows, and structured
              creator-review processes that support confidence.
            </p>
          </div>

          <div className="trust-card">
            <h3>🎉 Fun</h3>
            <p>
              Events and fundraisers are surfaced in a way that encourages
              browsing, curiosity, and sharing.
            </p>
          </div>

          <div className="trust-card">
            <h3>📱 Simplicity</h3>
            <p>
              Mobile-first layouts and clearer conversion paths reduce effort
              from first click to completed checkout.
            </p>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 28 }}>
        <div className="section-head">
          <div>
            <h2>Contact & Support</h2>
            <p>Need help, want to partner, or want to feature your event? Reach Dundaa directly.</p>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "1.1fr 1fr 1fr",
            gap: 18
          }}
        >
          <div
            className="card"
            style={{
              padding: 20,
              background: "#fffaf5",
              borderColor: "rgba(255,107,0,0.12)",
              boxShadow: "none"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Talk to Dundaa</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              For support, partnerships, creator onboarding, or event promotion,
              contact us directly and we will guide you.
            </p>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <a href={CONTACT.phoneHref} style={{ fontWeight: 700, color: "var(--text)" }}>
                {CONTACT.phoneDisplay}
              </a>

              <a href={CONTACT.emailHref} style={{ fontWeight: 700, color: "var(--text)" }}>
                {CONTACT.email}
              </a>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: 20,
              background: "#ffffff",
              borderColor: "rgba(17,17,17,0.08)",
              boxShadow: "none"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Follow us</h3>

            <div className="grid" style={{ gap: 10 }}>
              {CONTACT.socials.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--text)", fontWeight: 600 }}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: 20,
              background: "var(--accent-soft)",
              borderColor: "rgba(0,194,168,0.14)",
              boxShadow: "none"
            }}
          >
            <h3 style={{ marginTop: 0, color: "var(--success)" }}>Need a fast start?</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Browse events, support campaigns, or create an account to unlock
              a fuller Dundaa experience.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <Link className="btn" to="/events">
                Explore Events
              </Link>

              {!user && (
                <Link className="btn btn-secondary" to="/signup">
                  Create Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 28 }}>
        <div className="section-head">
          <div>
            <h2>Ready to start?</h2>
            <p>Explore events, support a campaign, or launch your own experience.</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="btn" to="/events">
            Browse events
          </Link>

          <Link className="btn btn-secondary" to="/campaigns">
            Browse fundraisers
          </Link>

          {!user && (
            <Link className="btn btn-secondary" to="/signup">
              Create account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}