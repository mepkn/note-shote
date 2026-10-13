import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// The backend lives in ../backend/convex and is shared with the Expo app. Its imports
// of `convex` and `react` must resolve to this app's copies, not ../node_modules.
export default defineConfig(({ mode }) => {
  // Reuse backend/.env.local (local dev backend) unless VITE_CONVEX_URL is set.
  const parent = loadEnv(mode, path.resolve(import.meta.dirname, "../backend"), "EXPO_PUBLIC_");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "@convex": path.resolve(import.meta.dirname, "../backend/convex"),
      },
      dedupe: ["convex", "react", "react-dom"],
    },
    define: {
      "import.meta.env.VITE_CONVEX_URL": JSON.stringify(
        process.env.VITE_CONVEX_URL ?? parent.EXPO_PUBLIC_CONVEX_URL ?? "",
      ),
    },
    server: { port: 5173 },
  };
});
