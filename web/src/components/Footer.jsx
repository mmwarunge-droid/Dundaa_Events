import React from "react";
import { Link } from "react-router-dom";

const CONTACT = {
  phoneDisplay: "+254 713 722 822",
  phoneHref: "tel:+254713722822",
  email: "hello@dundaa.com",
  emailHref: "mailto:hello@dundaa.com",
  socials: [
    {
      name: "Facebook",
      href: "https://www.facebook.com/share/1CdMZ8vw1U/"
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/dundaa/?viewAsMember=true"
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@dundaa_kenya?_r=1&_t=ZS-950SqZzwaiu"
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/dundaa_kenya/"
    }
  ]
};

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 48,
        background: "#111111",
        color: "#ffffff",
        borderTop: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <div className="container" style={{ paddingTop: 36, paddingBottom: 28 }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "1.2fr 1fr 1fr",
            gap: 24
          }}
        >
          <div className="card" style={{ padding: 22, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", boxShadow: "none" }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: "#ffffff" }}>
              Dundaa
            </h3>

            <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
              Dundaa helps people discover events, support fundraisers, and move
              from interest to checkout through a fast, trusted, mobile-friendly
              experience.
            </p>
          </div>

          <div className="card" style={{ padding: 22, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", boxShadow: "none" }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: "#ffffff" }}>
              Contact Us
            </h3>

            <div className="grid" style={{ gap: 10 }}>
              <a
                href={CONTACT.phoneHref}
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                {CONTACT.phoneDisplay}
              </a>

              <a
                href={CONTACT.emailHref}
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                {CONTACT.email}
              </a>
            </div>
          </div>

          <div className="card" style={{ padding: 22, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", boxShadow: "none" }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: "#ffffff" }}>
              Follow Dundaa
            </h3>

            <div className="grid" style={{ gap: 10 }}>
              {CONTACT.socials.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center"
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.65)" }}>
            © {new Date().getFullYear()} Dundaa. All rights reserved.
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link to="/" style={{ color: "rgba(255,255,255,0.82)" }}>
              Home
            </Link>
            <Link to="/events" style={{ color: "rgba(255,255,255,0.82)" }}>
              Events
            </Link>
            <Link to="/campaigns" style={{ color: "rgba(255,255,255,0.82)" }}>
              Fundraisers
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}