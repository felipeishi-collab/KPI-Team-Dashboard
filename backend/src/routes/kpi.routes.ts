import { Router } from "express";
import {
    getAtNoPiso,
    getStations,
}   from "../controllers/kpi.controller";

const router = Router();

router.get(
    "/at-no-piso",
    getAtNoPiso
);
router.get(
    "/stations",
    getStations
);
export default router;