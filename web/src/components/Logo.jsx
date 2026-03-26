import React from "react";
import logo from "../assets/Dundaa_Logo.png";

/*
Logo
----
Reusable Dundaa logo component.

Notes:
- Sizing is controlled by CSS class instead of inline style.
- This makes it easy to enlarge only the navbar logo without disturbing
  other components or future logo placements.
- The silver glow effect is also handled in CSS for easier tuning.
*/

export default function Logo() {
  return (
    <img
      src={logo}
      alt="Dundaa"
      className="nav-logo"
    />
  );
}