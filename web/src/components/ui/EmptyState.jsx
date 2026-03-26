import React from "react";

export default function EmptyState({
  title = "Nothing here yet",
  message = "There is no data to display right now.",
  action = null,
  icon = "📭"
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>

      <h3 style={{ margin: 0 }}>{title}</h3>

      <p style={{ margin: 0, color: "var(--muted)", maxWidth: 520 }}>
        {message}
      </p>

      {action ? <div>{action}</div> : null}
    </div>
  );
}