import React from "react";

const VARIANT_CONFIG = {
  error: {
    titleColor: "var(--danger)",
    className: "status-banner status-banner-error"
  },
  success: {
    titleColor: "var(--success)",
    className: "status-banner status-banner-success"
  },
  warning: {
    titleColor: "var(--primary)",
    className: "status-banner status-banner-warning"
  },
  info: {
    titleColor: "var(--text)",
    className: "status-banner status-banner-info"
  }
};

export default function StatusBanner({
  variant = "info",
  title,
  message
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;

  return (
    <div className={config.className}>
      {title ? (
        <strong style={{ color: config.titleColor }}>{title}</strong>
      ) : null}

      {message ? (
        <p style={{ color: "var(--muted)", margin: title ? "6px 0 0" : 0 }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}