import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LandingPage from "./components/LandingPage";
import "./index.css";

// Two surfaces, no router dependency: the marketing page is the front door and
// /app is the live HUD. The body class swaps the dark locked-viewport shell for a
// white scrollable page.
const isApp = window.location.pathname.startsWith("/app");
document.body.className = isApp
  ? "bg-lens-bg text-white overflow-hidden select-none"
  : "landing-mode";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isApp ? <App /> : <LandingPage />}
  </React.StrictMode>
);
