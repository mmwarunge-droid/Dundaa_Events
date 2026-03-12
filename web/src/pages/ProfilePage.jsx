import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/*
ProfilePage
-----------
Two-mode profile UI.

MODE 1: VIEW
Shows:
- profile picture
- username
- gender
- organizer contact info

Button:
Edit your profile

MODE 2: EDIT
Allows editing:
- username
- profile photo (with drag + zoom crop)
- organizer contact info

Save button persists changes then returns to VIEW mode.

Latitude / longitude remain backend-only.
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();

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
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setGender(user.gender || "");
      setContactInfo(user.contact_info || "");
    }
  }, [user]);

  const profileImage = previewUrl || resolveImage(user?.profile_picture);

  /* ---------- IMAGE SELECTION ---------- */

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

  /* ---------- DRAG HANDLING ---------- */

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

  /* ---------- CROP IMAGE ---------- */

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

  /* ---------- SAVE PROFILE ---------- */

  const saveProfile = async () => {
    setSaving(true);
    setError("");

    try {
      let newPhotoPath = user?.profile_picture;

      // If user selected a new photo, crop it and upload first.
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

      // Save editable profile fields.
      const profileRes = await api.put("/profile", {
        username,
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

  /* ---------- VIEW MODE ---------- */

  if (!editMode) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 30, maxWidth: 760, margin: "0 auto" }}>
          <h2>Your Profile</h2>

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

              <p style={{ color: "var(--muted)", marginTop: 0 }}>
                <strong>Organizer contact:</strong>{" "}
                {user?.contact_info || "No contact details added yet"}
              </p>

              <button
                className="btn"
                onClick={() => setEditMode(true)}
              >
                Edit your profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- EDIT MODE ---------- */

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

          <textarea
            className="textarea"
            placeholder="Organizer contact details e.g. Call/WhatsApp: +2547XXXXXXXX"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            maxLength={280}
          />

          <p style={{ color: "var(--muted)" }}>
            Gender: {gender}
          </p>

          <div style={{ display: "flex", gap: 12 }}>
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