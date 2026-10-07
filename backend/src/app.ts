import express from "express";
import cors from "cors";
import compression from "compression";
import fs from "fs";
import path from "path";

import { requireAuth } from "./middleware/auth.middleware";

import authRoutes from "./routes/auth.routes";
import kpiRoutes from "./routes/kpi.routes";
import updatesRoutes from "./routes/updates.routes";
import driversRoutes from "./routes/drivers.routes";
import sprRoutes from "./routes/spr.routes";
import barometroRoutes from "./routes/barometro.routes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// gzip: a resposta do Barômetro (série completa de todos os hubs) é grande
app.use(compression());

app.use(express.json());

app.get("/api/ping", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/kpis", requireAuth, kpiRoutes);
app.use("/api/updates", requireAuth, updatesRoutes);
app.use("/api/drivers", requireAuth, driversRoutes);
app.use("/api/spr", requireAuth, sprRoutes);
app.use("/api/barometro", requireAuth, barometroRoutes);

// Em produção o próprio Express serve o frontend buildado (um processo só).
// Em dev o Vite serve o frontend e faz proxy de /api para cá.
const frontendDist = path.resolve(
  __dirname,
  "../../frontend/dist"
);

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // fallback da SPA (react-router)
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;