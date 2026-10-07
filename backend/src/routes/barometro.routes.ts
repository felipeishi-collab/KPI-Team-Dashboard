import { Router } from "express";
import { getBarometro } from "../controllers/barometro.controller";

const router = Router();

router.get("/", getBarometro);

export default router;
