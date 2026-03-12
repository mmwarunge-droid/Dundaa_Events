import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

/*
Navbar
------
Top navigation bar for Dundaa.

Now supports the reorganized app structure:
- Events = discovery
- Dashboard = creator actions
- Profile = personal details
*/

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/events" className="nav-brand" aria-label="Dundaa events">
          <Logo />
        </Link>

        <div className="nav-links">
          {user && <Link to="/events">Events</Link>}
          {user && <Link to="/dashboard">Dashboard</Link>}
          {user && <Link to="/profile">Profile</Link>}

          {!user ? (
            <Link to="/login">Login</Link>
          ) : (
            <button className="btn btn-secondary" onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}