import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { discoveryApiPlugin } from "./server/plugin";

export default defineConfig({
  plugins: [react(), discoveryApiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
