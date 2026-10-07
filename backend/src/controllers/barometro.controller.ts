import { Request, Response } from "express";

import { getBarometroData } from "../services/barometro.service";

export async function getBarometro(
  _req: Request,
  res: Response
) {
  try {
    const data = await getBarometroData();

    res.json({ data });
  } catch (error) {
    console.error(
      "Erro ao buscar dados do Barômetro:",
      error
    );

    res.status(500).json({
      message: "Erro ao buscar dados do Barômetro.",
    });
  }
}
