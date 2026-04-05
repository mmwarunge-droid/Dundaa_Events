import React, { useEffect, useMemo, useRef, useState } from "react";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import useToast from "../hooks/useToast";

import CtaGroup from "../components/ui/CtaGroup";
import MetricCard from "../components/ui/MetricCard";
import PageSection from "../components/ui/PageSection";
import StatusBanner from "../components/ui/StatusBanner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function resolveProfileImage(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

export default function ProfilePage() {
  const { user, setUser, logout, submitPromotionalConsent } = useAuth();
  const toast = useToast();

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const dragStateRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });

  const [form, setForm] = useState({
    username: "",
    contact_info: "",
    gender: "",
    location_name: "",
    latitude: "",
    longitude: ""
  });

  const [previewImage, setPreviewImage] = useState("");
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [selectedFile, setSelectedFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) return;

    setForm({
      username: user.username || "",
      contact_info: user.contact_info || "",
      gender: user.gender || "",
      location_name: user.location_name || "",
      latitude:
        user.latitude !== null && user.latitude !== undefined
          ? String(user.latitude)
          : "",
      longitude:
        user.longitude !== null && user.longitude !== undefined
          ? String(user.longitude)
          : ""
    });
  }, [user]);

  const currentProfileImage = useMemo(
    () => resolveProfileImage(user?.profile_picture),
    [user?.profile_picture]
  );

  const resetCropState = () => {
    setPreviewImage("");
    setSelectedFile(null);
    setCropScale(1);
    setCropOffset({ x: 0, y: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      toast.error("Please choose an image file.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewImage(objectUrl);
    setCropScale(1);
    setCropOffset({ x: 0, y: 0 });
    setError("");
    setSuccess("");
  };

  const handlePointerDown = (e) => {
    if (!previewImage) return;

    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: cropOffset.x,
      originY: cropOffset.y
    };
  };

  const handlePointerMove = (e) => {
    if (!dragStateRef.current.dragging) return;

    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;

    setCropOffset({
      x: dragStateRef.current.originX + dx,
      y: dragStateRef.current.originY + dy
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [cropOffset]);

  const buildCroppedImageBlob = async () => {
    if (!previewImage) return null;

    const img = imageRef.current;
    if (!img) return null;

    const canvas = document.createElement("canvas");
    const size = 500;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const drawWidth = img.naturalWidth * cropScale;
    const drawHeight = img.naturalHeight * cropScale;

    ctx.drawImage(img, cropOffset.x, cropOffset.y, drawWidth, drawHeight);

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let profile_picture = user?.profile_picture || null;

      if (previewImage) {
        const blob = await buildCroppedImageBlob();
        if (blob) {
          const uploadData = new FormData();
          uploadData.append("file", blob, "profile.jpg");

          const uploadRes = await api.post("/profile/upload-photo", uploadData, {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          });

          profile_picture = uploadRes.data.profile_picture;
        }
      }

      const res = await api.put("/profile", {
        username: form.username.trim(),
        contact_info: form.contact_info.trim() || null,
        gender: form.gender || null,
        location_name: form.location_name.trim() || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        profile_picture
      });

      setUser(res.data);
      setSuccess("Profile updated successfully.");
      toast.success("Profile updated successfully.");
      resetCropState();
    } catch (err) {
      console.error("Profile update failed:", err);
      const msg = err?.response?.data?.detail || "Failed to update profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async () => {
    setDeletingPhoto(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.delete("/profile/photo");
      setUser(res.data);
      setSuccess("Profile photo removed.");
      toast.success("Profile photo removed.");
      resetCropState();
    } catch (err) {
      console.error("Delete photo failed:", err);
      const msg = err?.response?.data?.detail || "Failed to remove profile photo.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingPhoto(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account?"
    );
    if (!confirmed) return;

    try {
      await api.post("/profile/account-status", { action: "delete" });
      toast.success("Account deleted successfully.");
      logout();
    } catch (err) {
      console.error("Delete account failed:", err);
      const msg = err?.response?.data?.detail || "Failed to delete account.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handlePromotionalConsentToggle = async (e) => {
    try {
      const nextValue = e.target.checked;
      await submitPromotionalConsent(nextValue);
      toast.success("Promotional preference updated.");
    } catch (err) {
      toast.error("Failed to update promotional preference.");
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <p style={{ color: "var(--muted)" }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <section className="page-header-bar">
        <div>
          <h1 style={{ margin: 0 }}>My Profile</h1>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Manage your photo, account details, and privacy preferences.
          </p>
        </div>
      </section>

      {error ? (
        <StatusBanner variant="error" title="Update issue" message={error} />
      ) : null}

      {success ? (
        <StatusBanner variant="success" title="Saved" message={success} />
      ) : null}

      <div className="grid grid-3">
        <MetricCard
          title="Account"
          value={user.email}
          description="Primary email linked to your Dundaa account."
        />
        <MetricCard
          title="Role"
          value={user.role || "user"}
          description="Your current platform access level."
        />
        <MetricCard
          title="Status"
          value={user.account_status || "active"}
          description="Current lifecycle state of your account."
        />
      </div>

      <PageSection
        title="Privacy Preferences"
        subtitle="Control the promotional updates Dundaa may send you."
      >
        <label style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={Boolean(user.promotional_updates_consent)}
            onChange={handlePromotionalConsentToggle}
          />
          <span>Allow Dundaa promotional updates</span>
        </label>
      </PageSection>

      <PageSection
        title="Profile Photo"
        subtitle="Upload a clear image to personalize your Dundaa presence."
      >
        <form onSubmit={handleSaveProfile}>
          <div className="profile-photo-section">
            <div className="profile-avatar-frame">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Profile preview"
                  className="profile-avatar-image"
                  ref={imageRef}
                />
              ) : currentProfileImage ? (
                <img
                  src={currentProfileImage}
                  alt="Profile"
                  className="profile-avatar-image"
                />
              ) : (
                <div className="profile-avatar-placeholder">No Photo</div>
              )}
            </div>

            <div className="profile-photo-actions">
              <CtaGroup>
                <button
                  type="button"
                  className="btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Photo
                </button>

                {user.profile_picture ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDeletePhoto}
                    disabled={deletingPhoto}
                  >
                    {deletingPhoto ? "Removing..." : "Remove Photo"}
                  </button>
                ) : null}
              </CtaGroup>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="upload-input"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {previewImage ? (
            <div className="profile-crop-card">
              <div>
                <h3 style={{ marginTop: 0 }}>Adjust Crop</h3>
                <p style={{ color: "var(--muted)", marginBottom: 0 }}>
                  Drag the image and adjust zoom to position your profile photo.
                </p>
              </div>

              <div
                className="profile-crop-stage"
                onPointerDown={handlePointerDown}
                style={{ overflow: "hidden", position: "relative", touchAction: "none" }}
              >
                <img
                  ref={imageRef}
                  src={previewImage}
                  alt="Crop preview"
                  style={{
                    transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                    transformOrigin: "top left",
                    userSelect: "none",
                    pointerEvents: "none"
                  }}
                />
              </div>

              <div className="grid" style={{ gap: 8 }}>
                <label style={{ fontWeight: 700 }}>Zoom</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.01"
                  value={cropScale}
                  onChange={(e) => setCropScale(Number(e.target.value))}
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-2" style={{ gap: 16, marginTop: 24 }}>
            <input
              className="input"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />

            <input
              className="input"
              placeholder="Contact info"
              value={form.contact_info}
              onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
            />

            <select
              className="select"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Select gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>

            <input
              className="input"
              placeholder="Location name"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />

            <input
              className="input"
              placeholder="Latitude"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />

            <input
              className="input"
              placeholder="Longitude"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
          </div>

          <CtaGroup style={{ marginTop: 16 }}>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleDeleteAccount}
            >
              Delete Account
            </button>
          </CtaGroup>
        </form>
      </PageSection>
    </div>
  );
}