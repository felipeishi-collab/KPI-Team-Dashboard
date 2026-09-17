import { Router } from "express";
import {
    getAtNoPiso,
}   from "../controllers/kpi.controller";

const router = Router();

router.get(
    "/at-no-piso",
    getAtNoPiso
);
export default router;