import React from "react";

export default function PageSection({
  title,
  subtitle,
  actions = null,
  children,
  card = true,
  style = {}
}) {
  const content = (
    <>
      {(title || subtitle || actions) && (
        <div
          className="section-head"
          style={{ marginBottom: 18 }}
        >
          <div>
            {title ? <h2 style={{ margin: 0 }}>{title}</h2> : null}
            {subtitle ? (
              <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>

          {actions ? <div>{actions}</div> : null}
        </div>
      )}

      {children}
    </>
  );

  if (!card) {
    return <section style={style}>{content}</section>;
  }

  return (
    <section className="card page-section" style={style}>
      {content}
    </section>
  );
}