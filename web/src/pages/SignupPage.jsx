import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    date_of_birth: "",
    gender: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        date_of_birth: form.date_of_birth,
        gender: form.gender || null
      };

      const res = await api.post("/signup", payload);

      login(res.data.access_token, "Welcome to Dundaa");
      navigate("/events");
    } catch (err) {
      console.error("Signup failed:", err);
      setError(
        err?.response?.data?.detail ||
          "Unable to create account right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div
        className="market-hero"
        style={{ alignItems: "stretch", gridTemplateColumns: "1fr 560px" }}
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
            Join Dundaa
          </span>

          <h1>Create an account and start discovering more.</h1>

          <p>
            Browse events, support fundraisers, enjoy faster checkout, and unlock
            creator tools with one Dundaa account.
          </p>

          <div className="market-hero-meta">
            <span className="hero-chip">Fast account setup</span>
            <span className="hero-chip">Trusted platform access</span>
            <span className="hero-chip">Events + fundraisers + creator tools</span>
          </div>
        </div>

        <div className="card" style={{ padding: 28, borderRadius: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>Create Dundaa Account</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              Get started in a few simple steps.
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
              <strong style={{ color: "var(--danger)" }}>Signup failed</strong>
              <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{error}</p>
            </div>
          )}

          <form className="grid" style={{ gap: 14 }} onSubmit={handleSubmit}>
            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Email</label>
              <input
                className="input"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Username</label>
              <input
                className="input"
                placeholder="Choose a username"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                required
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Password</label>
              <input
                className="input"
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Date of Birth</label>
              <input
                className="input"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => handleChange("date_of_birth", e.target.value)}
                required
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label style={{ fontWeight: 700 }}>Gender (Optional)</label>
              <select
                className="select"
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div
            className="card"
            style={{
              marginTop: 18,
              padding: 16,
              background: "#fffaf5",
              borderColor: "rgba(255,107,0,0.12)",
              boxShadow: "none"
            }}
          >
            <strong style={{ color: "var(--primary)" }}>What you unlock</strong>
            <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
              Chat with fellow users, track upcoming events, support causes,
              comment, rate, and access creator features.
            </p>
          </div>

          <p style={{ marginTop: 18, marginBottom: 0, color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}