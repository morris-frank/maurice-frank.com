import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./drift.css";
import { DriftApp } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing from index.html");
createRoot(root).render(
  <StrictMode>
    <DriftApp />
  </StrictMode>,
);
