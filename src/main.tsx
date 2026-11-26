import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import "./index.css";
import { router } from "./router";
import { migrateLegacyHistory } from "./storage/history";

let migrationError: string | null = null;
try {
  migrateLegacyHistory();
} catch (error) {
  console.error("Unable to migrate local practice history:", error);
  migrationError = error instanceof Error ? error.message : String(error);
}

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    {migrationError === null ? <RouterProvider router={router} /> : (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <p role="alert">Unable to migrate local practice history: {migrationError}. Check browser storage and reload.</p>
      </main>
    )}
  </StrictMode>
);