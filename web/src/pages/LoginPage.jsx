import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
LoginPage
---------
Allows users to log in with either:
- email
- username

Flow:
1. User enters identifier + password
2. Browser optionally provides location
3. Frontend sends POST /login
4. Backend returns JWT token
5. Token is stored through AuthContext
6. User is redirected to /events
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

  // Helper for controlled form input updates.
  const handleChange = (field, value) => {
    setForm({
      ...form,
      [field]: value
    });
  };

  // Handle login submission.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let latitude = null;
    let longitude = null;
    let location_name = null;

    try {
      // Ask for browser location permission during login.
      // This supports location-based event recommendations.
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

      // Save JWT token in auth context.
      login(res.data.access_token);

      // Redirect authenticated user to events page.
      navigate("/events");

    } catch (err) {
      console.error("Login error:", err);

      const backendError =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed";

      // FastAPI sometimes returns detail as an array for validation errors.
      if (Array.isArray(backendError)) {
        setError(backendError.map((item) => item.msg).join(", "));
      } else {
        setError(backendError);
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div
        className="card"
        style={{ padding: 24, maxWidth: 420, margin: "40px auto" }}
      >
        <h2>Login to Dundaa</h2>

        {error && (
          <p style={{ color: "tomato", marginBottom: 12 }}>
            {error}
          </p>
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