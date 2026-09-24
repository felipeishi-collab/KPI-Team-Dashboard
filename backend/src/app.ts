import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import kpiRoutes from "./routes/kpi.routes";
import updatesRoutes from "./routes/updates.routes";
import driversRoutes from "./routes/drivers.routes";

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
app.use("/api/updates", updatesRoutes);
app.use("/api/drivers", driversRoutes);

export default app;