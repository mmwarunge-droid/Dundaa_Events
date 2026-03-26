import React from "react";

export default function MetricCard({
  title,
  value,
  description,
  action = null
}) {
  return (
    <div className="trust-card metric-card">
      <h3>{title}</h3>

      <div className="metric-card-value">
        {value}
      </div>

      {description ? (
        <p>{description}</p>
      ) : null}

      {action ? (
        <div style={{ marginTop: 14 }}>
          {action}
        </div>
      ) : null}
    </div>
  );
}