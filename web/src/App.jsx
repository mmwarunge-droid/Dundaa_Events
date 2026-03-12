import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import InfluencerDashboardPage from "./pages/InfluencerDashboardPage";

/*
App
---
Top-level web application routing.

Small improvement:
- root path now redirects to /events for a cleaner authenticated browsing flow
- HomePage remains available to restore later if needed
*/

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Optional root redirect for a more direct product flow */}
        <Route path="/" element={<Navigate to="/events" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <InfluencerDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback route can be adjusted later */}
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </BrowserRouter>
  );
}