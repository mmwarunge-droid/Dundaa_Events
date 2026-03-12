import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
SignupPage
-----------
Handles creation of new Dundaa accounts.

Flow:
1. User fills email, username, password
2. Form submits to backend POST /signup
3. Backend returns JWT token
4. Token saved via AuthContext
5. User redirected to /events
*/

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handles form input changes
  const handleChange = (field, value) => {
    setForm({
      ...form,
      [field]: value
    });
  };

  // Handles form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/signup", {
        email: form.email,
        username: form.username,
        password: form.password
      });

      // Save token to auth context
      login(res.data.access_token);

      // Redirect to events page
      navigate("/events");

    } catch (err) {
      console.error("Signup error:", err);

      const backendError =
        err?.response?.data?.detail ||
        err?.message ||
        "Signup failed";

      // Convert array errors from FastAPI into readable string
      if (Array.isArray(backendError)) {
        setError(backendError.map((e) => e.msg).join(", "));
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
        style={{
          padding: 24,
          maxWidth: 420,
          margin: "40px auto"
        }}
      >
        <h2>Create Dundaa Account</h2>

        {error && (
          <p style={{ color: "tomato", marginBottom: 10 }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid">

          <input
            className="input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) =>
              handleChange("email", e.target.value)
            }
          />

          <input
            className="input"
            placeholder="Username"
            autoComplete="username"
            required
            value={form.username}
            onChange={(e) =>
              handleChange("username", e.target.value)
            }
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) =>
              handleChange("password", e.target.value)
            }
          />

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