import React from "react";

/*
RatingStars
-----------
Reusable star selector component.

Props:
value: number (1–5)
onChange: function(newValue)
*/

export default function RatingStars({ value = 0, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 22,
            cursor: "pointer",
            color: star <= value ? "#d4af37" : "#bbb"
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}