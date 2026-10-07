import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em dev o frontend chama /api no mesmo host (:5173) e o Vite repassa
// para o backend; em produção o próprio backend serve o frontend buildado.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
