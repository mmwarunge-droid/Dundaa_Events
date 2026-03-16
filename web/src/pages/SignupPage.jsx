import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
SignupPage
----------
Signup now supports:
- date of birth
- 18+ enforcement on the client before request
- optional gender field
- stronger email validation feedback
- deactivated-account reactivation flow

Important:
The backend still performs the final validation and remains the source of truth.
*/

const COMMON_EMAIL_TYPO_DOMAINS = {
  "gma.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "outlok.com": "outlook.com"
};

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0;

  const today = new Date();
  const dob = new Date(dateOfBirth);

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

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

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [reactivationRequired, setReactivationRequired] = useState(false);
  const [reactivationMessage, setReactivationMessage] = useState("");
  const [reactivationUserHint, setReactivationUserHint] = useState("");

  const emailDomainSuggestion = useMemo(() => {
    const email = form.email.trim().toLowerCase();
    if (!email.includes("@")) return "";

    const domain = email.split("@")[1];
    if (COMMON_EMAIL_TYPO_DOMAINS[domain]) {
      return `Did you mean @${COMMON_EMAIL_TYPO_DOMAINS[domain]}?`;
    }

    return "";
  }, [form.email]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setReactivationRequired(false);
    setReactivationMessage("");
    setReactivationUserHint("");

    try {
      const age = calculateAge(form.date_of_birth);

      if (age < 18) {
        setError("Sorry, Dundaa is only available to people over the age of 18.");
        return;
      }

      const res = await api.post("/signup", {
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        password: form.password,
        date_of_birth: form.date_of_birth,
        gender: form.gender || null
      });

      if (res.data.requires_reactivation) {
        setReactivationRequired(true);
        setReactivationMessage(
          res.data.message ||
            "Your account was previously deactivated. Would you like to reactivate it?"
        );
        setReactivationUserHint(res.data.user_hint || "");
        return;
      }

      if (!res.data.access_token) {
        throw new Error("No access token returned from signup.");
      }

      login(
        res.data.access_token,
        "Welcome to the Dundaa social community"
      );

      navigate("/events");
    } catch (err) {
      console.error("Signup error:", err);

      const backendError =
        err?.response?.data?.detail ||
        err?.message ||
        "Signup failed";

      if (Array.isArray(backendError)) {
        setError(backendError.map((item) => item.msg).join(", "));
      } else {
        setError(backendError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/reactivate-account", {
        identifier: form.email.trim().toLowerCase() || form.username.trim(),
        password: form.password
      });

      if (!res.data.access_token) {
        throw new Error("No access token returned from reactivation.");
      }

      login(
        res.data.access_token,
        res.data.message || `Welcome back ${res.data.user_hint || ""}`.trim()
      );

      navigate("/events");
    } catch (err) {
      console.error("Reactivation error:", err);
      setError(
        err?.response?.data?.detail ||
          "Failed to reactivate your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div
        className="card"
        style={{
          padding: 24,
          maxWidth: 480,
          margin: "40px auto"
        }}
      >
        <h2>Create Dundaa Account</h2>

        {error && (
          <p style={{ color: "tomato", marginBottom: 10 }}>
            {error}
          </p>
        )}

        {reactivationRequired && (
          <div
            className="card"
            style={{
              padding: 16,
              marginBottom: 16,
              background: "rgba(255,255,255,0.03)"
            }}
          >
            <p style={{ marginTop: 0 }}>
              {reactivationMessage}
            </p>

            {reactivationUserHint && (
              <p style={{ color: "var(--muted)" }}>
                Account: <strong>{reactivationUserHint}</strong>
              </p>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                disabled={loading}
                onClick={handleReactivate}
              >
                {loading ? "Reactivating..." : "Yes, Reactivate"}
              </button>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setReactivationRequired(false);
                  setReactivationMessage("");
                  setReactivationUserHint("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid">
          <div>
            <input
              className="input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
            {emailDomainSuggestion && (
              <p style={{ color: "#d4af37", marginTop: 8, marginBottom: 0 }}>
                {emailDomainSuggestion}
              </p>
            )}
          </div>

          <input
            className="input"
            placeholder="Username"
            autoComplete="username"
            required
            value={form.username}
            onChange={(e) => handleChange("username", e.target.value)}
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
          />

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Date of Birth
            </label>
            <input
              className="input"
              type="date"
              required
              value={form.date_of_birth}
              onChange={(e) => handleChange("date_of_birth", e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Gender (Optional)
            </label>
            <select
              className="select"
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            className="btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: 12 }}>
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}