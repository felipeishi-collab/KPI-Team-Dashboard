import { Request, Response } from "express";

import { authenticateGoogle } from "../services/auth.service";

export async function googleAuth(
  req: Request,
  res: Response
) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Credential do Google não informado.",
      });
    }

    const user = await authenticateGoogle(credential);

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso.",
      user,
    });
  } catch (error) {
    console.error("Erro na autenticação Google:", error);

    return res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha na autenticação.",
    });
  }
}