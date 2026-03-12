export default function RatingStars({ value, onChange }) {
  // Simple clickable star selector for 1-5 rating input.
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="btn btn-secondary"
          style={{ color: n <= value ? "#d4af37" : "#f3f3f3" }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
