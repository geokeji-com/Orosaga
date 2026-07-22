import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiOrigin = `http://127.0.0.1:${process.env.E2E_API_PORT ?? "3000"}`;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": apiOrigin,
      "/auth": apiOrigin,
      "/healthz": apiOrigin,
      "/readyz": apiOrigin,
    },
  },
});
