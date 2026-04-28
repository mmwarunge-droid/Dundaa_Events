import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || "/events";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/login", {
        identifier: identifier.trim(),
        password
      });

      await login(res.data.access_token, "Welcome back to Dundaa");
navigate(from, { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err?.response?.data?.detail ||
          "Unable to login right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div
        className="market-hero"
        style={{ alignItems: "stretch", gridTemplateColumns: "1fr 520px" }}
      >
        <div className="market-hero-main">
          <span
            className="badge"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.16)"
            }}
          >
            Welcome back
          </span>

          <h1>Login and pick up where the excitement left off.</h1>

          <p>
            Access your bookings, fundraisers, creator tools, and profile in a
            secure, fast Dundaa experience.
          </p>

          <div className="market-hero-meta">
            <span className="hero-chip">Trusted account access</span>
            <span className="hero-chip">Fast checkout continuity</span>
            <span className="hero-chip">Bookings and creator tools</span>
          </div>
        </div>

        <div className="card" style={{ padding: 28, borderRadius: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>Login to Dundaa</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              Secure access to your events, wallet, and community activity.
            </p>
          </div>

          {error && (
            <div
              className="card"
              style={{
                padding: 14,
                marginBottom: 16,
                background: "#fff4f4",
                borderColor: "rgba(214,69,69,0.18)",
                boxShadow: "none"
              }}
            >
              <strong style={{ color: "var(--danger)" }}>Login failed</strong>
              <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{error}</p>
            </div>
          )}

          <form className="grid" style={{ gap: 14 }} onSubmit={handleSubmit}>
            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Email or Username</label>
              <input
                className="input"
                placeholder="Enter email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Password</label>
              <input
                className="input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div
            className="card"
            style={{
              marginTop: 18,
              padding: 16,
              background: "var(--accent-soft)",
              borderColor: "rgba(0,194,168,0.14)",
              boxShadow: "none"
            }}
          >
            <strong style={{ color: "var(--success)" }}>Why login?</strong>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              Track your bookings, comment on events, manage campaigns, buy coins,
              and access your creator dashboard.
            </p>
          </div>

          <p style={{ marginTop: 18, marginBottom: 0, color: "var(--muted)" }}>
            New here?{" "}
            <Link to="/signup" style={{ color: "var(--primary)", fontWeight: 700 }}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}