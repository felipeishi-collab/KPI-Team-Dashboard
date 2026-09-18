import { Router } from "express";
import {
    getRecentUpdates,
}   from "../controllers/updates.controller";

const router = Router();

router.get(
    "/",
    getRecentUpdates
);
export default router;
