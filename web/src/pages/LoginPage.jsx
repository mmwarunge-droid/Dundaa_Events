import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
LoginPage
---------
Login now supports:
- standard auth
- reactivation prompt for deactivated accounts
- welcome flow message on successful login/reactivation

Developer note:
The backend may return:
- access_token for normal login
- requires_reactivation=true when the user account is deactivated
*/

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    identifier: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [reactivationRequired, setReactivationRequired] = useState(false);
  const [reactivationMessage, setReactivationMessage] = useState("");
  const [reactivationUserHint, setReactivationUserHint] = useState("");

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

    let latitude = null;
    let longitude = null;
    let location_name = null;

    try {
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            () => resolve()
          );
        });
      }

      const res = await api.post("/login", {
        identifier: form.identifier,
        password: form.password,
        latitude,
        longitude,
        location_name
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
        throw new Error("No access token returned from login.");
      }

      login(
        res.data.access_token,
        res.data.message || `Welcome back ${res.data.user_hint || ""}`.trim()
      );

      navigate("/events");
    } catch (err) {
      console.error("Login error:", err);

      const backendError =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed";

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
        identifier: form.identifier,
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
        style={{ padding: 24, maxWidth: 460, margin: "40px auto" }}
      >
        <h2>Login to Dundaa</h2>

        {error && (
          <p style={{ color: "tomato", marginBottom: 12 }}>
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
          <input
            className="input"
            placeholder="Email or Username"
            autoComplete="username"
            required
            value={form.identifier}
            onChange={(e) => handleChange("identifier", e.target.value)}
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
          />

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ marginTop: 12 }}>
          New here? <Link to="/signup">Create account</Link>
        </p>
      </div>
    </div>
  );
}