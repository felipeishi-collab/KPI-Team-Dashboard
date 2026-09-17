import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import kpiRoutes from "./routes/kpi.routes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "KPI Team Dashboard API",
    status: "online",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/kpis", kpiRoutes);

export default app;