import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from "./App";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set. Run `npm run backend` in the repo root to create ../.env.local.");
}

/**
 * Local dev: VITE_CONVEX_URL points at 127.0.0.1, which on a phone means the phone.
 * When the page was opened via the Mac's LAN address, talk to the backend on that host.
 * Production URLs (https://<name>.convex.cloud) are never touched.
 */
function resolveConvexUrl(url: string): string {
  const parsed = new URL(url);
  const loopback = ["127.0.0.1", "localhost", "[::1]"];
  const pageHost = window.location.hostname;
  if (import.meta.env.DEV && loopback.includes(parsed.hostname) && !loopback.includes(pageHost)) {
    parsed.hostname = pageHost;
  }
  return parsed.toString().replace(/\/$/, "");
}

const convex = new ConvexReactClient(resolveConvexUrl(convexUrl));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
);
