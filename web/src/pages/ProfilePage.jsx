import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
ProfilePage
-----------
Expanded profile management page.

This version adds:
- editable gender
- notification preference visibility
- temporary account deactivation
- permanent account deletion

Developer note:
Deletion currently calls a hard-delete backend route.
In production, you may later add:
- password confirmation
- 2-step confirmation
- soft-delete/anonymization policy
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  const [editMode, setEditMode] = useState(false);

  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [zoom, setZoom] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setGender(user.gender || "");
      setContactInfo(user.contact_info || "");
    }
  }, [user]);

  const profileImage = previewUrl || resolveImage(user?.profile_picture);

  const choosePhoto = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
      setError("Image must be JPG, PNG or WEBP.");
      return;
    }

    setError("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setZoom(1);
    setDragOffset({ x: 0, y: 0 });
  };

  const startDrag = (e) => {
    e.preventDefault();
    setDragging(true);

    setDragStart({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const onDrag = (e) => {
    if (!dragging) return;

    setDragOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const endDrag = () => setDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", endDrag);

    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", endDrag);
    };
  });

  const buildCroppedImage = async () => {
    const img = imageRef.current;
    const canvas = document.createElement("canvas");

    const size = 600;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    const scaled = size * zoom;

    const dx = dragOffset.x - (scaled - size) / 2;
    const dy = dragOffset.y - (scaled - size) / 2;

    ctx.drawImage(img, dx, dy, scaled, scaled);

    return new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");

    try {
      let newPhotoPath = user?.profile_picture;

      if (selectedFile) {
        const blob = await buildCroppedImage();

        const uploadFile = new File([blob], "profile.jpg", {
          type: "image/jpeg"
        });

        const formData = new FormData();
        formData.append("photo", uploadFile);

        const photoRes = await api.post("/profile/photo", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        newPhotoPath = photoRes.data.profile_picture;
      }

      const profileRes = await api.put("/profile", {
        username,
        gender: gender || null,
        contact_info: contactInfo
      });

      setUser({
        ...profileRes.data,
        profile_picture: newPhotoPath
      });

      setSelectedFile(null);
      setPreviewUrl("");
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      "Deactivate your account? Your data will be kept, but your account will become inactive until you reactivate it."
    );

    if (!confirmed) return;

    setBusyAction("deactivate");
    setError("");

    try {
      await api.post("/profile/deactivate");
      logout();
      navigate("/login");
    } catch (err) {
      console.error("Deactivation failed:", err);
      setError(
        err?.response?.data?.detail ||
          "Failed to deactivate account."
      );
    } finally {
      setBusyAction("");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently? This will remove your account and related data. This cannot be undone."
    );

    if (!confirmed) return;

    setBusyAction("delete");
    setError("");

    try {
      await api.delete("/profile/account");
      logout();
      navigate("/signup");
    } catch (err) {
      console.error("Deletion failed:", err);
      setError(
        err?.response?.data?.detail ||
          "Failed to delete account."
      );
    } finally {
      setBusyAction("");
    }
  };

  if (!editMode) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 30, maxWidth: 820, margin: "0 auto" }}>
          <h2>Your Profile</h2>

          {error && <p style={{ color: "tomato" }}>{error}</p>}

          <div style={{ display: "flex", gap: 30, alignItems: "center", flexWrap: "wrap" }}>
            <div className="profile-avatar-frame">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="profile-avatar-image"
                />
              ) : (
                <div>No photo</div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <h3>{user?.username}</h3>

              <p style={{ color: "var(--muted)", marginBottom: 8 }}>
                Gender: {user?.gender || "Not specified"}
              </p>

              <p style={{ color: "var(--muted)", marginBottom: 8 }}>
                Notifications:{" "}
                <strong>
                  {user?.notification_consent === null
                    ? "Not decided"
                    : user?.notification_consent
                    ? "Consented"
                    : "Declined"}
                </strong>
              </p>

              <p style={{ color: "var(--muted)", marginTop: 0 }}>
                <strong>Organizer contact:</strong>{" "}
                {user?.contact_info || "No contact details added yet"}
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                <button
                  className="btn"
                  onClick={() => setEditMode(true)}
                >
                  Edit your profile
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleDeactivate}
                  disabled={busyAction === "deactivate"}
                >
                  {busyAction === "deactivate"
                    ? "Deactivating..."
                    : "Deactivate account"}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleDeleteAccount}
                  disabled={busyAction === "delete"}
                >
                  {busyAction === "delete"
                    ? "Deleting..."
                    : "Delete account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ padding: 30, maxWidth: 820, margin: "0 auto" }}>
        <h2>Edit your profile</h2>

        {error && <p style={{ color: "tomato" }}>{error}</p>}

        <div className="grid" style={{ gap: 20 }}>
          <div className="profile-avatar-frame">
            {profileImage && (
              <img
                src={profileImage}
                alt="Profile"
                className="profile-avatar-image"
              />
            )}
          </div>

          <button className="btn" onClick={choosePhoto}>
            Choose Photo
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={onFileSelected}
          />

          {previewUrl && (
            <>
              <div className="profile-crop-window">
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Crop"
                  onMouseDown={startDrag}
                  style={{
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoom})`,
                    cursor: "grab"
                  }}
                />
              </div>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </>
          )}

          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <select
            className="select"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="other">Other</option>
          </select>

          <textarea
            className="textarea"
            placeholder="Organizer contact details e.g. Call/WhatsApp: +2547XXXXXXXX"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            maxLength={280}
          />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save profile details"}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setEditMode(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}