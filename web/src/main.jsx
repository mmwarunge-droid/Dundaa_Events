import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles/theme.css";

/*
main.jsx
--------
Application entry point.

AuthProvider wraps the entire app so:
- protected routes
- welcome flow
- notification consent flow
- profile bootstrap
all have one shared source of truth.
*/

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);