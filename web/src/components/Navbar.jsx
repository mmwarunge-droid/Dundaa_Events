import React from "react";
import { Link } from "react-router-dom";

import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";

const CONTACT = {
  phoneDisplay: "+254 713 722 822",
  phoneHref: "tel:+254713722822",
  email: "hello@dundaa.com",
  emailHref: "mailto:hello@dundaa.com"
};

export default function Navbar() {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <>
      <div className="top-strip">
        <div className="container top-strip-inner" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <span><strong>Secure bookings</strong></span>
          </div>
        </div>
      </div>

      <nav className="nav">
        <div className="container nav-inner">
          <Link to="/" className="nav-brand" aria-label="Dundaa home">
            <Logo />
          </Link>

          <div className="nav-links">
            <Link to="/events">Events</Link>
            <Link to="/campaigns">Fundraisers</Link>

            {user && <Link to="/dashboard">Dashboard</Link>}
            {user && <Link to="/profile">Profile</Link>}
            {isAdmin && <Link to="/admin">Admin</Link>}
            {user && <NotificationBell />}

            {!user ? (
              <>
                <Link to="/login">Login</Link>
                <Link className="btn" to="/signup">Create account</Link>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}