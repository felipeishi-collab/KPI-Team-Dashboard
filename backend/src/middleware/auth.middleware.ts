import { NextFunction, Request, Response } from "express";

import {
  SessionUser,
  verifySession,
} from "../services/session.service";

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

// Exige o token de sessão emitido em /api/auth/google, enviado no header
// `x-session-token` (mesmo header do painel Live).
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.header("x-session-token") ?? "";
  const user = verifySession(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Sessão inválida ou expirada.",
    });
  }

  req.user = user;
  next();
}
