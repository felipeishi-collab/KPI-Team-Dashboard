import { Router } from "express";
import { getDrivers } from "../controllers/drivers.controller";

const router = Router();

router.get("/", getDrivers);

export default router;
