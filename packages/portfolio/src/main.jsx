import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./app.css";
import "@gavinmcfarland/canvas/styles.css";
import "@gavinmcfarland/canvas/enamel.css"; // Enamel skin — matches the page chrome
import App from "./App.jsx";
import { NavOriginProvider } from "./contexts/NavOriginContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      {/* Inside the router (it watches the location) and outside App, so the
          origin a Back link reads survives App's own re-renders. */}
      <NavOriginProvider>
        <App />
      </NavOriginProvider>
    </BrowserRouter>
  </StrictMode>,
);
