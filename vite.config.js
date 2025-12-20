import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/moodle-api": {
        target: "http://localhost/fundneon", // cambia "moodle" por el nombre de tu carpeta de Moodle si es diferente
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/moodle-api/, ""),
      },
    },
  },
});
