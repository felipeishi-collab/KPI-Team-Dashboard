import { Router } from "express";
import { getSpr } from "../controllers/spr.controller";

const router = Router();

router.get("/", getSpr);

export default router;
