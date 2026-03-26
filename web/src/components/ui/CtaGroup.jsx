import React from "react";

export default function CtaGroup({ children, style = {} }) {
  return (
    <div className="cta-group" style={style}>
      {children}
    </div>
  );
}