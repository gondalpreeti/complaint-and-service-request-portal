import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./pages/Dashboard.jsx";
import "./index.css";

// This standalone entry point exists so the dashboard module can be run and
// tested on its own with `npm run dev`. When this module is merged into the
// real app, swap this file out for your app's router/entry point and just
// mount <Dashboard /> on whatever route you choose.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>
);
