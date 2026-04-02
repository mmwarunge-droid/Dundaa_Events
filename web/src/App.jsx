import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import NotificationConsentModal from "./components/NotificationConsentModal";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomeMessage from "./components/WelcomeMessage";

import { useAuth } from "./context/AuthContext";

import AdminRoute from "./components/AdminRoute";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import CampaignsPage from "./pages/CampaignsPage";
import EventDetailPage from "./pages/EventDetailPage";
import EventsPage from "./pages/EventsPage";
import HomePage from "./pages/HomePage";
import InfluencerDashboardPage from "./pages/InfluencerDashboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";

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

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />

          <Route path="/events" element={<EventsPage />} />

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

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
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