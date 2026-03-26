import React from "react";

export default function Leaderboard({ items }) {
  if (!items?.length) {
    return (
      <p style={{ color: "var(--muted)", margin: 0 }}>
        No contestants yet.
      </p>
    );
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      {items.map((item) => (
        <div key={item.contestant_id} className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center"
            }}
          >
            <div>
              <strong>#{item.rank} {item.display_name}</strong>
            </div>

            <div style={{ color: "var(--muted)" }}>
              {item.total_votes} votes
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}