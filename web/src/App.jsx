import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import NotificationConsentModal from "./components/NotificationConsentModal";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomeMessage from "./components/WelcomeMessage";

import { useAuth } from "./context/AuthContext";

import EventDetailPage from "./pages/EventDetailPage";
import EventsPage from "./pages/EventsPage";
import HomePage from "./pages/HomePage";
import InfluencerDashboardPage from "./pages/InfluencerDashboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";

/*
App
---
Top-level web application routing and global UX overlays.

This version adds:
- welcome message banner
- notification consent modal
- root marketing page restored at "/"

Flow:
1. User signs up / logs in / reactivates
2. AuthContext stores welcome message
3. WelcomeMessage shows for 3 seconds
4. After it disappears, NotificationConsentModal appears if user has not answered yet
*/

function AppShell() {
  const {
    user,
    welcomeMessage,
    clearWelcomeMessage,
    submitNotificationConsent
  } = useAuth();

  const shouldShowNotificationConsent =
    !welcomeMessage &&
    !!user &&
    user.notification_consent === null;

  return (
    <>
      <Navbar />

      <WelcomeMessage
        message={welcomeMessage}
        onDone={clearWelcomeMessage}
        duration={3000}
      />

      <NotificationConsentModal
        isOpen={shouldShowNotificationConsent}
        onSelect={submitNotificationConsent}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}