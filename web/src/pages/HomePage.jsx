import { Link } from "react-router-dom";

export default function HomePage() {
  // Marketing-style landing page for Dundaa.
  return (
    <div className="container">
      <section className="hero">
        <div>
          <div className="badge">Discover. Rate. Rise.</div>
          <h1 style={{ fontSize: "3rem", marginBottom: 12 }}>Dundaa brings events, creators, and influence together.</h1>
          <p style={{ color: "#b6b6b6", maxWidth: 620 }}>
            Post events, discover what is happening near you, earn stars from community ratings, and unlock super-influencer rewards.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <Link className="btn" to="/signup">Get Started</Link>
            <Link className="btn btn-secondary" to="/events">Browse Events</Link>
          </div>
        </div>
        <div className="card" style={{ padding: 24, minHeight: 340, display: "grid", placeItems: "center" }}>
          <div style={{ width: "100%", height: 280, borderRadius: 20, background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(255,255,255,0.04))" }} />
        </div>
      </section>
    </div>
  );
}
