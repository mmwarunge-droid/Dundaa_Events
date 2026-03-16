import React from "react";
import { Link } from "react-router-dom";

import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

/*
Navbar
------
Phase 2 update:
- Admin users now see an Admin link
- Structure remains backward-compatible for standard users
*/

export default function Navbar() {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="nav-brand" aria-label="Dundaa home">
          <Logo />
        </Link>

        <div className="nav-links">
          {user && <Link to="/events">Events</Link>}
          {user && <Link to="/dashboard">Dashboard</Link>}
          {user && <Link to="/profile">Profile</Link>}
          {isAdmin && <Link to="/admin">Admin</Link>}

          {!user ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </>
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