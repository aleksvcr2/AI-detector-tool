import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the built site works from any subpath,
  // including https://<user>.github.io/<repo>/.
  base: "./",
});
