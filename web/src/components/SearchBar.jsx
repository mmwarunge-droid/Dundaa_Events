import React from "react";

export default function SearchBar({
  query,
  setQuery,
  placeholder = "Search events, creators, places, or causes..."
}) {
  return (
    <div
      className="card"
      style={{
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 18,
        boxShadow: "none"
      }}
    >
      <span style={{ fontSize: 18 }}>🔎</span>

      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 0,
          border: "none",
          boxShadow: "none",
          padding: "10px 6px",
          background: "transparent"
        }}
      />
    </div>
  );
}